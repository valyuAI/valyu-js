# Contents API Async Mode – SDK Documentation Update Guide

This guide describes how to update SDK documentation (README, API reference, docs site) to reflect the Contents API async mode changes.

---

## 1. Changelog Section

Add to your changelog or release notes:

```markdown
## Contents API – Async Mode (v2.6.0+)

### New Features
- **Async processing** – Up to 50 URLs per request (vs 10 in sync)
- **`getContentsJob(jobId)`** – Poll job status and fetch results
- **`waitForJob(jobId, options?)`** – Wait for completion (like DeepResearch `wait`)
- **Webhooks** – Optional `webhookUrl` for completion notifications
- **`verifyContentsWebhookSignature()`** – Helper to verify webhook authenticity

### New Parameters
- `async` – Force async mode (required for >10 URLs)
- `webhookUrl` – HTTPS URL for webhook notifications (async only)

### Breaking Changes
- **Results include `status`** – Every result now has `status: "success" | "failed"`
- **Failed URLs in results** – Failed URLs appear in `results` with `error` instead of being dropped
- **>10 URLs** – Returns error unless `async: true` is set
```

---

## 2. URL Limits Table

Include this in the Contents section:

| Mode | Max URLs | How to Use |
|------|----------|------------|
| Sync | 10 | Default (≤10 URLs, no `async`) |
| Async | 50 | Set `async: true` or use 11–50 URLs |

---

## 3. API Reference Updates

### 3.1 `contents(urls, options?)`

**Return type:** `Promise<ContentsResponse | ContentsAsyncJobResponse>`

**Options (add these):**

| Parameter   | Type    | Default | Description                                      |
|------------|---------|---------|--------------------------------------------------|
| `async`    | boolean | false   | Use async processing (required for >10 URLs)      |
| `webhookUrl` | string | -       | HTTPS URL for completion notification (async)    |

**Response handling:**  
If the response has a `jobId` field, it is async. Use `getContentsJob(jobId)` or `waitForJob(jobId)` to get results.

---

### 3.2 `getContentsJob(jobId)` (NEW)

Fetches the current status and results of an async contents job.

**Parameters:**
- `jobId` (string) – Job ID from `contents()` async response

**Returns:** `Promise<ContentsJobResponse>`

**Example:**
```javascript
const status = await valyu.getContentsJob("cj_abc123...");
console.log(`${status.urlsProcessed}/${status.urlsTotal} - ${status.status}`);
if (status.results) {
  // Process results
}
```

---

### 3.3 `waitForJob(jobId, options?)` (NEW)

Polls until the job reaches a terminal state, then returns the final result.

**Parameters:**
- `jobId` (string) – Job ID from `contents()` async response
- `options` (optional):
  - `pollInterval` (number) – MS between polls (default: 5000)
  - `maxWaitTime` (number) – Max wait in MS (default: 7200000)
  - `onProgress` (function) – Called on each poll with `ContentsJobResponse`

**Returns:** `Promise<ContentsJobResponse>`

**Example:**
```javascript
const final = await valyu.waitForJob(job.jobId, {
  pollInterval: 5000,
  onProgress: (s) => console.log(`${s.urlsProcessed}/${s.urlsTotal}`),
});
console.log("Results:", final.results);
```

---

### 3.4 `verifyContentsWebhookSignature(payload, signature, timestamp, secret)` (NEW)

Verifies the signature of a Contents webhook.

**Parameters:**
- `payload` (string) – Raw request body (before JSON parsing)
- `signature` (string) – `X-Webhook-Signature` header
- `timestamp` (string) – `X-Webhook-Timestamp` header
- `secret` (string) – `webhookSecret` from the job creation response

**Returns:** `boolean`

**Example:**
```javascript
const { verifyContentsWebhookSignature } = require("valyu-js");

app.post("/webhook/contents", express.raw({ type: "application/json" }), (req, res) => {
  const valid = verifyContentsWebhookSignature(
    req.body.toString(),
    req.headers["x-webhook-signature"],
    req.headers["x-webhook-timestamp"],
    process.env.WEBHOOK_SECRET
  );
  if (!valid) return res.status(401).send("Invalid signature");
  const data = JSON.parse(req.body.toString());
  // Process webhook...
  res.status(200).send("OK");
});
```

---

## 4. Type Reference

### ContentResult (updated)

Each result is a discriminated union. Always check `status` before using success-only fields:

```typescript
// Success
{
  url: string;
  status: "success";
  title: string;
  content: string | number;
  length: number;
  source: string;
  price?: number;
  summary?: string | object;
  screenshot_url?: string;
  // ... other success fields
}

// Failed
{
  url: string;
  status: "failed";
  error: string;
}
```

### ContentsJobResponse

```typescript
{
  success: boolean;
  jobId: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  urlsTotal: number;
  urlsProcessed: number;
  urlsFailed: number;
  createdAt: number;
  updatedAt: number;
  currentBatch?: number;
  totalBatches?: number;
  results?: ContentResult[];
  actualCostDollars?: number;
  error?: string;
  webhookSecret?: string;
}
```

### ContentsAsyncJobResponse

```typescript
{
  success: boolean;
  jobId: string;
  status: "pending";
  urlsTotal: number;
  webhookSecret?: string;
  txId: string;
}
```

---

## 5. Migration Guide for Existing Users

Add a migration section:

```markdown
### Migrating from pre-async Contents API

1. **Result status**: Always check `result.status` before using `title` or `content`:

   ```javascript
   // Old (may break if API returns failed results)
   response.results.forEach(r => console.log(r.title));

   // New
   response.results.forEach(r => {
     if (r.status === "success") {
       console.log(r.title);
     } else {
       console.log(`Failed: ${r.url} - ${r.error}`);
     }
   });
   ```

2. **>10 URLs**: Add `async: true` and use `waitForJob()` or `getContentsJob()`:

   ```javascript
   const job = await valyu.contents(urls, { async: true });
   const final = await valyu.waitForJob(job.jobId);
   ```

3. **Webhooks**: Optional. Provide `webhookUrl` and verify with `verifyContentsWebhookSignature()`.
```

---

## 6. Quick Start Snippets for Docs

### Sync (≤10 URLs)
```javascript
const response = await valyu.contents(["https://example.com"], { summary: true });
```

### Async with wait (11–50 URLs)
```javascript
const job = await valyu.contents(urls, { async: true });
const final = await valyu.waitForJob(job.jobId);
```

### Async with webhook
```javascript
const job = await valyu.contents(urls, {
  async: true,
  webhookUrl: "https://yoursite.com/webhook",
});
// Save job.webhookSecret for signature verification
```

---

## 7. Error Messages to Document

| Scenario | Error |
|----------|-------|
| >10 URLs without async | "Requests with more than 10 URLs require async processing. Add async: true to the request." |
| >50 URLs | "Maximum 50 URLs allowed per request" |
| Invalid job ID / wrong API key | getContentsJob returns `error` in response |

---

## 8. Checklist for Doc Updates

- [ ] Changelog / release notes
- [ ] Contents section: sync vs async, URL limits
- [ ] `contents()` options: `async`, `webhookUrl`
- [ ] New methods: `getContentsJob`, `waitForJob`
- [ ] New export: `verifyContentsWebhookSignature`
- [ ] ContentResult: `status` field and discriminated union
- [ ] Types: `ContentsJobResponse`, `ContentsAsyncJobResponse`, `ContentsJobWaitOptions`
- [ ] Migration guide for existing users
- [ ] Code examples for sync, async + wait, async + webhook
- [ ] Error messages table
