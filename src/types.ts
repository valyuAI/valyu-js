export type SearchType = "web" | "proprietary" | "all" | "news";
export type FeedbackSentiment = "very good" | "good" | "bad" | "very bad";
export type DataType = "structured" | "unstructured";

export interface ValyuOptions {
  /**
   * Timeout in milliseconds for DeepResearch, batch and workflow requests
   * (default: 120000). A stalled connection fails instead of hanging, and
   * status polls retry it. Set 0 to disable.
   */
  timeout?: number;
  /**
   * How many times to automatically retry search(), contents(), answer(),
   * deepresearch.create(), batch.create() and batch.addTasks() when the API
   * responds 429 (default: 2). A 429 means the request was never accepted,
   * so retrying it is always safe. Each retry waits for the server's
   * retry_after/Retry-After, capped at 60 seconds. Set 0 to disable.
   */
  maxRateLimitRetries?: number;
}

/**
 * Structured detail from a 429 rate-limit response, carried on the
 * `rateLimit` field of a failed search/contents/answer/DeepResearch/batch
 * response, and on a thrown RateLimitError once retries are exhausted.
 *
 * `plan`, `limit`, `upgradeUrl` and `contactUrl` are only present on newer
 * API responses — an older server's generic 429 body leaves them undefined.
 */
export interface RateLimitDetail {
  /** Seconds to wait before retrying: the body's retry_after, else the Retry-After header. */
  retryAfter: number;
  /** The caller's current plan name. */
  plan?: string;
  limit?: {
    endpoint: string;
    requestsPerSecond: number;
  };
  /** Self-serve upgrade link, for a plan with a next tier to offer. */
  upgradeUrl?: string;
  /** Sales contact link, for a plan with no self-serve upgrade (e.g. enterprise). */
  contactUrl?: string;
}

/**
 * A non-fatal notice the API attaches to search, answer and DeepResearch
 * responses, e.g. datasets skipped because the plan doesn't include them.
 * `type` is an open set: new values can appear at any time.
 */
export interface ResponseWarning {
  type: string;
  message: string;
  detail?: Record<string, unknown> | null;
}

export type CountryCode =
  | "ALL"
  | "AR"
  | "AU"
  | "AT"
  | "BE"
  | "BR"
  | "CA"
  | "CL"
  | "DK"
  | "FI"
  | "FR"
  | "DE"
  | "HK"
  | "IN"
  | "ID"
  | "IT"
  | "JP"
  | "KR"
  | "MY"
  | "MX"
  | "NL"
  | "NZ"
  | "NO"
  | "CN"
  | "PL"
  | "PT"
  | "PH"
  | "RU"
  | "SA"
  | "ZA"
  | "ES"
  | "SE"
  | "CH"
  | "TW"
  | "TR"
  | "GB"
  | "US";

export type ResponseLength = "short" | "medium" | "large" | "max" | number;

// Per-request point-in-time strictness for a historicalCache (backtest) request.
export type HistoricalCacheStrict = "off" | "prefer" | "only";

export type ScopePolicy = "advisory" | "strict";
export type HlsCoverage = "hls" | "increased_coverage";

/** A passage from a DeepResearch source that supports a citation. */
export interface DeepResearchSourceLocation {
  excerpt: string; // The exact passage from the source
  page?: number; // Page number in the source document, when known
  piece?: number; // Which part of a long document the passage comes from, when it was read in parts
}

/**
 * Receipt for a `scopePolicy: "strict"` search. It shows which datasets were
 * dispatched and which returned rows. It does not certify full coverage.
 */
export interface SourceScope {
  policy: "strict";
  allowed_dataset_ids?: string[];
  selected_dataset_ids?: string[];
  completed_dataset_ids?: string[];
  returned_dataset_ids?: string[];
  omitted_dataset_ids?: string[];
  selection_basis?: string;
  coverage?: string;
  exhaustive?: boolean;
  errors?: { code?: string; [key: string]: any }[];
}

export interface SearchResult {
  title: string;
  url: string;
  content: string | object | any[]; // Can be string, object, or array for structured data
  description?: string;
  source: string;
  source_type?: string; // "website", "data", "forum"
  data_type?: DataType;
  date?: string;
  crawl_date?: string; // When the page was crawled (web results), ISO 8601
  length: number;
  price: number;
  relevance_score?: number;
  publication_date?: string;
  id?: string;
  image_url?: Record<string, string>;
  abstract?: string;
  doi?: string;
  citation?: string;
  citation_count?: number;
  authors?: string[];
  references?: string;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  searchType?: SearchType;
  maxNumResults?: number;
  maxPrice?: number;
  isToolCall?: boolean;
  relevanceThreshold?: number;
  includedSources?: string[];
  excludeSources?: string[];
  excludedSources?: string[]; // Alias of excludeSources, matching Answer and DeepResearch. excludeSources wins if both are set
  sourceBiases?: Record<string, number>;
  /** @deprecated Use `instructions` instead. The API falls back to this only when `instructions` is not set. */
  category?: string;
  scopePolicy?: ScopePolicy; // "advisory" (API default) guides source selection. "strict" searches exactly the datasets in includedSources
  hlsCoverage?: HlsCoverage; // Wiley Health & Life Sciences coverage. "hls" (API default) is licensed Wiley content only. "increased_coverage" blends it with open-access biomedical literature
  startDate?: string;
  endDate?: string;
  historicalCache?: boolean; // When true and a date range is set, return the newest cached snapshot inside the range instead of the latest crawl
  historicalCacheStrict?: HistoricalCacheStrict; // Point-in-time strictness for a historicalCache search. "only" serves ONLY content provably captured at or before endDate, dropping a result rather than falling back to a live crawl (use for strict backtests); "prefer" (API default) falls back to a live crawl so the query is never empty; "off" disables the guarantee. No-op without historicalCache=true
  includeAbstracts?: boolean; // Search PubMed's complete abstract corpus instead of full-text papers
  includeImageLinks?: boolean; // When false, image markdown ![alt](url) in result content becomes [Image: alt] (URL removed, alt text kept); images with no alt text are removed. Default true keeps image links. Sent only when false
  countryCode?: CountryCode;
  responseLength?: ResponseLength;
  fastMode?: boolean;
  urlOnly?: boolean;
  instructions?: string;
}

export interface SearchResponse {
  success: boolean;
  error?: string;
  /** Present when `error` was caused by a 429. */
  rateLimit?: RateLimitDetail;
  tx_id: string | null;
  query: string;
  results: SearchResult[];
  results_by_source: {
    web: number;
    proprietary: number;
  };
  total_deduction_dollars: number;
  total_characters: number;
  warnings?: ResponseWarning[];
  source_scope?: SourceScope; // Present only for scopePolicy "strict" requests
}

export interface FeedbackResponse {
  success: boolean;
  error?: string;
}

// Contents API Types
export type CacheState = "hit" | "miss" | "stale";
export type ExtractEffort = "normal" | "high" | "auto";
export type ContentResponseLength =
  | "short"
  | "medium"
  | "large"
  | "max"
  | number;

export interface ContentsOptions {
  summary?: boolean | string | object;
  extractEffort?: ExtractEffort;
  responseLength?: ContentResponseLength;
  maxPriceDollars?: number;
  screenshot?: boolean;
  async?: boolean;
  webhookUrl?: string;
  startDate?: string; // ISO date format (YYYY-MM-DD), inclusive
  endDate?: string; // ISO date format (YYYY-MM-DD), inclusive
  historicalCache?: boolean; // When true and a date range is set, return the newest cached snapshot inside the range instead of the latest crawl
  historicalCacheStrict?: HistoricalCacheStrict; // Point-in-time strictness for a historicalCache search. "only" serves ONLY content provably captured at or before endDate, dropping a result rather than falling back to a live crawl (use for strict backtests); "prefer" (API default) falls back to a live crawl so the query is never empty; "off" disables the guarantee. No-op without historicalCache=true
  includeImageLinks?: boolean; // When false, image markdown ![alt](url) in result content becomes [Image: alt] (URL removed, alt text kept); images with no alt text are removed. Default true keeps image links. Sent only when false
  maxAge?: number; // Oldest cached copy of a page, in seconds, that you accept. 0 forces a live crawl. Integer from 0 to 2592000 (30 days). Omit for the default cache policy. Cannot be combined with historicalCache. Also works with async jobs
}

// ContentResult - discriminated union (success | failed)
export interface ContentResultBase {
  url: string;
  status: "success" | "failed" | "not_found";
}

export interface ContentResultSuccess extends ContentResultBase {
  status: "success";
  title: string;
  content: string | number;
  length: number;
  source: string;
  price?: number;
  description?: string;
  summary?: string | object;
  summary_success?: boolean;
  data_type?: string;
  image_url?: Record<string, string>;
  screenshot_url?: string | null;
  source_type?: string;
  publication_date?: string;
  citation?: string;
  id?: string; // The URL for web pages, or the paper id / DOI for academic papers
  doi?: string; // Academic papers served from the processed index
  authors?: string[]; // Academic papers served from the processed index
  citation_count?: number; // Academic papers served from the processed index
  structured_metadata?: Record<string, any>; // Only present when data_type is "structured"
  cache_state?: CacheState; // "miss": crawled for this request. "hit": a fresh cached copy. "stale": a cached copy older than 5 minutes, served while it refreshes (only when maxAge is omitted)
  crawled_at?: string | null; // ISO 8601 capture time of the page copy. null when there is no page copy to date, for example a paper served from the index
  http_status?: number; // 404 when the page returned 404 but its body is a real page. Not set for a normal page
  final_url?: string; // The page the request ended on, when it redirected to a different page. Not set when there was no redirect
}

export interface ContentResultFailed extends ContentResultBase {
  status: "failed" | "not_found"; // "not_found": the page returned 404
  error: string;
}

export type ContentResult = ContentResultSuccess | ContentResultFailed;

export type ContentsJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export interface ContentsJobWaitOptions {
  pollInterval?: number;
  maxWaitTime?: number;
  onProgress?: (status: ContentsJobResponse) => void;
}

export interface ContentsJobResponse {
  success: boolean;
  jobId: string;
  status: ContentsJobStatus;
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

export interface ContentsAsyncJobResponse {
  success: boolean;
  jobId: string;
  status: "pending";
  urlsTotal: number;
  pollUrl?: string;
  webhookSecret?: string;
  txId: string;
}

export interface ContentsResponse {
  success: boolean;
  error?: string | null;
  /** Present when `error` was caused by a 429. */
  rateLimit?: RateLimitDetail;
  tx_id?: string;
  urls_requested?: number;
  urls_processed?: number;
  urls_failed?: number;
  results?: ContentResult[];
  total_cost_dollars?: number;
  total_characters?: number;
  isProvisioning?: boolean;
}

// Answer API Types
/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export interface AnswerOptions {
  structuredOutput?: Record<string, any>;
  systemInstructions?: string;
  searchType?: SearchType;
  dataMaxPrice?: number;
  countryCode?: CountryCode;
  includedSources?: string[];
  excludedSources?: string[];
  startDate?: string;
  endDate?: string;
  fastMode?: boolean;
  streaming?: boolean; // Default: false - when true, returns AsyncGenerator
}

export interface SearchMetadata {
  tx_ids: string[];
  number_of_results: number;
  total_characters: number;
}

export interface AIUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface Cost {
  total_deduction_dollars: number;
  search_deduction_dollars: number;
  contents_deduction_dollars?: number;
  ai_deduction_dollars: number;
}

export interface ExtractionMetadata {
  urls_requested: number;
  urls_processed: number;
  urls_failed: number;
  total_characters: number;
  response_length: string;
  extract_effort: string;
}

/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export interface AnswerSearchResult {
  title: string;
  url: string;
  content: string | object | any[];
  description?: string;
  source: string;
  source_type?: string;
  data_type?: DataType;
  date?: string;
  length: number;
  relevance_score?: number;
  image_url?: Record<string, string>;
  abstract?: string;
}

/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export interface AnswerSuccessResponse {
  success: true;
  tx_id: string;
  original_query: string;
  contents: string | Record<string, any>;
  search_results: AnswerSearchResult[];
  search_metadata: SearchMetadata;
  ai_usage: AIUsage;
  cost: Cost;
  extraction_metadata?: ExtractionMetadata;
  warnings?: ResponseWarning[];
}

/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export interface AnswerErrorResponse {
  success: false;
  error: string;
  /** Present when `error` was caused by a 429. */
  rateLimit?: RateLimitDetail;
}

/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export type AnswerResponse = AnswerSuccessResponse | AnswerErrorResponse;

// Streaming Types for Answer API
/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export type AnswerStreamChunkType =
  | "search_results"
  | "content"
  | "metadata"
  | "done"
  | "error";

/** @deprecated The Answer API stops working on 2026-12-17. Use DeepResearch with mode: 'instant' or search(). Migration guide: https://docs.valyu.ai/api-reference/endpoint/answer#migrate-from-answer */
export interface AnswerStreamChunk {
  type: AnswerStreamChunkType;

  // For type="search_results"
  search_results?: AnswerSearchResult[];

  // For type="content"
  content?: string;
  finish_reason?: string;

  // For type="metadata"
  tx_id?: string;
  original_query?: string;
  contents?: string | Record<string, any>;
  search_metadata?: SearchMetadata;
  ai_usage?: AIUsage;
  cost?: Cost;
  extraction_metadata?: ExtractionMetadata;
  warnings?: ResponseWarning[];

  // For type="error"
  error?: string;
}

// DeepResearch API Types
export interface AlertEmailConfig {
  email: string;
  custom_url?: string; // Must contain {id} placeholder, replaced with deepresearch task ID
}

/**
 * DeepResearch mode, from quickest to most thorough: "instant", "fast",
 * "standard", "heavy", "max".
 *
 * "instant" returns a short cited answer, typically in under 30 seconds. Human-in-the-loop
 * checkpoints (`hitl`) do not run in instant mode, and a batch cannot use it.
 */
export type DeepResearchMode =
  | "instant"
  | "fast"
  | "standard"
  /** @deprecated Use "standard" instead. The SDK sends "standard" in place of "lite". */
  | "lite"
  | "heavy"
  | "max";

/** Modes a batch accepts: every DeepResearch mode except "instant". */
export type DeepResearchBatchMode = Exclude<DeepResearchMode, "instant">;
export type DeepResearchStatus =
  | "queued"
  | "running"
  | "awaiting_input"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";
export type DeepResearchOutputFormat =
  | "markdown"
  | "pdf"
  | "toon"
  | "structured_report"
  | Record<string, any>;
export type DeepResearchOutputType = "markdown" | "json" | "toon";

/**
 * A union of known string values that also accepts any other string, so a value
 * added by the API later never breaks type checks. Editor autocomplete still
 * lists the known values.
 */
export type OpenString<T extends string> = T | (string & {});

/** A mode as reported in a response. Known modes plus any string the API may add. */
export type DeepResearchModeValue = OpenString<DeepResearchMode>;
/** A task status as reported in a response. Known statuses plus any other string. */
export type DeepResearchStatusValue = OpenString<DeepResearchStatus>;
/** An output format as reported in a response: a name or a structured format object. */
export type DeepResearchOutputFormatValue = string | Record<string, unknown>;
export type KnownImageType = "chart" | "ai_generated" | "screenshot" | "attachment";
export type ImageType = OpenString<KnownImageType>;
export type KnownChartType =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "doughnut"
  | "radar"
  | "scatter"
  | "horizontalBar"
  | "heatmap"
  | "boxplot"
  | "stackedBar"
  | "stackedArea"
  | "histogram"
  | "waterfall"
  | "timeline"
  | "bubble";
export type ChartType = OpenString<KnownChartType>;
/** Chart kinds: the chart types plus "stacked" and "slope". Unknown strings are accepted. */
export type ChartKind = OpenString<KnownChartType | "stacked" | "slope">;

export interface FileAttachment {
  data: string;
  filename: string;
  mediaType: string;
  /** Context about the file (max 50,000 characters; 100,000 combined across all files). */
  context?: string;
}

/**
 * Cover art for one report. Replaces the brand kit's cover art on the report
 * PDF and PDF deliverable, and works without a kit. Send exactly one of `data`
 * or `url`. PNG or JPEG, at most 2 MB, 800 px or more on the short side. A
 * picture that cannot be used never fails the task: the kit's cover art (or the
 * standard cover) is used and the response `warnings` include `cover_art_not_used`.
 */
export interface CoverArt {
  /** "image" (photo or illustration, default) or "pattern" (brand graphic, shown more quietly). */
  kind?: "image" | "pattern";
  /** Base64 string or data URL of the picture. */
  data?: string;
  /** Public https URL of the picture, fetched when the report is rendered. */
  url?: string;
  filename?: string;
  /** "image/png" or "image/jpeg". */
  mediaType?: string;
}

export interface MCPServerConfig {
  url: string;
  name?: string;
  toolPrefix?: string;
  auth?: {
    type: "bearer" | "header" | "none";
    token?: string;
    headers?: Record<string, string>;
  };
  allowedTools?: string[];
}

export type KnownDeliverableType = "csv" | "xlsx" | "pptx" | "docx" | "pdf" | "html" | "json";
/** Deliverable file type. Unknown strings are accepted in responses. */
export type DeliverableType = OpenString<KnownDeliverableType>;
export type KnownDeliverableStatus = "completed" | "failed" | "pending";
/** Deliverable status. Unknown strings are accepted in responses. */
export type DeliverableStatus = OpenString<KnownDeliverableStatus>;

export interface Deliverable {
  type: KnownDeliverableType;
  description: string;
  columns?: string[];
  includeHeaders?: boolean;
  sheetName?: string;
  slides?: number;
  template?: string;
  /**
   * JSON Schema the produced file must validate against. Applies to
   * `type: "json"` only; the API ignores it (with a warning) on other types.
   * Draft 2020-12 by default, draft-07 when the schema has a `$schema` header.
   * Sent to the API unchanged, so keys such as `additionalProperties` and
   * `$defs` are not rewritten. The API returns 400 DELIVERABLE_SCHEMA_INVALID
   * for a schema that is not an object, is empty, is over 20,000 characters,
   * uses an external `$ref`, or has a regex `pattern` with lookahead or
   * backreferences.
   *
   * Without a schema, the file has this shape:
   * `{title, as_of, summary, key_findings: [{finding, citations}],
   * tables: [{title, columns, rows}], sources: [{n, title, url}]}`.
   */
  schema?: Record<string, unknown>;
}

export interface DeliverableResult {
  id: string;
  request: string;
  type: DeliverableType;
  status: DeliverableStatus;
  title: string;
  description?: string;
  url: string;
  row_count?: number;
  column_count?: number;
  error?: string;
  created_at?: number;
  // Additional fields, beside the ones above.
  filename?: string;
  bytes?: number;
  attempts?: number;
  summary?: Record<string, any>;
}

export interface DeepResearchSearchConfig {
  searchType?: "all" | "web" | "proprietary";
  includedSources?: string[];
  excludedSources?: string[];
  sourceBiases?: Record<string, number>;
  startDate?: string; // Inclusive start bound. Bare date (YYYY-MM-DD) or full ISO-8601 datetime; a datetime with any time component requires historicalCache=true, else HTTP 400
  endDate?: string; // Inclusive end bound. Bare date (YYYY-MM-DD) or full ISO-8601 datetime; a datetime with any time component requires historicalCache=true, else HTTP 400
  historicalCache?: boolean; // When true and a date range is set, searches return the newest cached snapshot inside the range (leak-safe as-of backtest) instead of the latest crawl. Also required to pass any sub-day timestamp on startDate/endDate. No-op without a date range. User-set only; locked for the whole research run (the agent cannot toggle it)
  historicalCacheStrict?: HistoricalCacheStrict; // Point-in-time strictness for a historicalCache search. "only" serves ONLY content provably captured at or before endDate, dropping a result rather than falling back to a live crawl (use for strict backtests); "prefer" (API default) falls back to a live crawl so the query is never empty; "off" disables the guarantee. No-op without historicalCache=true
  referenceDate?: string; // Pins the run to this date for backtests. Takes precedence over endDate. YYYY-MM-DD or ISO-8601 datetime; dates before 2026 return HTTP 400
  /** @deprecated Not part of the documented DeepResearch search config. */
  category?: string;
  countryCode?: CountryCode; // Country code for location-filtered searches
}

/**
 * Per-tool configuration with optional call limit.
 *
 * max_calls can only be lowered, not raised above the system default.
 * Setting max_calls to 0 effectively disables the tool.
 */
export interface ToolConfig {
  enabled?: boolean;
  max_calls?: number;
}

/** Spend cap for Ultrasearch, in US dollars. Must be a finite number above 0. */
export interface UltrasearchConfig {
  max_usd: number;
}

export interface DeepResearchTools {
  code_execution?: boolean | ToolConfig;
  screenshots?: boolean | ToolConfig;
  browser_use?: boolean | ToolConfig;
  /** Enable chart/graph generation embedded in the final report (free, unlimited) */
  charts?: boolean | ToolConfig;
  // Newer tool names, resolved beside the legacy names above. read/analyse succeed
  // urls/code_execution, browse succeeds browser_use, screenshot is the singular name for
  // screenshots.
  x_search?: boolean | ToolConfig;
  read?: boolean | ToolConfig;
  analyse?: boolean | ToolConfig;
  browse?: boolean | ToolConfig;
  screenshot?: boolean | ToolConfig;
  /**
   * Ultrasearch, available in "heavy" and "max" modes only. `true` enables it with the default
   * spend cap. `{ max_usd }` sets the cap in US dollars (a number above 0). `false` or omitted
   * leaves it off. Its charges appear as ordinary lines in `cost_breakdown.tools` and
   * `cost_breakdown.datasets`. Not available on a task with a historical date bound
   * (`search.historicalCache` with an end date).
   */
  ultrasearch?: boolean | UltrasearchConfig;
}

export interface DeepResearchCreateOptions {
  query?: string; // Research query or task description
  input?: string; // Deprecated: use query instead
  mode?: DeepResearchMode; // Preferred field name
  /** @deprecated Use `mode`. The SDK sends this value as `mode`. */
  model?: DeepResearchMode;
  outputFormats?: DeepResearchOutputFormat[];
  /** Skills to enable for this task, for example `["forecasting"]`. */
  skills?: string[];
  strategy?: string; // Deprecated: use researchStrategy instead
  researchStrategy?: string; // Natural language strategy to guide the research phase. Combined length of researchStrategy (or legacy strategy) and reportFormat must not exceed 15,000 characters.
  reportFormat?: string; // Natural language instructions for output format (highest priority). Combined length of researchStrategy (or legacy strategy) and reportFormat must not exceed 15,000 characters.
  search?: DeepResearchSearchConfig;
  urls?: string[];
  files?: FileAttachment[];
  deliverables?: (string | Deliverable)[];
  mcpServers?: MCPServerConfig[];
  /** @deprecated Use tools.code_execution instead */
  codeExecution?: boolean;
  tools?: DeepResearchTools;
  previousReports?: string[];
  webhookUrl?: string;
  alertEmail?: string | AlertEmailConfig; // Email or { email, custom_url } with {id} placeholder
  /** Brand collection (kit) ID. Pass "none" to opt out of your organization's default kit. */
  brandCollectionId?: string;
  /** Cover art for this report, replacing the brand kit's cover art on the report PDF and PDF deliverable. */
  coverArt?: CoverArt;
  metadata?: Record<string, string | number | boolean>;
  hitl?: HitlConfig; // Human-in-the-loop configuration (not available for batch or instant mode)
  // Workflow slug to run — the template supplies query/strategy/format. Mutually
  // exclusive with query/input/researchStrategy/reportFormat. Every other option
  // here still applies to a workflow run and overrides the template's value,
  // except tools, which is merged with it.
  workflowId?: string;
  // Values for the workflow's variables. Keys must match the workflow's declared
  // variables — read them from workflows.get(slug).workflow.variables, since they
  // differ per workflow.
  workflowParams?: Record<string, any>;
  workflowVersion?: number; // Specific workflow version to run (defaults to current)
}

// Human-in-the-Loop (HITL) Types
export interface HitlConfig {
  planningQuestions?: boolean; // Pause before research to ask clarifying questions
  planReview?: boolean; // Pause after planning for user to review the research plan
  sourceReview?: boolean; // Pause after research for user to filter sources by domain
  outlineReview?: boolean; // Pause after source review for user to review the report outline
}

export type InteractionType =
  | "planning_questions"
  | "plan_review"
  | "source_review"
  | "outline_review";

export interface Interaction {
  interaction_id: string; // Use this when responding
  type: InteractionType;
  data: Record<string, any>; // Checkpoint-specific data
  created_at: number; // Unix timestamp (ms)
  timeout_ms: number; // Timeout duration in ms
  expected_response?: Record<string, any>; // Schema hint for the response shape
}

export interface InteractionHistoryEntry {
  interaction_id: string;
  type: InteractionType;
  created_at: number; // When the checkpoint fired (ms)
  responded_at?: number; // When the user responded (ms) — absent if timed out
  auto_continued: boolean; // true = timed out, false = user responded
  response?: Record<string, any>; // The user's response — absent if timed out
}

export interface Progress {
  current_step: number;
  total_steps: number;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  y2?: number;
  z?: number;
  values?: number[];
}

export interface ChartDataSeries {
  name: string;
  data: ChartDataPoint[];
  line_style?: "solid" | "dashed" | "dotted";
}

export interface ImageMetadata {
  image_id: string;
  image_type: ImageType;
  title?: string;
  description?: string;
  image_url: string;
  created_at?: number; // Epoch milliseconds
  chart_type?: ChartType;
  /** The API's own chart kind, kept beside chart_type even when chart_type holds the value
   * mapped onto one of the 16 legacy types (e.g. "stacked" -> "stackedBar"). */
  chart_kind?: ChartKind;
  x_axis_label?: string;
  y_axis_label?: string;
  data_series?: ChartDataSeries[];
  // Screenshot-only fields
  source_url?: string;
  captured_at?: number;
}

export interface DeepResearchSource {
  title: string;
  url: string;
  snippet?: string;
  description?: string;
  source?: string;
  price?: number;
  id?: string;
  doi?: string;
  category?: string;
  word_count?: number;
  fragment?: string;
  // Dates and tier: additional fields.
  crawl_date?: string;
  updated_date?: string;
  tier?: number;
  tier_label?: string;
  locations?: DeepResearchSourceLocation[]; // Passages that support the citation. Present only when the source has them
}

export interface DeepResearchUsage {
  search_cost: number;
  contents_cost: number;
  ai_cost: number;
  compute_cost: number;
  total_cost: number;
}

/**
 * Itemized cost. The API can also send the v2 form: `base_usd`, `tools` (lines),
 * `datasets` as a list of lines instead of a number, `total_usd`, `base_credits`
 * and `total_credits`.
 */
export interface DeepResearchCostBreakdown {
  task: number;
  screenshots?: number;
  code_execution?: number;
  deliverables?: number;
  datasets?: number | Record<string, unknown>[];
  base_usd?: number;
  tools?: Record<string, unknown>[];
  total_usd?: number;
  base_credits?: number;
  total_credits?: number;
  x_search?: number;
  browse?: number;
  ocr?: number;
  urls?: number;
  other_tools?: number;
  /** Other cost lines the API may add. */
  [key: string]: number | Record<string, unknown>[] | undefined;
}

export interface DeepResearchCostDetailTool {
  item: string;
  label?: string;
  pricing?: string;
  unit?: string;
  units?: number;
  free_units?: number;
  billed_units?: number;
  unit_price_usd?: number;
  usd: number;
  credits?: number;
}

export interface DeepResearchCostDetailDataset {
  source: string;
  rows: number;
  usd: number;
  credits?: number;
}

/** Line-by-line cost detail for a task. */
export interface DeepResearchCostDetail {
  base_usd: number | null;
  tools: DeepResearchCostDetailTool[];
  datasets: DeepResearchCostDetailDataset[];
  total_usd: number | null;
  base_credits?: number;
  total_credits?: number;
}

/** One node of a structured_report's section tree. heading is null for the lead: the text
 * between the report's title and its first heading. */
export interface StructuredSection {
  heading: string | null;
  level: number;
  markdown: string;
  citations: number[];
  children?: StructuredSection[];
}

export interface StructuredTable {
  id: string;
  caption: string | null;
  columns: string[];
  rows: any[][];
  citations: number[];
}

export interface StructuredChart {
  title: string;
  image_url: string;
  data_table_ref: string | null;
}

export interface StructuredSourceRef {
  n: number;
  title: string;
  url: string | null;
}

/** output_formats: ["structured_report"]'s typed JSON tree. */
export interface StructuredReport {
  title: string | null;
  summary: string | null;
  sections: StructuredSection[];
  tables: StructuredTable[];
  charts: StructuredChart[];
  sources: StructuredSourceRef[];
  warnings: string[];
}

export interface DeepResearchCreateResponse {
  success: boolean;
  deepresearch_id?: string;
  status?: DeepResearchStatusValue;
  mode?: DeepResearchModeValue; // Filled from research_mode when the API omits it (instant tasks)
  model?: DeepResearchModeValue; // Deprecated: kept for backward compatibility
  research_mode?: DeepResearchModeValue; // Mode as reported by the API; set for instant tasks
  query?: string;
  title?: string;
  output_formats?: DeepResearchOutputFormatValue[];
  research_output_formats?: DeepResearchOutputFormatValue[];
  created_at?: string;
  metadata?: Record<string, string | number | boolean>;
  public?: boolean;
  webhook_secret?: string;
  message?: string;
  workflow?: WorkflowRunInfo; // Present when the task was created from a workflow
  warnings?: ResponseWarning[];
  ignored_fields?: string[];
  error?: string;
  error_message?: string;
  error_code?: string;
  /** Present when `error` was caused by a 429. */
  rateLimit?: RateLimitDetail;
}

export interface DeepResearchStatusResponse {
  success: boolean;
  deepresearch_id?: string;
  status?: DeepResearchStatusValue;
  query?: string;
  mode?: DeepResearchModeValue; // Filled from research_mode when the API omits it (instant tasks)
  research_mode?: DeepResearchModeValue; // Mode as reported by the API; set for instant tasks
  output_formats?: DeepResearchOutputFormatValue[];
  research_output_formats?: DeepResearchOutputFormatValue[]; // Output formats as reported by the API
  created_at?: string; // ISO 8601 timestamp string
  public?: boolean;
  progress?: Progress;
  messages?: any[];
  completed_at?: string; // ISO 8601 timestamp string
  output?: string | Record<string, any>;
  output_type?: DeepResearchOutputType;
  /** The markdown rendering beside a structured/json output (e.g. structured_report, which
   * answers output_type: "json" with output the typed tree below). */
  markdown?: string;
  /** The typed JSON tree for output_formats: ["structured_report"]. */
  structured_report?: StructuredReport;
  title?: string; // Auto-generated report title
  total_word_count?: number; // Total word count of the synthesised report
  pdf_url?: string;
  images?: ImageMetadata[];
  deliverables?: DeliverableResult[];
  pending_deliverables?: DeliverableResult[]; // Deliverables not finished yet (status "pending")
  sources?: DeepResearchSource[];
  cost?: number; // Total cost in dollars (preferred)
  cost_credits?: number; // The same amount in platform credits
  usage?: DeepResearchUsage; // Detailed cost breakdown (backward compatible)
  cost_breakdown?: DeepResearchCostBreakdown;  // Itemized cost breakdown
  cost_breakdown_credits?: DeepResearchCostBreakdown; // Same shape as cost_breakdown, in credits
  cost_detail?: DeepResearchCostDetail; // Line-by-line cost detail
  tools?: DeepResearchTools;  // Resolved tools configuration
  batch_id?: string; // Batch ID if task belongs to a batch
  batch_task_id?: string; // Batch task ID if task belongs to a batch
  /** The task's harness id (e.g. "default", "people", "forecasting"). */
  harness?: string;
  ignored_fields?: string[]; // Top-level request fields the server ignored
  hitl_config?: Record<string, boolean>; // HITL configuration (mirrors request hitl param)
  interaction?: Interaction; // Current HITL checkpoint (present when awaiting_input or paused)
  hitl_history?: InteractionHistoryEntry[]; // History of completed HITL checkpoints
  warnings?: ResponseWarning[];
  error?: string;
  error_message?: string; // User-facing sentence for error_code
  error_code?: string; // Machine-readable code for `error`
  // Report editing (completed tasks)
  editable?: boolean; // Whether report editing is available for this task
  version?: number; // Head version, or the version requested with status(taskId, { version })
  version_count?: number; // Number of versions the task has
  revised_at?: string | null; // ISO 8601 time of the latest applied edit or restore
  active_edit?: DeepResearchEditRecord | null; // The edit running on this task, if any
  is_latest?: boolean; // Set when a version was requested: whether it is the head
  // True when success=false because the status endpoint could not be reached
  // after retries (transient gateway/network failure). Retryable and distinct
  // from a failed task — the report may still be available.
  unreachable?: boolean;
}

/** The mode the server actually resolved to: research_mode when mode/model had to be left out
 * for an SDK that cannot type it (e.g. "instant"), else mode or model. */
export function effectiveMode(r: {
  research_mode?: DeepResearchModeValue;
  mode?: DeepResearchModeValue;
  model?: DeepResearchModeValue;
}): DeepResearchModeValue | undefined {
  return r.research_mode ?? r.mode ?? r.model;
}

/** The output formats the server actually resolved to, mirroring effectiveMode(). */
export function effectiveOutputFormats(r: {
  research_output_formats?: DeepResearchOutputFormatValue[];
  output_formats?: DeepResearchOutputFormatValue[];
}): DeepResearchOutputFormatValue[] | undefined {
  return r.research_output_formats ?? r.output_formats;
}

/**
 * The itemized bill, wherever it was sent: the separate cost_detail field, or
 * cost_breakdown itself when that field already holds the itemized bill (base_usd/tools/
 * total_usd set, with no separate cost_detail).
 */
export function effectiveCostDetail(r: {
  cost_detail?: DeepResearchCostDetail;
  cost_breakdown?: DeepResearchCostBreakdown;
}): DeepResearchCostDetail | undefined {
  if (r.cost_detail) return r.cost_detail;
  const cb = r.cost_breakdown;
  if (!cb || cb.base_usd === undefined) return undefined;
  return {
    base_usd: cb.base_usd,
    tools: (cb.tools ?? []) as unknown as DeepResearchCostDetail["tools"],
    datasets: (Array.isArray(cb.datasets) ? cb.datasets : []) as unknown as DeepResearchCostDetail["datasets"],
    total_usd: cb.total_usd ?? null,
    base_credits: cb.base_credits,
    total_credits: cb.total_credits,
  };
}

export interface DeepResearchTaskListItem {
  deepresearch_id: string;
  query: string; // Research query
  input?: string; // Deprecated: use query instead
  title?: string; // Auto-generated report title
  status: DeepResearchStatus;
  created_at: number;
  public?: boolean;
}

export interface DeepResearchListResponse {
  success: boolean;
  data?: DeepResearchTaskListItem[];
  error?: string;
}

export interface DeepResearchUpdateResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  error?: string;
  error_message?: string;
  error_code?: string;
}

export interface DeepResearchCancelResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  error?: string;
  error_message?: string;
  error_code?: string;
}

export interface DeepResearchDeleteResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  error?: string;
  error_message?: string;
  error_code?: string;
}

export interface DeepResearchTogglePublicResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  public?: boolean;
  error?: string;
}

export interface DeepResearchGetAssetsOptions {
  token?: string; // Asset access token (alternative to API key)
}

export interface DeepResearchGetAssetsResponse {
  success: boolean;
  data?: Buffer; // Binary asset data
  contentType?: string; // MIME type of the asset
  error?: string;
}

export interface DeepResearchRespondResponse {
  success: boolean;
  status?: string;
  deepresearch_id?: string;
  error?: string;
  error_message?: string;
  error_code?: string;
}

// DeepResearch report editing

export interface DeepResearchStatusOptions {
  /** Read this version of the report instead of the head (owner only). */
  version?: number;
}

/** What an edit changes: the written report (default) or one deliverable file. */
export type DeepResearchEditTarget =
  | { kind: "report" }
  | {
      kind: "deliverable";
      /** The deliverable's `id` from the task's `deliverables`, for example `"f_01"`. */
      deliverableId: string;
    };

/** Points an edit at a highlighted passage or a section of the report. */
export interface DeepResearchEditFocus {
  /** UTF-16 start offset into `output` of the base version. Give it with `endChar`. */
  startChar?: number;
  /** UTF-16 end offset, greater than `startChar`. */
  endChar?: number;
  /** The highlighted text (up to 20,000 characters). */
  text?: string;
  /** Text just before the passage, to tell repeated phrases apart (up to 2,000 characters). */
  prefix?: string;
  /** Text just after the passage (up to 2,000 characters). */
  suffix?: string;
  /** A section heading. On its own it focuses that whole section. */
  section?: string;
  /** `"prefer"` (default) guides the edit to the focus; `"strict"` rejects changes outside it. */
  scope?: "prefer" | "strict";
}

export interface DeepResearchEditOptions {
  /** The change to make, in plain language (1 to 4,000 characters). */
  instruction: string;
  target?: DeepResearchEditTarget;
  focus?: DeepResearchEditFocus;
  /** The version you read. A moved head returns 409 `edit.revision_conflict`. */
  baseVersion?: number;
  /** `"stable"` (default) keeps citation numbers; `"compact"` renumbers by first use. */
  citations?: "stable" | "compact";
  /**
   * Seconds (0 to 20) the API waits for the edit to finish before answering.
   * A finished edit comes back in full; otherwise `status` is `"running"`.
   */
  waitSeconds?: number;
  /** Sent as the `Idempotency-Key` header: a retry with the same key returns the same edit. */
  idempotencyKey?: string;
}

export interface WaitForEditOptions {
  /**
   * Milliseconds between polls. When not set, the edit's
   * `retry_after_seconds` is used (clamped to 1-30 seconds), else 5000.
   */
  pollInterval?: number;
  /** Milliseconds to wait before throwing "Maximum wait time exceeded" (default: 600000). */
  maxWaitTime?: number;
}

export type KnownDeepResearchEditStatus = "running" | "applied" | "declined" | "failed";
export type DeepResearchEditStatus = OpenString<KnownDeepResearchEditStatus>;

export type KnownDeepResearchEditDeclineCode =
  | "edit.rewrite_requested"
  | "edit.out_of_evidence"
  | "edit.contradictory"
  | "edit.unsafe_instruction"
  | "edit.not_applicable"
  | "edit.no_change";
export type DeepResearchEditDeclineCode = OpenString<KnownDeepResearchEditDeclineCode>;

export type KnownDeepResearchEditErrorCode =
  | "edit.invalid_request"
  | "edit.task_not_completed"
  | "edit.in_progress"
  | "edit.revision_conflict"
  | "edit.unsupported_task"
  | "focus.not_found"
  | "focus.ambiguous"
  | "edit.busy";
export type DeepResearchEditErrorCode = OpenString<KnownDeepResearchEditErrorCode>;

/** An edit target as the API reports it. */
export type DeepResearchEditTargetRecord =
  | { kind: "report" }
  | { kind: "deliverable"; deliverable_id: string };

/** An edit focus as the API reports it. */
export interface DeepResearchEditFocusRecord {
  start_char?: number;
  end_char?: number;
  text?: string;
  prefix?: string;
  suffix?: string;
  section?: string;
  scope?: "prefer" | "strict";
}

/** Why an edit finished with status `"declined"`. */
export interface DeepResearchEditDecline {
  code: DeepResearchEditDeclineCode;
  message: string;
  suggestion?: string | null;
}

/** Why an edit finished with status `"failed"`. */
export interface DeepResearchEditFailure {
  code?: string; // e.g. "edit.interrupted"
  message?: string;
  retryable?: boolean; // Whether submitting the edit again may succeed
}

export interface DeepResearchEditStats {
  replacements?: number;
  chars_changed?: number;
  citations_added?: number;
  [key: string]: unknown;
}

/** One edit of a DeepResearch report or deliverable, as the API reports it. */
export interface DeepResearchEditRecord {
  edit_id: string;
  deepresearch_id: string;
  status: DeepResearchEditStatus;
  target: DeepResearchEditTargetRecord;
  instruction?: string;
  base_version: number;
  version?: number | null; // The new version, when status is "applied"
  focus?: DeepResearchEditFocusRecord | null;
  created_at: string;
  completed_at?: string | null;
  retry_after_seconds?: number | null; // Suggested poll delay while running
  progress?: { step?: string } | null; // Current step while running
  summary?: string | null;
  changes?: Record<string, any>[];
  unapplied?: (string | Record<string, any>)[]; // Parts of the instruction not applied
  stats?: DeepResearchEditStats | null;
  warnings?: ResponseWarning[]; // e.g. deliverables_stale after a report edit
  decline?: DeepResearchEditDecline | null;
  error?: DeepResearchEditFailure | null;
  citations?: OpenString<"stable" | "compact"> | null;
  mode?: string | null;
  pdf_url?: string | null; // Re-rendered PDF for the new version
}

/** A candidate passage returned with 422 `focus.ambiguous`. */
export interface DeepResearchFocusCandidate {
  start_char: number;
  end_char: number;
  section?: string | null;
  prefix?: string;
  suffix?: string;
  [key: string]: unknown;
}

/** A failed edit, edits, versions or restore request. Nothing was changed. */
export interface DeepResearchEditErrorResponse {
  success: false;
  error: string;
  code?: DeepResearchEditErrorCode;
  httpStatus?: number;
  candidates?: DeepResearchFocusCandidate[]; // With focus.ambiguous
  active_edit_id?: string; // With edit.in_progress
  retry_after_seconds?: number; // With edit.busy
}

export type DeepResearchEditResponse =
  | ({ success: true } & DeepResearchEditRecord)
  | DeepResearchEditErrorResponse;

export type DeepResearchEditListResponse =
  | { success: true; deepresearch_id: string; edits: DeepResearchEditRecord[] }
  | DeepResearchEditErrorResponse;

export type KnownDeepResearchVersionKind = "original" | "edit" | "restore";

export interface DeepResearchVersion {
  version: number;
  kind: OpenString<KnownDeepResearchVersionKind>;
  target?: DeepResearchEditTargetRecord | null;
  created_at: string;
  edit_id?: string | null;
  instruction?: string | null;
  summary?: string | null;
  stats?: DeepResearchEditStats | null;
  is_head: boolean;
  pdf_url?: string | null;
  restored_from?: number | null; // The version a "restore" copied
}

export type DeepResearchVersionListResponse =
  | { success: true; deepresearch_id: string; head: number; versions: DeepResearchVersion[] }
  | DeepResearchEditErrorResponse;

export type DeepResearchRestoreVersionResponse =
  | { success: true; deepresearch_id?: string; version: number; restored_from: number }
  | DeepResearchEditErrorResponse;

export interface WaitOptions {
  /**
   * Milliseconds between polls. When not set, the server's Retry-After hint
   * is used (clamped to 1-30 seconds), else 5000.
   */
  pollInterval?: number;
  maxWaitTime?: number;
  /** Not called again for a poll the server answers 304 Not Modified. */
  onProgress?: (status: DeepResearchStatusResponse) => void;
  /**
   * Called once per HITL checkpoint. Return a response to answer it, or
   * null/undefined to leave it unanswered. A checkpoint is only offered again
   * if sending the response failed.
   */
  onInteraction?: (interaction: Interaction) => Promise<Record<string, any> | null | undefined> | Record<string, any> | null | undefined;
}

export interface StreamOptions {
  /**
   * Milliseconds to stream before giving up with "Maximum wait time
   * exceeded" via onError (default: 7200000, as for wait()).
   */
  maxWaitTime?: number;
}

export interface StreamCallback {
  onMessage?: (message: any) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (result: DeepResearchStatusResponse) => void;
  onError?: (error: Error) => void;
}

export interface ListOptions {
  limit?: number;
}

// Batch API Types
export type BatchStatus =
  | "open"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "cancelled";

export interface BatchCounts {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

// BatchUsage interface removed - replaced by 'cost' field in DeepResearchBatch

export interface DeepResearchBatch {
  batch_id: string;
  status: BatchStatus;
  mode: DeepResearchMode; // Renamed from 'model' in responses
  /** See DeepResearchStatusResponse's research_mode: a batch made in a mode this field cannot
   * carry has the true value here. */
  research_mode?: DeepResearchMode;
  name?: string;
  output_formats?: DeepResearchOutputFormat[];
  research_output_formats?: DeepResearchOutputFormat[];
  search_params?: {
    search_type?: "all" | "web" | "proprietary";
    included_sources?: string[];
    excluded_sources?: string[];
    start_date?: string; // ISO date format (YYYY-MM-DD)
    end_date?: string; // ISO date format (YYYY-MM-DD)
    category?: string;
    country_code?: CountryCode; // Country code for location-filtered searches
  };
  created_at: string; // ISO 8601 date-time string
  completed_at?: string; // ISO 8601 date-time string
  counts: BatchCounts;
  cost: number; // Replaces 'usage' object
  webhook_secret?: string; // Only returned on batch creation
  metadata?: Record<string, string | number | boolean>;
  warnings?: (string | ResponseWarning)[];
  // Additional fields.
  results_ready?: boolean;
  tasks?: BatchTaskCreated[];
  // Removed: updated_at, usage
}

export interface CreateBatchOptions {
  name?: string;
  mode?: DeepResearchBatchMode; // "instant" is not available for batches
  /** @deprecated Use `mode`. The SDK sends this value as `mode`. */
  model?: DeepResearchBatchMode;
  outputFormats?: DeepResearchOutputFormat[];
  search?: DeepResearchSearchConfig;
  webhookUrl?: string;
  metadata?: Record<string, string | number | boolean>;
  /** Tasks to create the batch with. Optional: without it the server opens an empty batch, and
   * you add tasks with batch.addTasks(). */
  tasks?: BatchTaskInput[];
}

export interface BatchTaskInput {
  id?: string; // Custom task identifier (for tracking)
  query?: string; // Research query or task description
  input?: string; // Deprecated: use query instead
  strategy?: string; // Deprecated: use researchStrategy instead
  researchStrategy?: string; // Natural language strategy to guide the research phase
  reportFormat?: string; // Natural language instructions for output format (highest priority)
  urls?: string[]; // Array of URLs to extract content from
  metadata?: Record<string, string | number | boolean>; // Custom metadata
  // Note: Tasks inherit model, output_formats, and search_params from batch
  // Tasks cannot override: model, output_formats, search_params
  // Tasks cannot use: deliverables, files, mcp_servers, code_execution, previous_reports, brand_collection_id, alert_email
}

export interface AddBatchTasksOptions {
  tasks: BatchTaskInput[];
}

export interface CreateBatchResponse {
  success: boolean;
  batch_id?: string;
  status?: BatchStatus;
  mode?: DeepResearchMode; // Renamed from 'model' in responses
  name?: string;
  output_formats?: DeepResearchOutputFormat[];
  search_params?: {
    search_type?: "all" | "web" | "proprietary";
    included_sources?: string[];
    excluded_sources?: string[];
    start_date?: string; // ISO date format (YYYY-MM-DD)
    end_date?: string; // ISO date format (YYYY-MM-DD)
    category?: string;
    country_code?: CountryCode; // Country code for location-filtered searches
  };
  created_at?: string; // ISO 8601 date-time string
  completed_at?: string; // ISO 8601 date-time string
  counts?: BatchCounts;
  cost?: number; // Replaces 'usage' object
  webhook_secret?: string; // Only returned on batch creation
  message?: string; // e.g. a DeepResearch concurrency-queue notice
  error?: string;
  /** Present when `error` was caused by a 429. */
  rateLimit?: RateLimitDetail;
}

export interface BatchStatusResponse {
  success: boolean;
  batch?: DeepResearchBatch;
  error?: string;
}

export interface BatchTaskCreated {
  task_id?: string;
  deepresearch_id: string;
  status: string;
}

export interface AddBatchTasksResponse {
  success: boolean;
  batch_id?: string;
  added?: number; // Number of tasks added
  tasks?: BatchTaskCreated[]; // Array of created tasks
  counts?: BatchCounts; // Updated batch counts
  message?: string; // e.g. a DeepResearch concurrency-queue notice
  error?: string;
  /** Present when `error` was caused by a 429. */
  rateLimit?: RateLimitDetail;
}

export interface BatchTaskListItem {
  deepresearch_id: string;
  task_id?: string;
  query: string; // Always use query in responses
  status: DeepResearchStatus;
  created_at: string; // ISO string
  completed_at?: string; // ISO string (optional)
  // Included when include_output=true
  output_type?: string;
  output?: string | Record<string, any>;
  sources?: any[];
  images?: any[];
  pdf_url?: string;
  deliverables?: any;
  error?: string;
  cost?: number;
}

export interface BatchPagination {
  count: number;
  last_key?: string;
  has_more: boolean;
}

export interface ListBatchTasksOptions {
  status?: DeepResearchStatus; // Filter by status
  limit?: number; // Maximum number of tasks to return
  lastKey?: string; // Pagination token from previous response
  includeOutput?: boolean; // Include full output and sources (default: false)
}

export interface ListBatchTasksResponse {
  success: boolean;
  batch_id?: string;
  tasks?: BatchTaskListItem[];
  pagination?: BatchPagination;
  error?: string;
}

export interface CancelBatchResponse {
  success: boolean;
  batch_id?: string;
  status?: BatchStatus; // Always "cancelled" when successful
  cancelled_count?: number; // Number of tasks cancelled
  message?: string; // Optional status message
  error?: string;
}

export interface ListBatchesOptions {
  limit?: number; // Maximum number of batches to return
}

export interface ListBatchesResponse {
  success: boolean;
  batches?: DeepResearchBatch[];
  error?: string;
}

export interface BatchWaitOptions {
  pollInterval?: number;
  maxWaitTime?: number;
  onProgress?: (batch: DeepResearchBatch) => void;
}

// Datasources API Types
export type DatasourceCategoryId =
  | "research"
  | "healthcare"
  | "patents"
  | "markets"
  | "company"
  | "economic"
  | "predictions"
  | "transportation"
  | "legal"
  | "politics";

export type DatasourceModality = "text" | "images" | "tabular";

export interface DatasourcePricing {
  cpm: number; // Cost per million tokens
}

export interface DatasourceCoverage {
  start_date?: string | null; // ISO 8601 date-time string
  end_date?: string | null; // ISO 8601 date-time string
}

export interface Datasource {
  id: string; // e.g., "valyu/valyu-arxiv"
  name: string;
  description: string;
  category: DatasourceCategoryId;
  type: string; // e.g., "paper", "dataset"
  modality: DatasourceModality[];
  topics: string[];
  languages?: string[];
  source?: string;
  example_queries: string[];
  pricing: DatasourcePricing;
  response_schema?: Record<string, any>; // JSON schema for parsing responses
  update_frequency?: string; // e.g., "Monthly", "Quarterly", "Realtime"
  size?: number; // Number of records/documents
  coverage?: DatasourceCoverage;
  required_plan?: { id: string; name: string; price: string } | null; // Cheapest plan that includes this dataset. null when licensed separately
  access_modes?: ("search" | "answer" | "deepresearch")[]; // Products this datasource can be used in
  geography?: Record<string, any>;
  capabilities?: Record<string, any>;
  data_source?: { provider?: string; license?: string };
}

export interface DatasourceCategory {
  id: string;
  name: string;
  description: string;
  dataset_count: number;
}

export interface DatasourcesListOptions {
  category?: DatasourceCategoryId;
}

export interface DatasourcesListResponse {
  success: boolean;
  datasources?: Datasource[];
  total_count?: number;
  error?: string;
}

export interface DatasourcesSearchOptions {
  limit?: number; // 1-100 (API default 20)
}

export interface DatasourceSearchResult extends Datasource {
  relevance_score?: number; // 0-1, best first
}

export interface DatasourcesSearchResponse {
  success: boolean;
  query?: string;
  search_mode?: "semantic" | "lexical";
  total_count?: number;
  results?: DatasourceSearchResult[];
  error?: string;
}

export interface DatasourcesCategoriesResponse {
  success: boolean;
  categories?: DatasourceCategory[];
  error?: string;
}

// Workflows API Types
// Workflows are templated DeepResearch starting points with typed {variable}
// placeholders and version history. Run one by passing workflowId to
// deepresearch.create().

export type WorkflowMode = "fast" | "standard" | "heavy" | "max";

export type WorkflowVariableType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "enum";

export interface WorkflowVariableValidation {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  enum?: string[];
}

export interface WorkflowVariable {
  key: string;
  label?: string;
  type?: WorkflowVariableType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  examples?: string[];
  validation?: WorkflowVariableValidation;
}

export interface WorkflowDeliverable {
  type: string;
  description?: string;
}

export interface WorkflowTools {
  code_execution?: boolean;
  screenshots?: boolean;
  browser_use?: boolean;
  charts?: boolean;
}

export interface Workflow {
  slug: string;
  version?: number;
  vertical?: string | null;
  tags?: string[];
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  popular?: boolean;
  recommended_mode?: WorkflowMode;
  estimated_time?: string | null;
  is_valyu?: boolean;
  owner_org_id?: string | null;
  variables?: WorkflowVariable[];
  deliverables?: WorkflowDeliverable[];
  created_at?: string;
  updated_at?: string;
  // Template fields — present on detail responses and list with expand=true
  prompt?: string;
  strategy?: string;
  report_format?: string;
  tools?: WorkflowTools;
  changelog?: string | null;
}

export interface WorkflowVersionSummary {
  version: number;
  recommended_mode?: WorkflowMode;
  estimated_time?: string | null;
  changelog?: string | null;
  created_at?: string;
  is_current?: boolean;
}

export interface WorkflowRunInfo {
  slug?: string;
  version?: number;
}

export interface ResolvedWorkflowTemplate {
  input?: string;
  research_strategy?: string;
  report_format?: string;
  deliverables?: WorkflowDeliverable[];
  mode?: WorkflowMode;
  tools?: WorkflowTools;
}

/** Template body for creating a workflow or publishing a new version. */
export interface WorkflowVersionInput {
  prompt: string;
  strategy: string;
  report_format: string;
  variables?: WorkflowVariable[];
  deliverables?: WorkflowDeliverable[];
  tools?: WorkflowTools;
  recommended_mode?: WorkflowMode;
  estimated_time?: string;
  changelog?: string;
}

export interface WorkflowsListOptions {
  vertical?: string;
  scope?: "valyu" | "org" | "all";
  q?: string;
  tags?: string[];
  limit?: number;
  expand?: boolean;
}

export interface WorkflowCreateOptions {
  slug: string;
  title: string;
  version: WorkflowVersionInput;
  subtitle?: string;
  description?: string;
  vertical?: string;
  tags?: string[];
  icon?: string;
}

export interface WorkflowUpdateOptions {
  title?: string;
  subtitle?: string;
  description?: string;
  vertical?: string;
  tags?: string[];
  icon?: string;
  version?: WorkflowVersionInput;
  setCurrent?: boolean;
}

export interface WorkflowPreviewOptions {
  workflowParams?: Record<string, any>;
  workflowVersion?: number;
}

export interface WorkflowsListResponse {
  success: boolean;
  workflows?: Workflow[];
  total?: number;
  next_cursor?: string | null;
  verticals?: string[];
  error?: string;
}

export interface WorkflowResponse {
  success: boolean;
  workflow?: Workflow;
  error?: string;
}

export interface WorkflowVersionsResponse {
  success: boolean;
  slug?: string;
  versions?: WorkflowVersionSummary[];
  error?: string;
}

export interface WorkflowPreviewResponse {
  success: boolean;
  workflow?: WorkflowRunInfo;
  resolved?: ResolvedWorkflowTemplate;
  estimated_credits?: number | null;
  error?: string;
}

export interface WorkflowDeleteResponse {
  success: boolean;
  slug?: string;
  deleted_at?: string;
  error?: string;
}
