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

  async context({
    query,
    searchType,
    maxNumResults = 10,
    queryRewrite = true,
    similarityThreshold = 0.4,
    maxPrice = 1,
    dataSources
  }: {
    query: string;
    searchType: SearchType;
    maxNumResults?: number;
    queryRewrite?: boolean;
    similarityThreshold?: number;
    maxPrice?: number;
    dataSources?: string[];
  }): Promise<SearchResponse> {
    try {
      const payload: Record<string, any> = {
        query,
        search_type: searchType,
        max_num_results: maxNumResults,
        query_rewrite: queryRewrite,
        similarity_threshold: similarityThreshold,
        max_price: maxPrice
      };

      if (dataSources !== undefined) {
        payload.data_sources = dataSources;
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