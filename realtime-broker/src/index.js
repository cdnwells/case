const DEFAULT_MODEL = "gpt-live-1"
const DEFAULT_VOICE = "marin"
const MAX_SDP_BYTES = 256 * 1024
const MAX_HISTORY_BYTES = 6000
const MAX_TEXT_BYTES = 16 * 1024

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

function authorized(request, token) {
  if (!token) return false
  return request.headers.get("authorization") === `Bearer ${token}`
}

function validHistory(history) {
  return Array.isArray(history)
    && history.length <= 128
    && new TextEncoder().encode(JSON.stringify(history)).byteLength <= MAX_HISTORY_BYTES
    && history.every(item => item && ["user", "assistant"].includes(item.role)
      && typeof item.content === "string" && item.content.trim())
}

function outputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim()
  }
  return (response?.output || [])
    .filter(item => item?.type === "message" && item.role === "assistant")
    .flatMap(item => item.content || [])
    .filter(item => item?.type === "output_text" && typeof item.text === "string")
    .map(item => item.text)
    .join("")
    .trim()
}

async function createTextResponse(request, env, fetchImpl) {
  if (!env.OPENAI_API_KEY) {
    return json({ message: "AI service is not configured", retryable: false }, 503)
  }
  let body
  try { body = await request.json() } catch {
    return json({ message: "Invalid JSON", retryable: false }, 400)
  }
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const history = body?.history || []
  const size = new TextEncoder().encode(JSON.stringify({ content, history })).byteLength
  if (!content || size > MAX_TEXT_BYTES || !validHistory(history)) {
    return json({ message: "Invalid chat request", retryable: false }, 400)
  }

  let upstream
  try {
    upstream = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        ...(body.safetyIdentifier
          ? { "OpenAI-Safety-Identifier": String(body.safetyIdentifier).slice(0, 200) }
          : {}),
      },
      body: JSON.stringify({
        model: env.OPENAI_TEXT_MODEL || "gpt-5.4-mini",
        instructions: env.OPENAI_TEXT_INSTRUCTIONS || "You are Case, a concise, helpful personal AI assistant.",
        input: [...history, { role: "user", content }],
        store: false,
      }),
    })
  } catch {
    return json({ message: "AI service is temporarily unavailable", retryable: true }, 502)
  }
  if (!upstream.ok) {
    await upstream.body?.cancel().catch(() => {})
    return json({
      message: upstream.status === 429 ? "AI service is busy. Please retry shortly." : "AI response failed",
      retryable: upstream.status === 429 || upstream.status >= 500,
    }, upstream.status === 429 ? 429 : 502)
  }
  const result = await upstream.json()
  const contentOut = outputText(result)
  if (!contentOut) return json({ message: "AI returned an empty response", retryable: true }, 502)
  return json({
    message: {
      id: typeof result.id === "string" ? result.id : `assistant_${Date.now()}`,
      content: contentOut,
      role: "assistant",
      timestamp: new Date().toISOString(),
      status: "sent",
    },
  })
}

function buildSession(body, env) {
  const history = body.history || []
  return {
    model: env.OPENAI_LIVE_MODEL || DEFAULT_MODEL,
    instructions: env.OPENAI_LIVE_INSTRUCTIONS || "Be concise, helpful, and conversational.",
    input: history.map(({ role, content }) => ({
      type: "message",
      role,
      content: [{ type: role === "assistant" ? "output_text" : "input_text", text: content }],
    })),
    audio: { output: { voice: env.OPENAI_LIVE_VOICE || DEFAULT_VOICE } },
    store: false,
    client: {
      data_channel: {
        allowed_client_events: ["session.close"],
        allowed_server_events: [
          "session.started",
          "session.closed",
          "session.input_transcript.delta",
          "session.output_transcript.delta",
          "session.usage.updated",
          "error",
        ].map(type => ({ type })),
      },
    },
  }
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  const url = new URL(request.url)
  if (request.method !== "POST" || !["/session", "/chat"].includes(url.pathname)) {
    return json({ message: "Not found" }, 404)
  }
  if (!authorized(request, env.CASE_REALTIME_TOKEN)) {
    return json({ message: "Unauthorized", retryable: false }, 401)
  }
  if (url.pathname === "/chat") return createTextResponse(request, env, fetchImpl)
  if (!env.OPENAI_API_KEY) {
    return json({ message: "Voice service is not configured", retryable: false }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ message: "Invalid JSON", retryable: false }, 400)
  }
  const sdpBytes = typeof body?.sdp === "string"
    ? new TextEncoder().encode(body.sdp).byteLength
    : 0
  if (!body || typeof body.sdp !== "string" || !body.sdp.trimStart().startsWith("v=0")
    || sdpBytes > MAX_SDP_BYTES || !validHistory(body.history || [])) {
    return json({ message: "Invalid Live session request", retryable: false }, 400)
  }

  let upstream
  try {
    upstream = await fetchImpl("https://api.openai.com/v1/live/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        ...(body.safetyIdentifier
          ? { "OpenAI-Safety-Identifier": String(body.safetyIdentifier).slice(0, 200) }
          : {}),
      },
      body: JSON.stringify({
        session: buildSession(body, env),
        transport: { type: "webrtc", sdp: body.sdp.trimStart() },
      }),
    })
  } catch {
    return json({ message: "Voice service is temporarily unavailable", retryable: true }, 502)
  }

  if (!upstream.ok) {
    await upstream.body?.cancel().catch(() => {})
    return json({
      message: upstream.status === 429
        ? "Voice service is busy. Please retry shortly."
        : "Voice session creation failed",
      retryable: upstream.status === 429 || upstream.status >= 500,
    }, upstream.status === 429 ? 429 : 502)
  }

  const result = await upstream.json()
  if (typeof result?.session?.id !== "string"
    || typeof result?.transport?.sdp !== "string"
    || !result.transport.sdp.startsWith("v=0")) {
    return json({ message: "Voice service returned an invalid session", retryable: true }, 502)
  }
  return json({
    session: result.session,
    transport: { sdp: result.transport.sdp },
    model: result.session.model || env.OPENAI_LIVE_MODEL || DEFAULT_MODEL,
    voice: env.OPENAI_LIVE_VOICE || DEFAULT_VOICE,
  }, 201)
}

export default { fetch: handleRequest }
