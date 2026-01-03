export type SearchType = "web" | "proprietary" | "all" | "news";
export type FeedbackSentiment = "very good" | "good" | "bad" | "very bad";
export type DataType = "structured" | "unstructured";

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

export interface SearchResult {
  title: string;
  url: string;
  content: string | object | any[];  // Can be string, object, or array for structured data
  description?: string;
  source: string;
  source_type?: string;  // "website", "data", "forum"
  data_type?: DataType;
  date?: string;
  length: number;
  relevance_score?: number;
  publication_date?: string;
  id?: string;
  image_url?: Record<string, string>;
}

export interface SearchOptions {
  searchType?: SearchType;
  maxNumResults?: number;
  maxPrice?: number;
  isToolCall?: boolean;
  relevanceThreshold?: number;
  includedSources?: string[];
  excludeSources?: string[];
  category?: string;
  startDate?: string;
  endDate?: string;
  countryCode?: CountryCode;
  responseLength?: ResponseLength;
  fastMode?: boolean;
  urlOnly?: boolean;
}

export interface SearchResponse {
  success: boolean;
  error?: string;
  tx_id: string | null;
  query: string;
  results: SearchResult[];
  results_by_source: {
    web: number;
    proprietary: number;
  };
  total_deduction_pcm: number;
  total_deduction_dollars: number;
  total_characters: number;
}

export interface FeedbackResponse {
  success: boolean;
  error?: string;
}

// Contents API Types
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
}

export interface ContentResult {
  url: string;
  title: string;
  content: string | number;
  length: number;
  source: string;
  summary?: string | object;
  summary_success?: boolean;
  data_type?: string;
  image_url?: Record<string, string>;
  citation?: string;
}

export interface ContentsResponse {
  success: boolean;
  error?: string | null;
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
  streaming?: boolean;  // Default: false - when true, returns AsyncGenerator
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

export interface AnswerSuccessResponse {
  success: true;
  tx_id: string;
  original_query: string;
  contents: string | Record<string, any>;
  data_type: "structured" | "unstructured";
  search_results: SearchResult[];
  search_metadata: SearchMetadata;
  ai_usage: AIUsage;
  cost: Cost;
  extraction_metadata?: ExtractionMetadata;
}

export interface AnswerErrorResponse {
  success: false;
  error: string;
}

export type AnswerResponse = AnswerSuccessResponse | AnswerErrorResponse;

// Streaming Types for Answer API
export type AnswerStreamChunkType = "search_results" | "content" | "metadata" | "done" | "error";

export interface AnswerStreamChunk {
  type: AnswerStreamChunkType;

  // For type="search_results"
  search_results?: SearchResult[];

  // For type="content"
  content?: string;
  finish_reason?: string;

  // For type="metadata"
  tx_id?: string;
  original_query?: string;
  data_type?: "structured" | "unstructured";
  search_metadata?: SearchMetadata;
  ai_usage?: AIUsage;
  cost?: Cost;
  extraction_metadata?: ExtractionMetadata;

  // For type="error"
  error?: string;
}

// DeepResearch API Types
export type DeepResearchMode = "fast" | "standard" | "lite" | "heavy"; // "lite" is deprecated, use "standard" instead
export type DeepResearchStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type DeepResearchOutputFormat = "markdown" | "pdf" | Record<string, any>;
export type DeepResearchOutputType = "markdown" | "json";
export type ImageType = "chart" | "ai_generated";
export type ChartType = "line" | "bar" | "area";

export interface FileAttachment {
  data: string;
  filename: string;
  mediaType: string;
  context?: string;
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

export type DeliverableType = "csv" | "xlsx" | "pptx" | "docx" | "pdf";
export type DeliverableStatus = "completed" | "failed";

export interface Deliverable {
  type: DeliverableType;
  description: string;
  columns?: string[];
  includeHeaders?: boolean;
  sheetName?: string;
  slides?: number;
  template?: string;
}

export interface DeliverableResult {
  id: string;
  request: string;
  type: DeliverableType | "unknown";
  status: DeliverableStatus;
  title: string;
  description?: string;
  url: string;
  s3_key: string;
  row_count?: number;
  column_count?: number;
  error?: string;
  created_at: number;
}

export interface DeepResearchSearchConfig {
  searchType?: "all" | "web" | "proprietary";
  includedSources?: string[];
}

export interface DeepResearchCreateOptions {
  input: string;
  model?: DeepResearchMode;
  outputFormats?: DeepResearchOutputFormat[];
  strategy?: string;
  search?: DeepResearchSearchConfig;
  urls?: string[];
  files?: FileAttachment[];
  deliverables?: (string | Deliverable)[];
  mcpServers?: MCPServerConfig[];
  codeExecution?: boolean;
  previousReports?: string[];
  webhookUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Progress {
  current_step: number;
  total_steps: number;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
}

export interface ChartDataSeries {
  name: string;
  data: ChartDataPoint[];
}

export interface ImageMetadata {
  image_id: string;
  image_type: ImageType;
  deepresearch_id: string;
  title: string;
  description?: string;
  image_url: string;
  s3_key: string;
  created_at: number;
  chart_type?: ChartType;
  x_axis_label?: string;
  y_axis_label?: string;
  data_series?: ChartDataSeries[];
}

export interface DeepResearchSource {
  title: string;
  url: string;
  snippet?: string;
  description?: string;
  source?: string;
  org_id?: string;
  price?: number;
  id?: string;
  doc_id?: number;
  doi?: string;
  category?: string;
  source_id?: number;
  word_count?: number;
}

export interface DeepResearchUsage {
  search_cost: number;
  contents_cost: number;
  ai_cost: number;
  compute_cost: number;
  total_cost: number;
}

export interface DeepResearchCreateResponse {
  success: boolean;
  deepresearch_id?: string;
  status?: DeepResearchStatus;
  model?: DeepResearchMode;
  created_at?: string;
  metadata?: Record<string, string | number | boolean>;
  public?: boolean;
  webhook_secret?: string;
  message?: string;
  error?: string;
}

export interface DeepResearchStatusResponse {
  success: boolean;
  deepresearch_id?: string;
  status?: DeepResearchStatus;
  query?: string;
  mode?: DeepResearchMode;
  output_formats?: DeepResearchOutputFormat[];
  created_at?: number;
  public?: boolean;
  progress?: Progress;
  messages?: any[];
  completed_at?: number;
  output?: string | Record<string, any>;
  output_type?: DeepResearchOutputType;
  pdf_url?: string;
  images?: ImageMetadata[];
  deliverables?: DeliverableResult[];
  sources?: DeepResearchSource[];
  usage?: DeepResearchUsage;
  error?: string;
}

export interface DeepResearchTaskListItem {
  deepresearch_id: string;
  query: string;
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
}

export interface DeepResearchCancelResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  error?: string;
}

export interface DeepResearchDeleteResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  error?: string;
}

export interface DeepResearchTogglePublicResponse {
  success: boolean;
  message?: string;
  deepresearch_id?: string;
  public?: boolean;
  error?: string;
}

export interface WaitOptions {
  pollInterval?: number;
  maxWaitTime?: number;
  onProgress?: (status: DeepResearchStatusResponse) => void;
}

export interface StreamCallback {
  onMessage?: (message: any) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (result: DeepResearchStatusResponse) => void;
  onError?: (error: Error) => void;
}

export interface ListOptions {
  apiKeyId: string;
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

export interface BatchUsage {
  search_cost: number;
  contents_cost: number;
  ai_cost: number;
  total_cost: number;
}

export interface DeepResearchBatch {
  batch_id: string;
  organisation_id: string;
  api_key_id: string;
  credit_id: string;
  name?: string;
  status: BatchStatus;
  model: DeepResearchMode;
  output_formats?: DeepResearchOutputFormat[];
  search_params?: {
    search_type?: "all" | "web" | "proprietary";
    included_sources?: string[];
  };
  counts: BatchCounts;
  usage: BatchUsage;
  webhook_url?: string;
  webhook_secret?: string;
  created_at: number;
  updated_at: number;
  completed_at?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface CreateBatchOptions {
  name?: string;
  model?: DeepResearchMode;
  outputFormats?: DeepResearchOutputFormat[];
  search?: {
    searchType?: "all" | "web" | "proprietary";
    includedSources?: string[];
  };
  webhookUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface BatchTaskInput {
  id?: string;
  input: string;
  strategy?: string;
  urls?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface AddBatchTasksOptions {
  tasks: BatchTaskInput[];
}

export interface CreateBatchResponse {
  success: boolean;
  batch_id?: string;
  status?: BatchStatus;
  webhook_secret?: string;
  error?: string;
}

export interface BatchStatusResponse {
  success: boolean;
  batch?: DeepResearchBatch;
  error?: string;
}

export interface AddBatchTasksResponse {
  success: boolean;
  added_count?: number;
  task_ids?: string[];
  error?: string;
}

export interface BatchTaskListItem {
  deepresearch_id: string;
  batch_id: string;
  batch_task_id?: string;
  query: string;
  status: DeepResearchStatus;
  created_at: number;
  completed_at?: number;
  error?: string;
}

export interface ListBatchTasksResponse {
  success: boolean;
  tasks?: BatchTaskListItem[];
  total_count?: number;
  error?: string;
}

export interface CancelBatchResponse {
  success: boolean;
  message?: string;
  batch_id?: string;
  error?: string;
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
