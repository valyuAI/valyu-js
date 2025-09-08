import axios from 'axios';
import { SearchResponse, SearchType, SearchOptions, ContentsOptions, ContentsResponse } from './types';

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
   * Validates if a string is a valid URL
   */
  private validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates if a string is a valid domain (with optional path)
   */
  private validateDomain(domain: string): boolean {
    // Domain must have at least one dot and valid structure
    // Supports: example.com, example.com/path, subdomain.example.com/path/to/resource
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\/.+)?$/;
    return domainRegex.test(domain);
  }

  /**
   * Validates if a string is a valid dataset identifier (provider/datasetname)
   */
  private validateDatasetId(datasetId: string): boolean {
    // Dataset format: provider/datasetname (exactly one slash)
    // Provider and dataset name can contain alphanumeric, hyphens, underscores
    const parts = datasetId.split('/');
    if (parts.length !== 2) return false;
    
    const providerRegex = /^[a-zA-Z0-9_-]+$/;
    const datasetRegex = /^[a-zA-Z0-9_-]+$/;
    
    return providerRegex.test(parts[0]) && datasetRegex.test(parts[1]) && parts[0].length > 0 && parts[1].length > 0;
  }

  /**
   * Validates source strings (domains, URLs, or dataset IDs)
   */
  private validateSource(source: string): boolean {
    // Check if it's a valid URL
    if (this.validateUrl(source)) {
      return true;
    }
    
    // Check if it's a valid domain (with optional path)
    if (this.validateDomain(source)) {
      return true;
    }
    
    // Check if it's a valid dataset identifier
    if (this.validateDatasetId(source)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validates an array of source strings
   */
  private validateSources(sources: string[]): { valid: boolean; invalidSources: string[] } {
    const invalidSources: string[] = [];
    
    for (const source of sources) {
      if (!this.validateSource(source)) {
        invalidSources.push(source);
      }
    }
    
    return {
      valid: invalidSources.length === 0,
      invalidSources
    };
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

      // Validate includedSources format
      if (options.includedSources !== undefined) {
        if (!Array.isArray(options.includedSources)) {
          return {
            success: false,
            error: "includedSources must be an array",
            tx_id: null,
            query,
            results: [],
            results_by_source: { web: 0, proprietary: 0 },
            total_deduction_pcm: 0.0,
            total_deduction_dollars: 0.0,
            total_characters: 0
          };
        }

        const includedSourcesValidation = this.validateSources(options.includedSources);
        if (!includedSourcesValidation.valid) {
          return {
            success: false,
            error: `Invalid includedSources format. Invalid sources: ${includedSourcesValidation.invalidSources.join(', ')}. Sources must be valid URLs, domains (with optional paths), or dataset identifiers in 'provider/dataset' format.`,
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

      // Validate excludeSources format
      if (options.excludeSources !== undefined) {
        if (!Array.isArray(options.excludeSources)) {
          return {
            success: false,
            error: "excludeSources must be an array",
            tx_id: null,
            query,
            results: [],
            results_by_source: { web: 0, proprietary: 0 },
            total_deduction_pcm: 0.0,
            total_deduction_dollars: 0.0,
            total_characters: 0
          };
        }

        const excludeSourcesValidation = this.validateSources(options.excludeSources);
        if (!excludeSourcesValidation.valid) {
          return {
            success: false,
            error: `Invalid excludeSources format. Invalid sources: ${excludeSourcesValidation.invalidSources.join(', ')}. Sources must be valid URLs, domains (with optional paths), or dataset identifiers in 'provider/dataset' format.`,
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

  /**
   * Extract content from URLs with optional AI processing
   * @param urls - Array of URLs to process (max 10)
   * @param options - Content extraction configuration options
   * @param options.summary - AI summary configuration: false (raw), true (auto), string (custom), or JSON schema
   * @param options.extractEffort - Extraction thoroughness: "normal" or "high"
   * @param options.responseLength - Content length per URL
   * @param options.maxPriceDollars - Maximum cost limit in USD
   * @returns Promise resolving to content extraction results
   */
  async contents(urls: string[], options: ContentsOptions = {}): Promise<ContentsResponse> {
    try {
      // Validate URLs array
      if (!urls || !Array.isArray(urls)) {
        return {
          success: false,
          error: "urls must be an array",
          urls_requested: 0,
          urls_processed: 0,
          urls_failed: 0,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0
        };
      }

      if (urls.length === 0) {
        return {
          success: false,
          error: "urls array cannot be empty",
          urls_requested: 0,
          urls_processed: 0,
          urls_failed: 0,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0
        };
      }

      if (urls.length > 10) {
        return {
          success: false,
          error: "Maximum 10 URLs allowed per request",
          urls_requested: urls.length,
          urls_processed: 0,
          urls_failed: urls.length,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0
        };
      }

      // Validate extractEffort if provided
      if (options.extractEffort && !["normal", "high", "auto"].includes(options.extractEffort)) {
        return {
          success: false,
          error: "extractEffort must be 'normal', 'high', or 'auto'",
          urls_requested: urls.length,
          urls_processed: 0,
          urls_failed: urls.length,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0
        };
      }

      // Validate responseLength if provided
      if (options.responseLength !== undefined) {
        const validLengths = ["short", "medium", "large", "max"];
        if (typeof options.responseLength === "string" && !validLengths.includes(options.responseLength)) {
          return {
            success: false,
            error: "responseLength must be 'short', 'medium', 'large', 'max', or a number",
            urls_requested: urls.length,
            urls_processed: 0,
            urls_failed: urls.length,
            results: [],
            total_cost_dollars: 0,
            total_characters: 0
          };
        }
        if (typeof options.responseLength === "number" && options.responseLength <= 0) {
          return {
            success: false,
            error: "responseLength number must be positive",
            urls_requested: urls.length,
            urls_processed: 0,
            urls_failed: urls.length,
            results: [],
            total_cost_dollars: 0,
            total_characters: 0
          };
        }
      }

      // Build payload with snake_case for API
      const payload: Record<string, any> = {
        urls
      };

      // Add optional parameters only if provided
      if (options.summary !== undefined) {
        payload.summary = options.summary;
      }

      if (options.extractEffort !== undefined) {
        payload.extract_effort = options.extractEffort;
      }

      if (options.responseLength !== undefined) {
        payload.response_length = options.responseLength;
      }

      if (options.maxPriceDollars !== undefined) {
        payload.max_price_dollars = options.maxPriceDollars;
      }

      const response = await axios.post(
        `${this.baseUrl}/contents`,
        payload,
        { headers: this.headers }
      );

      if (!response.status || response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: response.data?.error || "Request failed",
          urls_requested: urls.length,
          urls_processed: 0,
          urls_failed: urls.length,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0
        };
      }

      return response.data;
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
        urls_requested: urls.length,
        urls_processed: 0,
        urls_failed: urls.length,
        results: [],
        total_cost_dollars: 0,
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
  ResponseLength,
  ContentsOptions,
  ContentsResponse,
  ContentResult,
  ExtractEffort,
  ContentResponseLength
} from './types'; 