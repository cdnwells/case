import assert from "node:assert/strict"
import test from "node:test"
import { handleRequest } from "./index.js"

const env = { OPENAI_API_KEY: "openai-key", CASE_REALTIME_TOKEN: "app-token" }
const request = (body, token = "app-token") => new Request("https://broker.test/session", {
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
