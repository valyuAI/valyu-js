# Changelog

## 2.11.5

- **Behavior change:** `deepresearch.create()` now sends `mode: "standard"` when you pass no `mode` (or `model`). It sent `"fast"` before. `standard` is the API default (100 credits; `fast` is 25). To keep the old behavior, pass `mode: "fast"`.
- `search()`: new `scopePolicy` option (`"advisory"` or `"strict"`) and `SearchResponse.source_scope` receipt. New `hlsCoverage` option (`"hls"` or `"increased_coverage"`). New `excludedSources` option, an alias of `excludeSources`.
- `SearchResult` gains `crawl_date`. `ContentResultSuccess` gains `id`, `doi`, `authors`, `citation_count` and `structured_metadata`.
- DeepResearch: new `search.referenceDate` (sent as `reference_date`) for `create()` and `batch.create()`. `DeepResearchSource` gains `locations` (passage-level citations).
- New `datasources.search(query, { limit })` for semantic datasource search. `Datasource` gains `required_plan`, `access_modes`, `geography`, `capabilities` and `data_source`. `datasources.list()` returns `total_count`.
- The `"lite"` DeepResearch mode is removed from the `DeepResearchMode` type. The API has no `lite` mode.
- `category` is marked deprecated (use `instructions`). Docs: corrected `maxPrice`, `maxNumResults` and `searchType` descriptions and the DeepResearch method table.

## 2.11.4

- Successful `contents()` results gain `http_status`. It is `404` when the page returned 404 but its body is a real page (`status` is `"success"` and the page is billed). It is not set for a normal page.

## 2.11.3

- New `maxAge` option for `contents()`: the oldest cached copy of a page, in seconds, that you accept. `0` forces a live crawl. Use an integer from 0 to 2592000 (30 days). Omit it for the default cache policy. The SDK sends `max_age` only when you set it. It also works with async jobs.
- Successful `contents()` results gain `cache_state` (`"hit"`, `"miss"` or `"stale"`) and `crawled_at` (ISO 8601 capture time, or `null`). New exported `CacheState` type.
- `ContentResultFailed.status` now includes `"not_found"`, the status of a page that returns 404 (`error` is `"Page not found (404)"`).

## 2.11.2

- New `warnings?: ResponseWarning[]` on `SearchResponse`, `AnswerSuccessResponse`, `AnswerStreamChunk` (metadata chunk), `DeepResearchCreateResponse` and `DeepResearchStatusResponse`. Each warning has `type`, `message` and optional `detail`; `type` is an open string, not a closed union. New exported `ResponseWarning` type. Older responses that send plain-string warnings are normalised to `{ type: "warning", message }`, and malformed entries are dropped instead of breaking the response.

## 2.11.1

- `search()`, `contents()`, `answer()`, `deepresearch.create()`, `batch.create()` and `batch.addTasks()` now automatically retry a 429 response. A 429 means the request was never accepted, so retrying it is always safe. Retries honor the server's `retry_after`/`Retry-After`, capped at 60 seconds per attempt; configure the count with `new Valyu(apiKey, baseUrl, { maxRateLimitRetries })` (default 2, `0` disables it).
- A failed `search()`, `contents()`, `answer()`, `deepresearch.create()`, `batch.create()` or `batch.addTasks()` response now carries a `rateLimit` field (`retryAfter`, `plan`, `limit`, `upgradeUrl`/`contactUrl`) when the failure was a 429, once retries are exhausted. New exported `RateLimitError` (thrown by the retry logic once exhausted) and `RateLimitDetail` type.
- `CreateBatchResponse` and `AddBatchTasksResponse` gain `message?: string`, matching the raw response data they already passed through at runtime (e.g. a DeepResearch concurrency-queue notice).
- New `includeImageLinks` option for `search()` and `contents()`. Set it to `false` to replace image markdown `![alt](url)` in result content with `[Image: alt]`; images with no alt text are removed. The SDK sends `include_image_links` only when the value is `false`. Default behavior does not change.

## 2.11.0

- DeepResearch: new `instant` mode (`mode: "instant"`) returns a short cited answer, typically in under 30 seconds. Human-in-the-loop checkpoints do not run in instant mode, and batches do not accept it (`batch.create()` types now exclude it). Create and status responses gain `research_mode`; for instant tasks, which the API reports through `research_mode` only, the SDK also sets `mode`.
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
