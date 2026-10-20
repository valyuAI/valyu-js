# Changelog

## 2.11.0

- DeepResearch: new `instant` mode (`mode: "instant"`) returns a short cited answer in seconds. Human-in-the-loop checkpoints do not run in instant mode, and batches do not accept it (`batch.create()` types now exclude it). Create and status responses gain `research_mode`; for instant tasks, which the API reports through `research_mode` only, the SDK also sets `mode`.
- Fix: `deepresearch.wait()` passed the same HITL checkpoint to `onInteraction` repeatedly, and re-sent the response, while the status still showed a checkpoint that had already been answered. Each checkpoint is now offered once (again only if sending the response failed), and the poll interval applies after responding.
- DeepResearch, batch and workflow requests now time out after 120 seconds instead of waiting indefinitely on a stalled connection. Configure it with `new Valyu(apiKey, baseUrl, { timeout })`; `0` disables it.
- `deepresearch.stream()` accepts `{ maxWaitTime }` as a third argument and stops via `onError` with "Maximum wait time exceeded" once it passes (default 2 hours, as for `wait()`). It previously had no limit.
- Fix: error responses that carry only a `message` field now surface that message instead of a generic HTTP error.

## 2.10.5

- Fix: DeepResearch `create()` and `batch.create()` now send `search.countryCode` as `search.country_code`; it was previously dropped from the request.
- Fix: DeepResearch `create()` now sends `mcpServers[].allowedTools` and `mcpServers[].toolPrefix` as `allowed_tools` and `tool_prefix`, so the API applies them; they were previously sent in camelCase and ignored.

## 2.10.4

- DeepResearch: `files[].context` limit raised from 10,000 to 50,000 characters per file, with a new 100,000-character limit on the combined context across all files in a request.

## 2.10.3

- DeepResearch: conditional status polling. `status()`, `wait()` and `stream()` send the last `ETag` as `If-None-Match` and reuse the cached response on `304 Not Modified`. Servers that send no `ETag` are polled exactly as before.
- DeepResearch: `wait()` and `stream()` follow the server's `Retry-After` hint when no `pollInterval` is given (clamped to 1-30 seconds, default 5 seconds); an explicit `pollInterval` always wins.
- DeepResearch: a `Retry-After` on a 429/503 lengthens the jittered exponential backoff.
- DeepResearch: `onProgress` and stream progress callbacks are not repeated for a poll answered 304 Not Modified.
- Fix: the `X-Valyu-SDK-Version` header reported 2.10.1 in the 2.10.2 release; it now matches `package.json`.
