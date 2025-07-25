export type SearchType = "web" | "proprietary" | "all";
export type FeedbackSentiment = "very good" | "good" | "bad" | "very bad";
export type DataType = "structured" | "unstructured";

export type CountryCode = 
  | "ALL" | "AR" | "AU" | "AT" | "BE" | "BR" | "CA" | "CL" | "DK" | "FI" 
  | "FR" | "DE" | "HK" | "IN" | "ID" | "IT" | "JP" | "KR" | "MY" | "MX" 
  | "NL" | "NZ" | "NO" | "CN" | "PL" | "PT" | "PH" | "RU" | "SA" | "ZA" 
  | "ES" | "SE" | "CH" | "TW" | "TR" | "GB" | "US";

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