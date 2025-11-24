import axios from "axios";
import {
  SearchResponse,
  SearchType,
  SearchOptions,
  ContentsOptions,
  ContentsResponse,
  AnswerOptions,
  AnswerResponse,
  DeepResearchCreateOptions,
  DeepResearchCreateResponse,
  DeepResearchStatusResponse,
  DeepResearchListResponse,
  DeepResearchUpdateResponse,
  DeepResearchCancelResponse,
  DeepResearchDeleteResponse,
  DeepResearchTogglePublicResponse,
  WaitOptions,
  StreamCallback,
  ListOptions,
} from "./types";


// Valyu API client
export class Valyu {
  private baseUrl: string;
  private headers: Record<string, string>;

  // DeepResearch namespace
  public deepresearch: {
    create: (options: DeepResearchCreateOptions) => Promise<DeepResearchCreateResponse>;
    status: (taskId: string) => Promise<DeepResearchStatusResponse>;
    wait: (taskId: string, options?: WaitOptions) => Promise<DeepResearchStatusResponse>;
    stream: (taskId: string, callback: StreamCallback) => Promise<void>;
    list: (options: ListOptions) => Promise<DeepResearchListResponse>;
    update: (taskId: string, instruction: string) => Promise<DeepResearchUpdateResponse>;
    cancel: (taskId: string) => Promise<DeepResearchCancelResponse>;
    delete: (taskId: string) => Promise<DeepResearchDeleteResponse>;
    togglePublic: (taskId: string, isPublic: boolean) => Promise<DeepResearchTogglePublicResponse>;
  };

  constructor(
    apiKey?: string,
    baseUrl: string = "https://api.valyu.ai/v1"
  ) {
    if (!apiKey) {
      apiKey = process.env.VALYU_API_KEY;
      if (!apiKey) {
        throw new Error("VALYU_API_KEY is not set");
      }
    }
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    };

    // Initialize DeepResearch namespace
    this.deepresearch = {
      create: this._deepresearchCreate.bind(this),
      status: this._deepresearchStatus.bind(this),
      wait: this._deepresearchWait.bind(this),
      stream: this._deepresearchStream.bind(this),
      list: this._deepresearchList.bind(this),
      update: this._deepresearchUpdate.bind(this),
      cancel: this._deepresearchCancel.bind(this),
      delete: this._deepresearchDelete.bind(this),
      togglePublic: this._deepresearchTogglePublic.bind(this),
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
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\/.+)?$/;
    return domainRegex.test(domain);
  }

  /**
   * Validates if a string is a valid dataset identifier (provider/datasetname)
   */
  private validateDatasetId(datasetId: string): boolean {
    // Dataset format: provider/datasetname (exactly one slash)
    // Provider and dataset name can contain alphanumeric, hyphens, underscores
    const parts = datasetId.split("/");
    if (parts.length !== 2) return false;

    const providerRegex = /^[a-zA-Z0-9_-]+$/;
    const datasetRegex = /^[a-zA-Z0-9_-]+$/;

    return (
      providerRegex.test(parts[0]) &&
      datasetRegex.test(parts[1]) &&
      parts[0].length > 0 &&
      parts[1].length > 0
    );
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
  private validateSources(sources: string[]): {
    valid: boolean;
    invalidSources: string[];
  } {
    const invalidSources: string[] = [];

    for (const source of sources) {
      if (!this.validateSource(source)) {
        invalidSources.push(source);
      }
    }

    return {
      valid: invalidSources.length === 0,
      invalidSources,
    };
  }

  /**
   * Search for information using the Valyu DeepSearch API
   * @param query - The search query string
   * @param options - Search configuration options
   * @param options.searchType - Type of search: "web", "proprietary", "all", or "news"
   * @param options.maxNumResults - Maximum number of results (1-100)
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
   * @param options.fastMode - Fast mode for quicker but shorter results (default: false)
   * @param options.urlOnly - Returns shortened snippets (default: false)
   * @returns Promise resolving to search results
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    try {
      // Default values
      const defaultSearchType: SearchType = "all";
      const defaultMaxNumResults = 10;
      const defaultIsToolCall = true;
      const defaultRelevanceThreshold = 0.5;

      // Validate searchType
      let finalSearchType: SearchType = defaultSearchType;
      const providedSearchTypeString = options.searchType?.toLowerCase();

      if (
        providedSearchTypeString === "web" ||
        providedSearchTypeString === "proprietary" ||
        providedSearchTypeString === "all" ||
        providedSearchTypeString === "news"
      ) {
        finalSearchType = providedSearchTypeString as SearchType;
      } else if (options.searchType !== undefined) {
        return {
          success: false,
          error:
            "Invalid searchType provided. Must be one of: all, web, proprietary, news",
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0,
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
          total_characters: 0,
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
          total_characters: 0,
        };
      }

      // Validate maxNumResults range
      const maxNumResults = options.maxNumResults ?? defaultMaxNumResults;
      if (maxNumResults < 1 || maxNumResults > 100) {
        return {
          success: false,
          error: "maxNumResults must be between 1 and 100",
          tx_id: null,
          query,
          results: [],
          results_by_source: { web: 0, proprietary: 0 },
          total_deduction_pcm: 0.0,
          total_deduction_dollars: 0.0,
          total_characters: 0,
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
            total_characters: 0,
          };
        }

        const includedSourcesValidation = this.validateSources(
          options.includedSources
        );
        if (!includedSourcesValidation.valid) {
          return {
            success: false,
            error: `Invalid includedSources format. Invalid sources: ${includedSourcesValidation.invalidSources.join(
              ", "
            )}. Sources must be valid URLs, domains (with optional paths), or dataset identifiers in 'provider/dataset' format.`,
            tx_id: null,
            query,
            results: [],
            results_by_source: { web: 0, proprietary: 0 },
            total_deduction_pcm: 0.0,
            total_deduction_dollars: 0.0,
            total_characters: 0,
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
            total_characters: 0,
          };
        }

        const excludeSourcesValidation = this.validateSources(
          options.excludeSources
        );
        if (!excludeSourcesValidation.valid) {
          return {
            success: false,
            error: `Invalid excludeSources format. Invalid sources: ${excludeSourcesValidation.invalidSources.join(
              ", "
            )}. Sources must be valid URLs, domains (with optional paths), or dataset identifiers in 'provider/dataset' format.`,
            tx_id: null,
            query,
            results: [],
            results_by_source: { web: 0, proprietary: 0 },
            total_deduction_pcm: 0.0,
            total_deduction_dollars: 0.0,
            total_characters: 0,
          };
        }
      }

      // Build payload with snake_case for API
      const payload: Record<string, any> = {
        query,
        search_type: finalSearchType,
        max_num_results: maxNumResults,
        is_tool_call: options.isToolCall ?? defaultIsToolCall,
        relevance_threshold:
          options.relevanceThreshold ?? defaultRelevanceThreshold,
      };

      // Add maxPrice only if explicitly provided
      if (options.maxPrice !== undefined) {
        payload.max_price = options.maxPrice;
      }

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

      if (options.fastMode !== undefined) {
        payload.fast_mode = options.fastMode;
      }

      if (options.urlOnly !== undefined) {
        payload.url_only = options.urlOnly;
      }

      const response = await axios.post(`${this.baseUrl}/deepsearch`, payload, {
        headers: this.headers,
      });

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
          total_characters: 0,
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
        total_characters: 0,
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
  async contents(
    urls: string[],
    options: ContentsOptions = {}
  ): Promise<ContentsResponse> {
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
          total_characters: 0,
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
          total_characters: 0,
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
          total_characters: 0,
        };
      }

      // Validate extractEffort if provided
      if (
        options.extractEffort &&
        !["normal", "high", "auto"].includes(options.extractEffort)
      ) {
        return {
          success: false,
          error: "extractEffort must be 'normal', 'high', or 'auto'",
          urls_requested: urls.length,
          urls_processed: 0,
          urls_failed: urls.length,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0,
        };
      }

      // Validate responseLength if provided
      if (options.responseLength !== undefined) {
        const validLengths = ["short", "medium", "large", "max"];
        if (
          typeof options.responseLength === "string" &&
          !validLengths.includes(options.responseLength)
        ) {
          return {
            success: false,
            error:
              "responseLength must be 'short', 'medium', 'large', 'max', or a number",
            urls_requested: urls.length,
            urls_processed: 0,
            urls_failed: urls.length,
            results: [],
            total_cost_dollars: 0,
            total_characters: 0,
          };
        }
        if (
          typeof options.responseLength === "number" &&
          options.responseLength <= 0
        ) {
          return {
            success: false,
            error: "responseLength number must be positive",
            urls_requested: urls.length,
            urls_processed: 0,
            urls_failed: urls.length,
            results: [],
            total_cost_dollars: 0,
            total_characters: 0,
          };
        }
      }

      // Build payload with snake_case for API
      const payload: Record<string, any> = {
        urls,
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

      const response = await axios.post(`${this.baseUrl}/contents`, payload, {
        headers: this.headers,
      });

      if (!response.status || response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: response.data?.error || "Request failed",
          urls_requested: urls.length,
          urls_processed: 0,
          urls_failed: urls.length,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0,
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
        total_characters: 0,
      };
    }
  }

  /**
   * DeepResearch: Create a new research task
   */
  private async _deepresearchCreate(
    options: DeepResearchCreateOptions
  ): Promise<DeepResearchCreateResponse> {
    try {
      // Validation
      if (!options.input?.trim()) {
        return {
          success: false,
          error: "input is required and cannot be empty",
        };
      }

      // Build payload with snake_case
      const payload: Record<string, any> = {
        input: options.input,
        model: options.model || "lite",
        output_formats: options.outputFormats || ["markdown"],
        code_execution: options.codeExecution !== false,
      };

      // Add optional fields
      if (options.strategy) payload.strategy = options.strategy;
      if (options.search) {
        payload.search = {
          search_type: options.search.searchType,
          included_sources: options.search.includedSources,
        };
      }
      if (options.urls) payload.urls = options.urls;
      if (options.files) payload.files = options.files;
      if (options.mcpServers) payload.mcp_servers = options.mcpServers;
      if (options.previousReports) {
        payload.previous_reports = options.previousReports;
      }
      if (options.webhookUrl) payload.webhook_url = options.webhookUrl;
      if (options.metadata) payload.metadata = options.metadata;

      const response = await axios.post(
        `${this.baseUrl}/deepresearch/tasks`,
        payload,
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Get task status
   */
  private async _deepresearchStatus(
    taskId: string
  ): Promise<DeepResearchStatusResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/deepresearch/tasks/${taskId}/status`,
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Wait for task completion with polling
   */
  private async _deepresearchWait(
    taskId: string,
    options: WaitOptions = {}
  ): Promise<DeepResearchStatusResponse> {
    const pollInterval = options.pollInterval || 5000;
    const maxWaitTime = options.maxWaitTime || 3600000;
    const startTime = Date.now();

    while (true) {
      const status = await this._deepresearchStatus(taskId);

      if (!status.success) {
        throw new Error(status.error);
      }

      // Notify progress callback
      if (options.onProgress) {
        options.onProgress(status);
      }

      // Terminal states
      if (
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "cancelled"
      ) {
        return status;
      }

      // Check timeout
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error("Maximum wait time exceeded");
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * DeepResearch: Stream real-time updates
   */
  private async _deepresearchStream(
    taskId: string,
    callback: StreamCallback
  ): Promise<void> {
    let isComplete = false;
    let lastMessageCount = 0;

    while (!isComplete) {
      try {
        const status = await this._deepresearchStatus(taskId);

        if (!status.success) {
          if (callback.onError) {
            callback.onError(new Error(status.error));
          }
          return;
        }

        // Progress updates
        if (status.progress && callback.onProgress) {
          callback.onProgress(
            status.progress.current_step,
            status.progress.total_steps
          );
        }

        // New messages
        if (status.messages && callback.onMessage) {
          const newMessages = status.messages.slice(lastMessageCount);
          newMessages.forEach((msg) => callback.onMessage!(msg));
          lastMessageCount = status.messages.length;
        }

        // Terminal states
        if (status.status === "completed") {
          if (callback.onComplete) {
            callback.onComplete(status);
          }
          isComplete = true;
        } else if (
          status.status === "failed" ||
          status.status === "cancelled"
        ) {
          if (callback.onError) {
            callback.onError(
              new Error(status.error || `Task ${status.status}`)
            );
          }
          isComplete = true;
        }

        if (!isComplete) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error: any) {
        if (callback.onError) {
          callback.onError(error);
        }
        throw error;
      }
    }
  }

  /**
   * DeepResearch: List all tasks
   */
  private async _deepresearchList(
    options: ListOptions
  ): Promise<DeepResearchListResponse> {
    try {
      const limit = options.limit || 10;
      const response = await axios.get(
        `${this.baseUrl}/deepresearch/listtasks?api_key_id=${options.apiKeyId}&limit=${limit}`,
        { headers: this.headers }
      );

      return { success: true, data: response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Add follow-up instruction
   */
  private async _deepresearchUpdate(
    taskId: string,
    instruction: string
  ): Promise<DeepResearchUpdateResponse> {
    try {
      if (!instruction?.trim()) {
        return {
          success: false,
          error: "instruction is required and cannot be empty",
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/deepresearch/tasks/${taskId}/update`,
        { instruction },
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Cancel task
   */
  private async _deepresearchCancel(
    taskId: string
  ): Promise<DeepResearchCancelResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/deepresearch/tasks/${taskId}/cancel`,
        {},
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Delete task
   */
  private async _deepresearchDelete(
    taskId: string
  ): Promise<DeepResearchDeleteResponse> {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/deepresearch/tasks/${taskId}/delete`,
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Toggle public flag
   */
  private async _deepresearchTogglePublic(
    taskId: string,
    isPublic: boolean
  ): Promise<DeepResearchTogglePublicResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/deepresearch/tasks/${taskId}/public`,
        { public: isPublic },
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * Get AI-powered answers using the Valyu Answer API
   * @param query - The question or query string
   * @param options - Answer configuration options
   * @param options.structuredOutput - JSON Schema object for structured responses
   * @param options.systemInstructions - Custom system-level instructions (max 2000 chars)
   * @param options.searchType - Type of search: "web", "proprietary", "all", or "news"
   * @param options.dataMaxPrice - Maximum spend (USD) for data retrieval
   * @param options.countryCode - Country code filter for search results
   * @param options.includedSources - List of specific sources to include
   * @param options.excludedSources - List of URLs/domains to exclude from search results
   * @param options.startDate - Start date filter (YYYY-MM-DD format)
   * @param options.endDate - End date filter (YYYY-MM-DD format)
   * @param options.fastMode - Fast mode for quicker but shorter results (default: false)
   * @returns Promise resolving to answer response
   */
  async answer(
    query: string,
    options: AnswerOptions = {}
  ): Promise<AnswerResponse> {
    try {
      // Default values
      const defaultSearchType: SearchType = "all";

      // Validate query
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return {
          success: false,
          error: "Query is required and must be a non-empty string",
        };
      }

      // Validate searchType
      let finalSearchType: SearchType = defaultSearchType;
      const providedSearchTypeString = options.searchType?.toLowerCase();

      if (
        providedSearchTypeString === "web" ||
        providedSearchTypeString === "proprietary" ||
        providedSearchTypeString === "all" ||
        providedSearchTypeString === "news"
      ) {
        finalSearchType = providedSearchTypeString as SearchType;
      } else if (options.searchType !== undefined) {
        return {
          success: false,
          error:
            "Invalid searchType provided. Must be one of: all, web, proprietary, news",
        };
      }

      // Validate systemInstructions length
      if (options.systemInstructions !== undefined) {
        if (typeof options.systemInstructions !== "string") {
          return {
            success: false,
            error: "systemInstructions must be a string",
          };
        }

        const trimmed = options.systemInstructions.trim();
        if (trimmed.length === 0) {
          return {
            success: false,
            error: "systemInstructions cannot be empty when provided",
          };
        }

        if (trimmed.length > 2000) {
          return {
            success: false,
            error: "systemInstructions must be 2000 characters or less",
          };
        }
      }

      // Validate dataMaxPrice
      if (options.dataMaxPrice !== undefined) {
        if (
          typeof options.dataMaxPrice !== "number" ||
          options.dataMaxPrice <= 0
        ) {
          return {
            success: false,
            error: "dataMaxPrice must be a positive number",
          };
        }
      }

      // Validate date formats
      if (options.startDate && !this.validateDateFormat(options.startDate)) {
        return {
          success: false,
          error: "Invalid startDate format. Must be YYYY-MM-DD",
        };
      }

      if (options.endDate && !this.validateDateFormat(options.endDate)) {
        return {
          success: false,
          error: "Invalid endDate format. Must be YYYY-MM-DD",
        };
      }

      // Validate date order
      if (options.startDate && options.endDate) {
        const startDate = new Date(options.startDate);
        const endDate = new Date(options.endDate);
        if (startDate > endDate) {
          return {
            success: false,
            error: "startDate must be before endDate",
          };
        }
      }

      // Validate includedSources format
      if (options.includedSources !== undefined) {
        if (!Array.isArray(options.includedSources)) {
          return {
            success: false,
            error: "includedSources must be an array",
          };
        }

        const includedSourcesValidation = this.validateSources(
          options.includedSources
        );
        if (!includedSourcesValidation.valid) {
          return {
            success: false,
            error: `Invalid includedSources format. Invalid sources: ${includedSourcesValidation.invalidSources.join(
              ", "
            )}. Sources must be valid URLs, domains (with optional paths), or dataset identifiers in 'provider/dataset' format.`,
          };
        }
      }

      // Validate excludedSources format
      if (options.excludedSources !== undefined) {
        if (!Array.isArray(options.excludedSources)) {
          return {
            success: false,
            error: "excludedSources must be an array",
          };
        }

        const excludedSourcesValidation = this.validateSources(
          options.excludedSources
        );
        if (!excludedSourcesValidation.valid) {
          return {
            success: false,
            error: `Invalid excludedSources format. Invalid sources: ${excludedSourcesValidation.invalidSources.join(
              ", "
            )}. Sources must be valid URLs, domains (with optional paths), or dataset identifiers in 'provider/dataset' format.`,
          };
        }
      }

      // Build payload with snake_case for API
      const payload: Record<string, any> = {
        query: query.trim(),
        search_type: finalSearchType,
      };

      // Add dataMaxPrice only if explicitly provided
      if (options.dataMaxPrice !== undefined) {
        payload.data_max_price = options.dataMaxPrice;
      }

      // Add optional parameters only if provided
      if (options.structuredOutput !== undefined) {
        payload.structured_output = options.structuredOutput;
      }

      if (options.systemInstructions !== undefined) {
        payload.system_instructions = options.systemInstructions.trim();
      }

      if (options.countryCode !== undefined) {
        payload.country_code = options.countryCode;
      }

      if (options.includedSources !== undefined) {
        payload.included_sources = options.includedSources;
      }

      if (options.excludedSources !== undefined) {
        payload.excluded_sources = options.excludedSources;
      }

      if (options.startDate !== undefined) {
        payload.start_date = options.startDate;
      }

      if (options.endDate !== undefined) {
        payload.end_date = options.endDate;
      }

      if (options.fastMode !== undefined) {
        payload.fast_mode = options.fastMode;
      }

      const response = await axios.post(`${this.baseUrl}/answer`, payload, {
        headers: this.headers,
      });

      if (!response.status || response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: response.data?.error || "Request failed",
        };
      }

      return response.data;
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
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
  ContentResponseLength,
  AnswerOptions,
  AnswerResponse,
  AnswerSuccessResponse,
  AnswerErrorResponse,
  SearchMetadata,
  AIUsage,
  Cost,
  DeepResearchMode,
  DeepResearchStatus,
  DeepResearchOutputFormat,
  ImageType,
  ChartType,
  FileAttachment,
  MCPServerConfig,
  DeepResearchSearchConfig,
  DeepResearchCreateOptions,
  Progress,
  ChartDataPoint,
  ChartDataSeries,
  ImageMetadata,
  DeepResearchSource,
  DeepResearchUsage,
  DeepResearchCreateResponse,
  DeepResearchStatusResponse,
  DeepResearchTaskListItem,
  DeepResearchListResponse,
  DeepResearchUpdateResponse,
  DeepResearchCancelResponse,
  DeepResearchDeleteResponse,
  DeepResearchTogglePublicResponse,
  WaitOptions,
  StreamCallback,
  ListOptions,
} from "./types";
