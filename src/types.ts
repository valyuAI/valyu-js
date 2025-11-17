export type SearchType = "web" | "proprietary" | "all";
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
  content: string;
  description?: string;
  source: string;
  price: number;
  length: number;
  relevance_score: number;
  data_type?: DataType;
  source_type?: string;
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
  ai_deduction_dollars: number;
}

export interface AnswerSuccessResponse {
  success: true;
  ai_tx_id: string;
  original_query: string;
  contents: string | Record<string, any>;
  data_type: "structured" | "unstructured";
  search_results: SearchResult[];
  search_metadata: SearchMetadata;
  ai_usage: AIUsage;
  cost: Cost;
}

export interface AnswerErrorResponse {
  success: false;
  error: string;
}

export type AnswerResponse = AnswerSuccessResponse | AnswerErrorResponse;
