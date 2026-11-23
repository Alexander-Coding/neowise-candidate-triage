import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { createTriageServer } from "../app.mjs";

const server = createTriageServer();
let endpoint;

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  endpoint = `http://127.0.0.1:${server.address().port}/api/triage`;
});

after(() => new Promise((resolve) => server.close(resolve)));

/** Send the raw body so malformed JSON can exercise the actual HTTP endpoint. */
async function post(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return { status: response.status, body: await response.json() };
}

for (const body of [
  "",
  "{",
  "null",
  "{}",
  '{"text":3}',
  '{"text":""}',
  '{"text":"  "}',
]) {
  test(`rejects invalid input ${JSON.stringify(body)}`, async () => {
    assert.deepEqual(await post(body), {
      status: 400,
      body: { status: "invalid_input" },
    });
  });
}

for (const marker of [
  "[error]",
  "[bad-json]",
  "[bad-topic]",
  "[empty-draft]",
  "[timeout]",
]) {
  test(`routes ${marker} to manual review`, async () => {
    const result = await post(JSON.stringify({ text: marker }));
    assert.deepEqual(result, {
      status: 200,
      body: { status: "manual_review", topic: null, draft: null },
    });
  });
}

for (const [text, topic] of [
  ["Где доставка?", "delivery"],
  ["Сколько стоит? Цена?", "pricing"],
  ["Здравствуйте", "other"],
]) {
  test(`returns a draft for ${topic}`, async () => {
    const result = await post(JSON.stringify({ text }));
    assert.equal(result.status, 200);
    assert.equal(result.body.status, "ready");
    assert.equal(result.body.topic, topic);
    assert.ok(
      typeof result.body.draft === "string" && result.body.draft.trim(),
    );
  });
}
