import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { text as readText } from "node:stream/consumers";
import { triage } from "./triage.mjs";

const html = await readFile(new URL("./index.html", import.meta.url));

/** Finish the response with the given HTTP status and JSON payload. */
function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

/** Validate the request before passing any text to the model. */
async function handleTriage(request, response) {
  const body = await readText(request);
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return json(response, 400, { status: "invalid_input" });
  }
  if (typeof input?.text !== "string" || !input.text.trim()) {
    return json(response, 400, { status: "invalid_input" });
  }
  json(response, 200, await triage(input.text.trim()));
}

/** Create a server that the caller can bind to a local or ephemeral port. */
export function createTriageServer() {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }
    if (request.method !== "POST" || request.url !== "/api/triage") {
      return json(response, 404, { status: "not_found" });
    }
    try {
      await handleTriage(request, response);
    } catch {
      json(response, 500, { status: "server_error" });
    }
  });
}
