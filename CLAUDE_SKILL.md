# Valyy Claude Skill

This Claude skill enables Claude to use Valyu's DeepSearch API for searching, content extraction, and AI-powered research.

## Features

- **Search**: Search across web, academic papers, proprietary datasets, and news
- **Content Extraction**: Extract and summarize content from URLs
- **Answer API**: Get AI-powered answers with citations
- **DeepResearch**: Create comprehensive research reports with citations

## Installation

1. Build the skill:
   ```bash
   npm install
   npm run build
   ```

2. Set up your Valyu API key:
   - Get your API key from [Valyu Platform](https://platform.valyu.ai)
   - Set it as an environment variable: `VALYU_API_KEY`

## Usage in Claude

Once installed, Claude can use the following tools:

### Search

Search for information across multiple sources:

```
Search for "quantum computing applications" using web sources, limit to 10 results
```

### Extract Content

Extract and summarize content from URLs:

```
Extract content from https://example.com/article and summarize it
```

### Get Answers

Get AI-powered answers to questions:

```
What are the latest developments in AI safety research?
```

### DeepResearch

Create comprehensive research reports:

```
Create a DeepResearch report on "transformer architecture improvements" using the lite model
```

## Available Tools

### `search`

Search for information across web, proprietary sources, or both.

**Parameters:**
- `query` (required): The search query string
- `searchType`: "web", "proprietary", "all", or "news" (default: "all")
- `maxNumResults`: Maximum results (1-100, default: 10)
- `relevanceThreshold`: Minimum relevance score (0-1, default: 0.5)
- `includedSources`: Array of specific sources to include
- `excludeSources`: Array of sources to exclude
- `startDate`: Start date filter (YYYY-MM-DD)
- `endDate`: End date filter (YYYY-MM-DD)
- `countryCode`: Country code filter
- `fastMode`: Enable fast mode (default: false)

### `contents`

Extract content from URLs with optional AI summarization.

**Parameters:**
- `urls` (required): Array of URLs (max 10)
- `summary`: Enable AI summarization (default: false)
- `summaryInstructions`: Custom summarization instructions
- `extractEffort`: "normal", "high", or "auto" (default: "normal")
- `responseLength`: "short", "medium", "large", or "max" (default: "short")
- `maxPriceDollars`: Maximum cost limit in USD

### `answer`

Get AI-powered answers with citations.

**Parameters:**
- `query` (required): The question or query
- `searchType`: "web", "proprietary", "all", or "news" (default: "all")
- `systemInstructions`: Custom instructions for the AI (max 2000 chars)
- `dataMaxPrice`: Maximum spend in USD
- `includedSources`: Sources to include
- `excludedSources`: Sources to exclude
- `startDate`: Start date filter (YYYY-MM-DD)
- `endDate`: End date filter (YYYY-MM-DD)
- `fastMode`: Enable fast mode (default: false)

### `deepresearch_create`

Create a new DeepResearch task.

**Parameters:**
- `input` (required): Research query or task description
- `model`: "lite" or "heavy" (default: "lite")
- `outputFormats`: Array of formats ["markdown", "pdf"] (default: ["markdown"])
- `strategy`: Natural language research strategy
- `searchType`: "all", "web", or "proprietary"
- `includedSources`: Sources to include
- `urls`: URLs to analyze
- `codeExecution`: Enable code execution (default: true)

### `deepresearch_status`

Get the status of a DeepResearch task.

**Parameters:**
- `taskId` (required): The DeepResearch task ID

### `deepresearch_wait`

Wait for a DeepResearch task to complete.

**Parameters:**
- `taskId` (required): The DeepResearch task ID
- `pollInterval`: Polling interval in ms (default: 5000)
- `maxWaitTime`: Maximum wait time in ms (default: 3600000)

## Environment Variables

- `VALYU_API_KEY` (required): Your Valyu API key

## Examples

### Academic Research

```
Search for "transformer architecture" in proprietary sources, specifically valyu/valyu-arxiv, with relevance threshold 0.6
```

### Web Search with Date Filter

```
Search the web for "AI developments" from 2024-01-01 to 2024-12-31, limit to 5 results
```

### Content Extraction

```
Extract content from https://arxiv.org/abs/2103.14030 and provide a summary
```

### DeepResearch

```
Create a DeepResearch report on "recent advances in large language models" using the heavy model, output as markdown and PDF
```

## Support

- **Documentation**: [docs.valyu.ai](https://docs.valyu.ai)
- **Platform**: [platform.valyu.ai](https://platform.valyu.ai)
- **GitHub**: [ValyuNetwork/valyu-js](https://github.com/ValyuNetwork/valyu-js)
