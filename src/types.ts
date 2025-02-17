export type SearchType = "web" | "proprietary";
export type FeedbackSentiment = "very good" | "good" | "bad" | "very bad";

export interface SearchResponse {
  success: boolean;
  error?: string;
  tx_id: string | null;
  query: string;
  results: Array<any>;
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