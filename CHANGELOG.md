# Changelog

## 2.10.4

- DeepResearch: `files[].context` limit raised from 10,000 to 50,000 characters per file, with a new 100,000-character limit on the combined context across all files in a request.

## 2.10.3

- DeepResearch: conditional status polling. `status()`, `wait()` and `stream()` send the last `ETag` as `If-None-Match` and reuse the cached response on `304 Not Modified`. Servers that send no `ETag` are polled exactly as before.
- DeepResearch: `wait()` and `stream()` follow the server's `Retry-After` hint when no `pollInterval` is given (clamped to 1-30 seconds, default 5 seconds); an explicit `pollInterval` always wins.
- DeepResearch: a `Retry-After` on a 429/503 lengthens the jittered exponential backoff.
- DeepResearch: `onProgress` and stream progress callbacks are not repeated for a poll answered 304 Not Modified.
- Fix: the `X-Valyu-SDK-Version` header reported 2.10.1 in the 2.10.2 release; it now matches `package.json`.
