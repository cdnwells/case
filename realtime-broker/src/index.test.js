import assert from "node:assert/strict"
import test from "node:test"
import { handleRequest } from "./index.js"

const env = { OPENAI_API_KEY: "openai-key", CASE_REALTIME_TOKEN: "app-token" }
const request = (body, token = "app-token", path = "/session") => new Request(`https://broker.test${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
})

test("rejects requests without the broker credential", async () => {
  const response = await handleRequest(request({ sdp: "v=0\r\n" }, "wrong"), env)
  assert.equal(response.status, 401)
})

test("creates an OpenAI Live WebRTC session without exposing the project key", async () => {
  let captured
  const response = await handleRequest(request({
    sdp: "v=0\r\n",
    history: [{ role: "user", content: "Hello" }],
  }), env, async (url, options) => {
    captured = { url, options }
    return new Response(JSON.stringify({
      session: { id: "live_123", model: "gpt-live-1" },
      transport: { sdp: "v=0\r\nanswer" },
    }), { status: 201, headers: { "Content-Type": "application/json" } })
  })

  assert.equal(response.status, 201)
  assert.equal(captured.url, "https://api.openai.com/v1/live/sessions")
  assert.equal(captured.options.headers.Authorization, "Bearer openai-key")
  const upstream = JSON.parse(captured.options.body)
  assert.equal(upstream.transport.type, "webrtc")
  assert.equal(upstream.session.store, false)
  assert.equal(upstream.session.input[0].content[0].text, "Hello")
  assert.equal(JSON.stringify(await response.json()).includes("openai-key"), false)
})

test("does not reflect an upstream error body", async () => {
  const response = await handleRequest(request({ sdp: "v=0\r\n" }), env,
    async () => new Response("secret upstream details", { status: 401 }))
  assert.equal(response.status, 502)
  assert.equal((await response.text()).includes("secret upstream details"), false)
})

test("creates a stateless Responses API chat reply", async () => {
  let captured
  const response = await handleRequest(request({
    content: "What did I just say?",
    history: [{ role: "user", content: "My name is Sanghyuk." }],
  }, "app-token", "/chat"), env, async (url, options) => {
    captured = { url, options }
    return new Response(JSON.stringify({
      id: "resp_123",
      output: [{ type: "message", role: "assistant", content: [
        { type: "output_text", text: "Your name is Sanghyuk." },
      ] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })
  })
  assert.equal(response.status, 200)
  assert.equal(captured.url, "https://api.openai.com/v1/responses")
  const upstream = JSON.parse(captured.options.body)
  assert.equal(upstream.store, false)
  assert.deepEqual(upstream.input.at(-1), { role: "user", content: "What did I just say?" })
  assert.equal((await response.json()).message.content, "Your name is Sanghyuk.")
})

test("chat rejects empty prompts and never reflects upstream errors", async () => {
  assert.equal((await handleRequest(request({ content: "" }, "app-token", "/chat"), env)).status, 400)
  const response = await handleRequest(request({ content: "Hello" }, "app-token", "/chat"), env,
    async () => new Response("sensitive upstream body", { status: 403 }))
  assert.equal(response.status, 502)
  assert.equal((await response.text()).includes("sensitive upstream body"), false)
})
