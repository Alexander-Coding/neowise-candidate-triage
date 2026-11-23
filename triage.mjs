import { classify } from "./mock-ai.mjs";

const MODEL_TIMEOUT_MS = 300;
const TOPICS = new Set(["delivery", "pricing", "other"]);
const MANUAL_REVIEW = Object.freeze({
  status: "manual_review",
  topic: null,
  draft: null,
});

/** Return a usable draft only if the provider finishes on time and matches the contract. */
export async function triage(text) {
  try {
    const raw = await classify(text, {
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    const result = JSON.parse(raw);
    if (
      !TOPICS.has(result?.topic) ||
      typeof result.draft !== "string" ||
      !result.draft.trim()
    ) {
      return MANUAL_REVIEW;
    }
    return { status: "ready", topic: result.topic, draft: result.draft.trim() };
  } catch {
    return MANUAL_REVIEW;
  }
}
