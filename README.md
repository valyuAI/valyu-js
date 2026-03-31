# Valyu JavaScript SDK

[![npm version](https://img.shields.io/npm/v/valyu-js.svg)](https://www.npmjs.com/package/valyu-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Search and research APIs built for AI agents. Access web and proprietary data sources through Search, extract content from URLs, generate grounded answers, and run multi-step research with DeepResearch - all through a single SDK.

[Documentation](https://docs.valyu.ai) | [API Reference](https://docs.valyu.ai/api-reference) | [Platform](https://platform.valyu.ai)

## Installation

```bash
npm install valyu-js
```

## Quick Start

```typescript
import { Valyu } from "valyu-js";

const valyu = new Valyu(process.env.VALYU_API_KEY);

const response = await valyu.search("latest advances in transformer architectures", {
  maxNumResults: 5,
  searchType: "all",
});

for (const result of response.results) {
  console.log(result.title, result.url);
}
```

Get **$10 free credits** when you sign up at [platform.valyu.ai](https://platform.valyu.ai). No credit card required.

## APIs

### Search

Search across web and proprietary data sources with a single query.

```typescript
const response = await valyu.search("CRISPR gene therapy clinical trials 2026", {
  searchType: "proprietary",                    // "all", "web", or "proprietary"
  maxNumResults: 10,                            // 1-20 results
  includedSources: ["valyu/valyu-pubmed"],      // filter to specific sources
  startDate: "2026-01-01",                      // date filtering
  endDate: "2026-12-31",
});
```

<details>
<summary>All search parameters</summary>

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | required | Search query |
| `searchType` | `string` | `"all"` | `"all"`, `"web"`, or `"proprietary"` |
| `maxNumResults` | `number` | `10` | Results to return (1-20) |
| `maxPrice` | `number` | `30` | Max price per thousand queries (CPM) |
| `relevanceThreshold` | `number` | `0.5` | Min relevance score (0-1) |
| `includedSources` | `string[]` | `[]` | Sources to search |
| `excludeSources` | `string[]` | `[]` | Sources to exclude |
| `startDate` | `string` | - | Start date (YYYY-MM-DD) |
| `endDate` | `string` | - | End date (YYYY-MM-DD) |
| `countryCode` | `string` | - | Country filter (e.g. `"US"`, `"GB"`) |
| `responseLength` | `string \| number` | - | `"short"`, `"medium"`, `"large"`, `"max"`, or character count |
| `category` | `string` | - | Category filter |

</details>

### Contents

Extract clean, structured content from URLs. Supports sync (1-10 URLs) and async (up to 50 URLs) modes.

```typescript
// Basic extraction
const response = await valyu.contents(["https://arxiv.org/abs/2301.00001"]);

// With AI summarization
const response = await valyu.contents(["https://example.com/article"], {
  summary: true,
  responseLength: "medium",
});

// Structured data extraction with JSON schema
const response = await valyu.contents(["https://en.wikipedia.org/wiki/OpenAI"], {
  summary: {
    type: "object",
    properties: {
      company_name: { type: "string" },
      founded_year: { type: "integer" },
    },
  },
});
```

### Answer

AI-generated answers grounded by Valyu's search. Supports streaming.

```typescript
const response = await valyu.answer("What are the side effects of metformin?", {
  searchType: "proprietary",
  includedSources: ["valyu/valyu-pubmed"],
});

console.log(response.contents);        // AI-generated answer
console.log(response.search_results);  // Source citations
```

### DeepResearch

Multi-step research agent that produces comprehensive reports with citations.

```typescript
// Start a research task
const task = await valyu.deepresearch.create({
  query: "Compare CRISPR and base editing approaches for sickle cell disease",
  model: "heavy",
  outputFormats: ["markdown", "pdf"],
});

// Wait for completion with progress
const result = await valyu.deepresearch.wait(task.deepresearch_id, {
  onProgress: (status) => {
    console.log(`Step ${status.progress.current_step}/${status.progress.total_steps}`);
  },
});

console.log(result.output);   // Markdown report
console.log(result.pdf_url);  // PDF download link
```

<details>
<summary>All DeepResearch methods</summary>

| Method | Description |
|---|---|
| `create(options)` | Start a new research task |
| `status(taskId)` | Get task status |
| `wait(taskId, options?)` | Poll until completion |
| `stream(taskId, callbacks)` | Stream real-time updates |
| `list(options)` | List research tasks |
| `update(taskId, instruction)` | Add follow-up instruction |
| `cancel(taskId)` | Cancel a running task |
| `delete(taskId)` | Delete a task |
| `togglePublic(taskId, isPublic)` | Toggle public access |

</details>

### Batch

Run multiple DeepResearch tasks in parallel.

```typescript
const batch = await valyu.batch.create({
  name: "Q1 Analysis",
  mode: "fast",
  outputFormats: ["markdown"],
});

await valyu.batch.addTasks(batch.batch_id, {
  tasks: [
    { query: "Analyze recent SPAC performance" },
    { query: "Review semiconductor supply chain trends" },
  ],
});

const result = await valyu.batch.waitForCompletion(batch.batch_id, {
  onProgress: (b) => console.log(`${b.counts.completed}/${b.counts.total}`),
});
```

### Data Sources

List available data sources programmatically.

```typescript
const sources = await valyu.datasources.list();
const categories = await valyu.datasources.categories();
```

## Authentication

```bash
export VALYU_API_KEY="your-api-key"
```

Or pass directly:

```typescript
const valyu = new Valyu("your-api-key");
```

## TypeScript

Full type definitions are included. All request and response types are exported:

```typescript
import { Valyu, SearchOptions, SearchResponse, SearchResult } from "valyu-js";
```

## Error Handling

```typescript
const response = await valyu.search("test");

if (!response.success) {
  console.error(response.error);
  console.error(`tx_id: ${response.tx_id}`);
}
```

## Integrations

Valyu works with [Vercel AI SDK](https://www.npmjs.com/package/@valyu/ai-sdk), [LangChain](https://docs.valyu.ai), [MCP](https://docs.valyu.ai), and more. See [docs.valyu.ai](https://docs.valyu.ai) for integration guides.

## Links

- [Documentation](https://docs.valyu.ai)
- [Platform & API Keys](https://platform.valyu.ai)
- [Discord](https://discord.gg/valyu)
- [GitHub Issues](https://github.com/valyuAI/valyu-js/issues)

## License

MIT
