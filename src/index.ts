import axios from 'axios';
import { SearchResponse, SearchType, FeedbackSentiment, FeedbackResponse } from './types';

export class Valyu {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(apiKey?: string, baseUrl: string = "https://api.valyu.network/v1") {
    if (!apiKey) {
      apiKey = process.env.VALYU_API_KEY;
      if (!apiKey) {
        throw new Error("VALYU_API_KEY is not set");
      }
    }
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    };
  }

  async context(
    query: string,
    options: {
      searchType?: string;
      maxNumResults?: number;
      queryRewrite?: boolean;
      similarityThreshold?: number;
      maxPrice?: number;
      dataSources?: string[];
    } = {}
  ): Promise<SearchResponse> {
    try {
      const defaultSearchType: SearchType = "all";
      const defaultMaxNumResults = 10;
      const defaultQueryRewrite = true;
      const defaultSimilarityThreshold = 0.4;
      const defaultMaxPrice = 1;

      let finalSearchType: SearchType = defaultSearchType;
      const providedSearchTypeString = options.searchType?.toLowerCase();

      if (providedSearchTypeString === "web" || providedSearchTypeString === "proprietary" || providedSearchTypeString === "all") {
        finalSearchType = providedSearchTypeString as SearchType;
      } else if (options.searchType !== undefined) {
        return {
          success: false,
          error: "Invalid searchType provided. Must be one of: all, web, proprietary",
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0
        };
      }

      const payload: Record<string, any> = {
        query,
        search_type: finalSearchType,
        max_num_results: options.maxNumResults ?? defaultMaxNumResults,
        query_rewrite: options.queryRewrite ?? defaultQueryRewrite,
        similarity_threshold: options.similarityThreshold ?? defaultSimilarityThreshold,
        max_price: options.maxPrice ?? defaultMaxPrice,
      };

      if (options.dataSources !== undefined) {
        payload.data_sources = options.dataSources;
      }

      const response = await axios.post(
        `${this.baseUrl}/knowledge`,
        payload,
        { headers: this.headers }
      );

      if (!response.status || response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: response.data?.error,
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0
        };
      }

      return response.data;
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        tx_id: null,
        query,
        results: [],
        results_by_source: { web: 0, proprietary: 0 },
        total_deduction_pcm: 0.0,
        total_deduction_dollars: 0.0,
        total_characters: 0
      };
    }
  }

  async feedback({
    tx_id,
    feedback,
    sentiment
  }: {
    tx_id: string;
    feedback: string;
    sentiment: FeedbackSentiment;
  }): Promise<FeedbackResponse> {
    try {
      const payload = {
        tx_id,
        feedback,
        sentiment
      };

      const response = await axios.post(
        `${this.baseUrl}/feedback`,
        payload,
        { headers: this.headers }
      );

      if (!response.status || response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: response.data?.error
        };
      }

      return response.data;
    } catch (e: any) {
      return {
        success: false,
        error: e.message
      };
    }
  }
}

export type { 
  SearchResponse, 
  SearchType, 
  FeedbackSentiment, 
  FeedbackResponse 
} from './types'; 