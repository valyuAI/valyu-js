# Changelog

## 2.12.2

- DeepResearch: new `tools.ultrasearch` option on `deepresearch.create()`. Pass `true` for the default spend cap, or `{ max_usd: number }` for your own cap in US dollars (above 0). `false` or omitted leaves it off. Ultrasearch works in `heavy` and `max` modes only, and the API refuses it on a task with a historical date bound. The SDK rejects a `max_usd` that is not a finite number above 0. Its charges appear as ordinary lines in `cost_breakdown.tools` and `cost_breakdown.datasets`. The response `tools` field can echo `ultrasearch`. New exported `UltrasearchConfig` type.
- DeepResearch: new response fields in the types: `structured_report`, `sources[].locations`, `ignored_fields` and `error_message`. The image type also accepts `attachment`. New helpers `effectiveMode()`, `effectiveOutputFormats()` and `effectiveCostDetail()`.
- Response types no longer expose internal fields. `DeliverableResult.s3_key`, `DeepResearchSource.org_id`, `doc_id` and `source_id`, and `DeepResearchBatch.organisation_id`, `api_key_id` and `credit_id` are removed. The SDK also drops these keys if a DeepResearch response still carries them.
- DeepResearch: `batch.create()` accepts an optional `tasks` array to create a batch with its tasks.
- **Behavior change:** `deepresearch.create()` now sends `mode: "standard"` when you pass no `mode` (or `model`). It sent `"fast"` before. `standard` is the API default (100 credits; `fast` is 25). To keep the old behavior, pass `mode: "fast"`.
- `search()`: new `scopePolicy` option (`"advisory"` or `"strict"`) and `SearchResponse.source_scope` receipt. New `hlsCoverage` option (`"hls"` or `"increased_coverage"`). New `excludedSources` option, an alias of `excludeSources`.
- `SearchResult` gains `crawl_date`. `ContentResultSuccess` gains `id`, `doi`, `authors`, `citation_count` and `structured_metadata`.
- DeepResearch: new `search.referenceDate` (sent as `reference_date`) for `create()` and `batch.create()`. `DeepResearchSource` gains `locations` (passage-level citations).
- New `datasources.search(query, { limit })` for semantic datasource search. `Datasource` gains `required_plan`, `access_modes`, `geography`, `capabilities` and `data_source`. `datasources.list()` returns `total_count`.
- The `"lite"` DeepResearch mode stays in the `DeepResearchMode` type but is marked `@deprecated`. Use `"standard"`.
- The `model` option of `deepresearch.create()` and `batch.create()` is marked `@deprecated`. Use `mode`. The SDK sends its value as `mode`.
- `category` is marked deprecated (use `instructions`). Docs: corrected `maxPrice`, `maxNumResults` and `searchType` descriptions and the DeepResearch method table.

## 2.12.1

- Edit records from `deepresearch.edit()`, `getEdit()`, `listEdits()` and `waitForEdit()`, the `active_edit` on status responses, and `listVersions()` entries now contain only their documented fields. `progress` carries `step`. `DeepResearchEditRecord` types `instruction`, `progress`, `citations` and `mode`; `DeepResearchVersion` types `restored_from`.

## 2.12.0

- DeepResearch report editing. Make small, targeted edits to a finished DeepResearch report or deliverable with a plain-language instruction. Untouched text stays exactly as it was, citations stay consistent, and every edit creates a new version you can restore.
- New `deepresearch.edit(taskId, { instruction, target, focus, baseVersion, citations, waitSeconds, idempotencyKey })`. The SDK sends only the options you set; `idempotencyKey` goes in the `Idempotency-Key` header. With `waitSeconds` (0 to 20) a quick edit returns its finished record; otherwise `status` is `"running"`.
- New `deepresearch.getEdit()`, `listEdits()` and `waitForEdit(taskId, editId, { pollInterval, maxWaitTime })`. `waitForEdit()` returns the edit once it is `applied`, `declined` or `failed`, follows `retry_after_seconds`, and retries network errors, 429 and 5xx (default limit 10 minutes).
- New `deepresearch.listVersions()` and `restoreVersion(taskId, version)`. `status(taskId, { version })` reads one version of the report.
- Failed edit, versions and restore requests return `{ success: false, error, code, httpStatus }`, plus `candidates` for `focus.ambiguous`, `active_edit_id` for `edit.in_progress` and `retry_after_seconds` for `edit.busy`.
- Status responses gain optional `editable`, `version`, `version_count`, `revised_at`, `active_edit` and `is_latest`.
- New exported types: `DeepResearchEditOptions`, `DeepResearchEditTarget`, `DeepResearchEditFocus`, `DeepResearchEditRecord`, `DeepResearchEditResponse`, `DeepResearchEditErrorResponse`, `DeepResearchEditDecline`, `DeepResearchEditFailure`, `DeepResearchFocusCandidate`, `DeepResearchVersion`, `DeepResearchVersionListResponse`, `DeepResearchRestoreVersionResponse`, `DeepResearchStatusOptions`, `WaitForEditOptions` and related code types.

## 2.11.9

- DeepResearch deliverables accept two new types: `"html"` and `"json"`.
- New optional `schema` field on a `json` deliverable: a JSON Schema (draft 2020-12 by default, draft-07 with a `$schema` header) that the produced file must validate against. The SDK sends it unchanged. The API ignores it on other types, and returns 400 `DELIVERABLE_SCHEMA_INVALID` for an invalid schema. Without a schema, the file has the default shape `{title, as_of, summary, key_findings, tables, sources}`.

## 2.11.8

- Deprecation: the Answer API stops working on 2026-12-17, when the endpoint returns HTTP 410. `answer()` still works as before, but now logs a one-time `console.warn` per process. The `Answer*` types are marked `@deprecated`. Use DeepResearch with `mode: "instant"`, or `search()` plus your own LLM. Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer

## 2.11.7

- DeepResearch status responses gain optional fields: `cost_credits`, `cost_breakdown_credits`, `cost_detail` (line-by-line tool and dataset costs), `pending_deliverables`, `research_output_formats` and `error_code`. `research_mode` is also typed on the status response.
- `DeepResearchCostBreakdown` gains optional `datasets`, `x_search`, `browse`, `ocr`, `urls` and `other_tools`, and accepts other numeric keys. New exported `DeepResearchCostDetail` types.
- `ImageMetadata` gains optional `chart_kind` (including `"stacked"` and `"slope"`). `title` and `created_at` are now optional on images, and `created_at` is optional on deliverables.
- Response enums accept unknown strings, so a new value from the API does not break your types: `status`, `mode`, `output_formats`, `image_type`, `chart_type`, and deliverable `type` and `status` (which now includes `"pending"`). New exported helper types `OpenString` and `Known*` types for the closed lists.
- New `skills` option on `deepresearch.create()`, for example `["forecasting"]`. The SDK sends it only when you set it.
- `mode: "lite"` (the old name of `standard`) is sent as `"standard"`, as the Python SDK does.
- `batch.list()` accepts a `{ batches: [...] }` body as well as a list.
- `DeepResearchCostBreakdown` types the v2 form: `datasets` as a list of lines, plus `base_usd`, `tools`, `total_usd`, `base_credits` and `total_credits`. `DeepResearchOutputFormat` includes `structured_report`.

## 2.11.6

- Successful `contents()` results gain `final_url`: the page the request ended on, when the URL redirected to a different page (for example a closed job posting that redirects to the careers page). It is not set when there was no redirect. A change of scheme, host case, `www.`, trailing slash or fragment is not a different page.

## 2.11.5

- DeepResearch: new `coverArt` option on `deepresearch.create()`, a cover picture for one report. It replaces the brand kit's cover art on the report PDF and PDF deliverable, and works without a kit. Pass `{ kind?, data | url, filename?, mediaType? }` (`kind` is `"image"` or `"pattern"`). PNG or JPEG, at most 2 MB, 800 px or more on the short side. A picture that cannot be used does not fail the task; the response `warnings` include `cover_art_not_used`. New exported `CoverArt` type.
- DeepResearch: `brandCollectionId` accepts `"none"` to opt a task out of your organization's default kit.

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
