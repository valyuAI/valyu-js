import axios from 'axios';
import { SearchResponse, SearchType, SearchOptions } from './types';

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

  /**
   * Validates date format (YYYY-MM-DD)
   */
  private validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
  }

  /**
   * Search for information using the Valyu DeepSearch API
   * @param query - The search query string
   * @param options - Search configuration options
   * @param options.searchType - Type of search: "web", "proprietary", or "all"
   * @param options.maxNumResults - Maximum number of results (1-20)
   * @param options.maxPrice - Maximum price per thousand characters (CPM)
   * @param options.isToolCall - Whether this is a tool call
   * @param options.relevanceThreshold - Minimum relevance score (0-1)
   * @param options.includedSources - List of specific sources to include
   * @param options.excludeSources - List of URLs/domains to exclude from search results
   * @param options.category - Category filter for search results
   * @param options.startDate - Start date filter (YYYY-MM-DD format)
   * @param options.endDate - End date filter (YYYY-MM-DD format)
   * @param options.countryCode - Country code filter for search results
   * @param options.responseLength - Response content length: "short"/"medium"/"large"/"max" or integer character count
   * @returns Promise resolving to search results
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    try {
      // Default values
      const defaultSearchType: SearchType = "all";
      const defaultMaxNumResults = 10;
      const defaultIsToolCall = true;
      const defaultRelevanceThreshold = 0.5;
      const defaultMaxPrice = 30;

      // Validate searchType
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

      // Validate date formats
      if (options.startDate && !this.validateDateFormat(options.startDate)) {
        return {
          success: false,
          error: "Invalid startDate format. Must be YYYY-MM-DD",
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0
        };
      }

      if (options.endDate && !this.validateDateFormat(options.endDate)) {
        return {
          success: false,
          error: "Invalid endDate format. Must be YYYY-MM-DD",
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0
        };
      }

      // Validate maxNumResults range
      const maxNumResults = options.maxNumResults ?? defaultMaxNumResults;
      if (maxNumResults < 1 || maxNumResults > 20) {
        return {
          success: false,
          error: "maxNumResults must be between 1 and 20",
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0
        };
      }

      // Build payload with snake_case for API
      const payload: Record<string, any> = {
        query,
        search_type: finalSearchType,
        max_num_results: maxNumResults,
        is_tool_call: options.isToolCall ?? defaultIsToolCall,
        relevance_threshold: options.relevanceThreshold ?? defaultRelevanceThreshold,
        max_price: options.maxPrice ?? defaultMaxPrice,
      };

      // Add optional parameters only if provided
      if (options.includedSources !== undefined) {
        payload.included_sources = options.includedSources;
      }

      if (options.excludeSources !== undefined) {
        payload.exclude_sources = options.excludeSources;
      }

      if (options.category !== undefined) {
        payload.category = options.category;
      }

      if (options.startDate !== undefined) {
        payload.start_date = options.startDate;
      }

      if (options.endDate !== undefined) {
        payload.end_date = options.endDate;
      }

      if (options.countryCode !== undefined) {
        payload.country_code = options.countryCode;
      }

      if (options.responseLength !== undefined) {
        payload.response_length = options.responseLength;
      }

      const response = await axios.post(
        `${this.baseUrl}/deepsearch`,
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
        error: e.response?.data?.error || e.message,
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
}

export type { 
  SearchResponse, 
  SearchType, 
  FeedbackSentiment, 
  FeedbackResponse,
  SearchOptions,
  CountryCode,
  ResponseLength
} from './types'; 