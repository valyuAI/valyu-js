import axios from "axios";
import {
  SearchResponse,
  SearchType,
  SearchOptions,
  ContentsOptions,
  ContentsResponse,
  AnswerOptions,
  AnswerResponse,
  AnswerSuccessResponse,
  AnswerStreamChunk,
  SearchResult,
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
  CreateBatchOptions,
  CreateBatchResponse,
  BatchStatusResponse,
  AddBatchTasksOptions,
  AddBatchTasksResponse,
  ListBatchTasksResponse,
  CancelBatchResponse,
  ListBatchesResponse,
  BatchWaitOptions,
  DeepResearchBatch,
} from "./types";

// Valyu API client
export class Valyu {
  private baseUrl: string;
  private headers: Record<string, string>;

  // DeepResearch namespace
  public deepresearch: {
    create: (
      options: DeepResearchCreateOptions
    ) => Promise<DeepResearchCreateResponse>;
    status: (taskId: string) => Promise<DeepResearchStatusResponse>;
    wait: (
      taskId: string,
      options?: WaitOptions
    ) => Promise<DeepResearchStatusResponse>;
    stream: (taskId: string, callback: StreamCallback) => Promise<void>;
    list: (options: ListOptions) => Promise<DeepResearchListResponse>;
    update: (
      taskId: string,
      instruction: string
    ) => Promise<DeepResearchUpdateResponse>;
    cancel: (taskId: string) => Promise<DeepResearchCancelResponse>;
    delete: (taskId: string) => Promise<DeepResearchDeleteResponse>;
    togglePublic: (
      taskId: string,
      isPublic: boolean
    ) => Promise<DeepResearchTogglePublicResponse>;
  };

  // Batch API namespace
  public batch: {
    create: (options?: CreateBatchOptions) => Promise<CreateBatchResponse>;
    status: (batchId: string) => Promise<BatchStatusResponse>;
    addTasks: (
      batchId: string,
      options: AddBatchTasksOptions
    ) => Promise<AddBatchTasksResponse>;
    listTasks: (batchId: string) => Promise<ListBatchTasksResponse>;
    cancel: (batchId: string) => Promise<CancelBatchResponse>;
    list: () => Promise<ListBatchesResponse>;
    waitForCompletion: (
      batchId: string,
      options?: BatchWaitOptions
    ) => Promise<DeepResearchBatch>;
  };

  constructor(apiKey?: string, baseUrl: string = "https://api.valyu.ai/v1") {
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

    // Initialize Batch namespace
    this.batch = {
      create: this._batchCreate.bind(this),
      status: this._batchStatus.bind(this),
      addTasks: this._batchAddTasks.bind(this),
      listTasks: this._batchListTasks.bind(this),
      cancel: this._batchCancel.bind(this),
      list: this._batchList.bind(this),
      waitForCompletion: this._batchWaitForCompletion.bind(this),
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
   * @param options.extractEffort - Extraction thoroughness: "normal", "high", or "auto"
   * @param options.responseLength - Content length per URL
   * @param options.maxPriceDollars - Maximum cost limit in USD
   * @param options.screenshot - Request page screenshots (default: false)
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

      if (options.screenshot !== undefined) {
        payload.screenshot = options.screenshot;
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
   * @param options.search - Search configuration options
   * @param options.search.searchType - Type of search: "all", "web", or "proprietary" (default: "all")
   * @param options.search.includedSources - Array of source types to include (e.g., ["academic", "finance", "web"])
   * @param options.search.excludedSources - Array of source types to exclude (e.g., ["web", "patent"])
   * @param options.search.startDate - Start date filter in ISO format (YYYY-MM-DD)
   * @param options.search.endDate - End date filter in ISO format (YYYY-MM-DD)
   * @param options.search.category - Category filter for search results
   */
  private async _deepresearchCreate(
    options: DeepResearchCreateOptions
  ): Promise<DeepResearchCreateResponse> {
    try {
      // Use query field (input is supported for backward compatibility)
      const queryValue = options.query ?? options.input;

      // Validation
      if (!queryValue?.trim()) {
        return {
          success: false,
          error: "query is required and cannot be empty",
        };
      }

      // Build payload with snake_case
      const payload: Record<string, any> = {
        query: queryValue,
        model: options.model || "fast",
        output_formats: options.outputFormats || ["markdown"],
        code_execution: options.codeExecution !== false,
      };

      // Add optional fields
      if (options.strategy) payload.strategy = options.strategy;
      if (options.search) {
        payload.search = {};
        if (options.search.searchType) {
          payload.search.search_type = options.search.searchType;
        }
        if (options.search.includedSources) {
          payload.search.included_sources = options.search.includedSources;
        }
        if (options.search.excludedSources) {
          payload.search.excluded_sources = options.search.excludedSources;
        }
        if (options.search.startDate) {
          payload.search.start_date = options.search.startDate;
        }
        if (options.search.endDate) {
          payload.search.end_date = options.search.endDate;
        }
        if (options.search.category) {
          payload.search.category = options.search.category;
        }
      }
      if (options.urls) payload.urls = options.urls;
      if (options.files) payload.files = options.files;
      if (options.deliverables) payload.deliverables = options.deliverables;
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
    const maxWaitTime = options.maxWaitTime || 7200000;
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
        `${this.baseUrl}/deepresearch/list?api_key_id=${options.apiKeyId}&limit=${limit}`,
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
   * Batch: Create a new batch
   * @param options - Batch configuration options
   * @param options.name - Optional name for the batch
   * @param options.model - DeepResearch mode: "fast", "standard", or "heavy" (default: "standard")
   * @param options.outputFormats - Output formats for tasks (default: ["markdown"])
   * @param options.search - Search configuration for all tasks in batch
   * @param options.search.searchType - Type of search: "all", "web", or "proprietary" (default: "all")
   * @param options.search.includedSources - Array of source types to include (e.g., ["academic", "finance", "web"])
   * @param options.search.excludedSources - Array of source types to exclude (e.g., ["web", "patent"])
   * @param options.search.startDate - Start date filter in ISO format (YYYY-MM-DD)
   * @param options.search.endDate - End date filter in ISO format (YYYY-MM-DD)
   * @param options.search.category - Category filter for search results
   * @param options.webhookUrl - Optional HTTPS URL for completion notification
   * @param options.metadata - Optional metadata key-value pairs
   * @returns Promise resolving to batch creation response with batch_id and webhook_secret
   */
  private async _batchCreate(
    options: CreateBatchOptions = {}
  ): Promise<CreateBatchResponse> {
    try {
      const payload: Record<string, any> = {};

      if (options.name) payload.name = options.name;
      if (options.model) payload.model = options.model;
      if (options.outputFormats) payload.output_formats = options.outputFormats;
      if (options.search) {
        payload.search = {};
        if (options.search.searchType) {
          payload.search.search_type = options.search.searchType;
        }
        if (options.search.includedSources) {
          payload.search.included_sources = options.search.includedSources;
        }
        if (options.search.excludedSources) {
          payload.search.excluded_sources = options.search.excludedSources;
        }
        if (options.search.startDate) {
          payload.search.start_date = options.search.startDate;
        }
        if (options.search.endDate) {
          payload.search.end_date = options.search.endDate;
        }
        if (options.search.category) {
          payload.search.category = options.search.category;
        }
      }
      if (options.webhookUrl) payload.webhook_url = options.webhookUrl;
      if (options.metadata) payload.metadata = options.metadata;

      const response = await axios.post(
        `${this.baseUrl}/deepresearch/batches`,
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
   * Batch: Get batch status
   * @param batchId - The batch ID to query
   * @returns Promise resolving to batch status with counts and usage
   */
  private async _batchStatus(batchId: string): Promise<BatchStatusResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/deepresearch/batches/${batchId}`,
        { headers: this.headers }
      );

      return { success: true, batch: response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * Batch: Add tasks to a batch
   * @param batchId - The batch ID to add tasks to
   * @param options - Task configuration options
   * @param options.tasks - Array of task inputs (use 'query' field for each task)
   * @returns Promise resolving to response with added, tasks array, counts, and batch_id
   */
  private async _batchAddTasks(
    batchId: string,
    options: AddBatchTasksOptions
  ): Promise<AddBatchTasksResponse> {
    try {
      if (!options.tasks || !Array.isArray(options.tasks)) {
        return {
          success: false,
          error: "tasks must be an array",
        };
      }

      if (options.tasks.length === 0) {
        return {
          success: false,
          error: "tasks array cannot be empty",
        };
      }

      if (options.tasks.length > 100) {
        return {
          success: false,
          error: "Maximum 100 tasks allowed per request",
        };
      }

      // Validate that each task has a query
      for (const task of options.tasks) {
        if (!task.query && !task.input) {
          return {
            success: false,
            error: "Each task must have a 'query' field",
          };
        }
      }

      // Convert tasks to snake_case format for API
      // Note: Tasks can only include: id, query, strategy, urls, metadata
      // Tasks inherit model, output_formats, and search_params from batch
      const tasksPayload = options.tasks.map((task) => {
        const taskPayload: Record<string, any> = {};

        // Use query field (input is supported for backward compatibility)
        const queryValue = task.query ?? task.input;
        if (queryValue) {
          taskPayload.query = queryValue;
        }

        if (task.id) taskPayload.id = task.id;
        if (task.strategy) taskPayload.strategy = task.strategy;
        if (task.urls) taskPayload.urls = task.urls;
        if (task.metadata) taskPayload.metadata = task.metadata;

        return taskPayload;
      });

      const response = await axios.post(
        `${this.baseUrl}/deepresearch/batches/${batchId}/tasks`,
        { tasks: tasksPayload },
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
   * Batch: List all tasks in a batch
   * @param batchId - The batch ID to query
   * @returns Promise resolving to list of tasks with their status
   */
  private async _batchListTasks(
    batchId: string
  ): Promise<ListBatchTasksResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/deepresearch/batches/${batchId}/tasks`,
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
   * Batch: Cancel a batch and all its pending tasks
   * @param batchId - The batch ID to cancel
   * @returns Promise resolving to cancellation confirmation
   */
  private async _batchCancel(batchId: string): Promise<CancelBatchResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/deepresearch/batches/${batchId}/cancel`,
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
   * Batch: List all batches
   * @returns Promise resolving to list of all batches
   */
  private async _batchList(): Promise<ListBatchesResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/deepresearch/batches`, {
        headers: this.headers,
      });

      return { success: true, batches: response.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * Batch: Wait for batch completion with polling
   * @param batchId - The batch ID to wait for
   * @param options - Wait configuration options
   * @param options.pollInterval - Polling interval in milliseconds (default: 10000)
   * @param options.maxWaitTime - Maximum wait time in milliseconds (default: 7200000)
   * @param options.onProgress - Callback for progress updates
   * @returns Promise resolving to final batch status
   */
  private async _batchWaitForCompletion(
    batchId: string,
    options: BatchWaitOptions = {}
  ): Promise<DeepResearchBatch> {
    const pollInterval = options.pollInterval || 10000; // 10 seconds default
    const maxWaitTime = options.maxWaitTime || 7200000; // 2 hours default
    const startTime = Date.now();

    while (true) {
      const statusResponse = await this._batchStatus(batchId);

      if (!statusResponse.success || !statusResponse.batch) {
        throw new Error(statusResponse.error || "Failed to get batch status");
      }

      const batch = statusResponse.batch;

      // Notify progress callback
      if (options.onProgress) {
        options.onProgress(batch);
      }

      // Terminal states
      if (
        batch.status === "completed" ||
        batch.status === "completed_with_errors" ||
        batch.status === "cancelled"
      ) {
        return batch;
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
   * @param options.streaming - Enable streaming mode (default: false)
   * @returns Promise resolving to answer response, or AsyncGenerator for streaming
   */
  async answer(
    query: string,
    options: AnswerOptions = {}
  ): Promise<
    AnswerResponse | AsyncGenerator<AnswerStreamChunk, void, unknown>
  > {
    // Validate inputs first
    const validationError = this.validateAnswerParams(query, options);
    if (validationError) {
      if (options.streaming) {
        return this.createErrorGenerator(validationError);
      }
      return { success: false, error: validationError };
    }

    const payload = this.buildAnswerPayload(query, options);

    if (options.streaming) {
      return this.streamAnswer(payload);
    } else {
      return this.fetchAnswer(payload);
    }
  }

  /**
   * Validate answer parameters
   */
  private validateAnswerParams(
    query: string,
    options: AnswerOptions
  ): string | null {
    // Validate query
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return "Query is required and must be a non-empty string";
    }

    // Validate searchType
    const providedSearchTypeString = options.searchType?.toLowerCase();
    if (
      providedSearchTypeString !== undefined &&
      providedSearchTypeString !== "web" &&
      providedSearchTypeString !== "proprietary" &&
      providedSearchTypeString !== "all" &&
      providedSearchTypeString !== "news"
    ) {
      return "Invalid searchType provided. Must be one of: all, web, proprietary, news";
    }

    // Validate systemInstructions
    if (options.systemInstructions !== undefined) {
      if (typeof options.systemInstructions !== "string") {
        return "systemInstructions must be a string";
      }
      const trimmed = options.systemInstructions.trim();
      if (trimmed.length === 0) {
        return "systemInstructions cannot be empty when provided";
      }
      if (trimmed.length > 2000) {
        return "systemInstructions must be 2000 characters or less";
      }
    }

    // Validate dataMaxPrice
    if (options.dataMaxPrice !== undefined) {
      if (
        typeof options.dataMaxPrice !== "number" ||
        options.dataMaxPrice <= 0
      ) {
        return "dataMaxPrice must be a positive number";
      }
    }

    // Validate date formats
    if (options.startDate && !this.validateDateFormat(options.startDate)) {
      return "Invalid startDate format. Must be YYYY-MM-DD";
    }
    if (options.endDate && !this.validateDateFormat(options.endDate)) {
      return "Invalid endDate format. Must be YYYY-MM-DD";
    }
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      if (startDate > endDate) {
        return "startDate must be before endDate";
      }
    }

    // Validate sources
    if (options.includedSources !== undefined) {
      if (!Array.isArray(options.includedSources)) {
        return "includedSources must be an array";
      }
      const validation = this.validateSources(options.includedSources);
      if (!validation.valid) {
        return `Invalid includedSources format. Invalid sources: ${validation.invalidSources.join(
          ", "
        )}.`;
      }
    }
    if (options.excludedSources !== undefined) {
      if (!Array.isArray(options.excludedSources)) {
        return "excludedSources must be an array";
      }
      const validation = this.validateSources(options.excludedSources);
      if (!validation.valid) {
        return `Invalid excludedSources format. Invalid sources: ${validation.invalidSources.join(
          ", "
        )}.`;
      }
    }

    return null;
  }

  /**
   * Build payload for answer API
   */
  private buildAnswerPayload(
    query: string,
    options: AnswerOptions
  ): Record<string, any> {
    const defaultSearchType: SearchType = "all";
    const providedSearchTypeString = options.searchType?.toLowerCase();
    let finalSearchType: SearchType = defaultSearchType;

    if (
      providedSearchTypeString === "web" ||
      providedSearchTypeString === "proprietary" ||
      providedSearchTypeString === "all" ||
      providedSearchTypeString === "news"
    ) {
      finalSearchType = providedSearchTypeString as SearchType;
    }

    const payload: Record<string, any> = {
      query: query.trim(),
      search_type: finalSearchType,
    };

    if (options.dataMaxPrice !== undefined)
      payload.data_max_price = options.dataMaxPrice;
    if (options.structuredOutput !== undefined)
      payload.structured_output = options.structuredOutput;
    if (options.systemInstructions !== undefined)
      payload.system_instructions = options.systemInstructions.trim();
    if (options.countryCode !== undefined)
      payload.country_code = options.countryCode;
    if (options.includedSources !== undefined)
      payload.included_sources = options.includedSources;
    if (options.excludedSources !== undefined)
      payload.excluded_sources = options.excludedSources;
    if (options.startDate !== undefined) payload.start_date = options.startDate;
    if (options.endDate !== undefined) payload.end_date = options.endDate;
    if (options.fastMode !== undefined) payload.fast_mode = options.fastMode;

    return payload;
  }

  /**
   * Fetch answer (non-streaming mode)
   */
  private async fetchAnswer(
    payload: Record<string, any>
  ): Promise<AnswerResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/answer`, {
        method: "POST",
        headers: {
          ...this.headers,
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP Error: ${response.status}`,
        };
      }

      // Collect streamed data into final response
      let fullContent = "";
      let searchResults: SearchResult[] = [];
      let finalMetadata: any = {};

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6);

            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);

              // Handle search results
              if (parsed.search_results && !parsed.success) {
                searchResults = [...searchResults, ...parsed.search_results];
              }
              // Handle content chunks
              else if (parsed.choices) {
                const content = parsed.choices[0]?.delta?.content || "";
                if (content) fullContent += content;
              }
              // Handle final metadata
              else if (parsed.success !== undefined) {
                finalMetadata = parsed;
              }
            } catch {
              continue;
            }
          }
        }
      }

      // Build final response
      if (finalMetadata.success) {
        const finalSearchResults =
          finalMetadata.search_results || searchResults;
        const response: AnswerSuccessResponse = {
          success: true,
          tx_id: finalMetadata.tx_id || "",
          original_query: finalMetadata.original_query || payload.query,
          contents: fullContent || finalMetadata.contents || "",
          data_type: finalMetadata.data_type || "unstructured",
          search_results: finalSearchResults,
          search_metadata: finalMetadata.search_metadata || {
            tx_ids: [],
            number_of_results: 0,
            total_characters: 0,
          },
          ai_usage: finalMetadata.ai_usage || {
            input_tokens: 0,
            output_tokens: 0,
          },
          cost: finalMetadata.cost || {
            total_deduction_dollars: 0,
            search_deduction_dollars: 0,
            ai_deduction_dollars: 0,
          },
        };
        if (finalMetadata.extraction_metadata) {
          response.extraction_metadata = finalMetadata.extraction_metadata;
        }
        return response;
      }

      return {
        success: false,
        error: finalMetadata.error || "Unknown error occurred",
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Request failed",
      };
    }
  }

  /**
   * Stream answer using SSE
   */
  private async *streamAnswer(
    payload: Record<string, any>
  ): AsyncGenerator<AnswerStreamChunk, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/answer`, {
        method: "POST",
        headers: {
          ...this.headers,
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        yield {
          type: "error",
          error: errorData.error || `HTTP Error: ${response.status}`,
        };
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        yield { type: "error", error: "No response body" };
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);

          if (dataStr === "[DONE]") {
            yield { type: "done" };
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);

            // Handle search results
            if (parsed.search_results && parsed.success === undefined) {
              yield {
                type: "search_results",
                search_results: parsed.search_results,
              };
            }
            // Handle content chunks
            else if (parsed.choices) {
              const delta = parsed.choices[0]?.delta || {};
              const content = delta.content || "";
              const finishReason = parsed.choices[0]?.finish_reason;

              if (content || finishReason) {
                yield { type: "content", content, finish_reason: finishReason };
              }
            }
            // Handle final metadata
            else if (parsed.success !== undefined) {
              yield {
                type: "metadata",
                tx_id: parsed.tx_id,
                original_query: parsed.original_query,
                data_type: parsed.data_type,
                search_results: parsed.search_results,
                search_metadata: parsed.search_metadata,
                ai_usage: parsed.ai_usage,
                cost: parsed.cost,
                extraction_metadata: parsed.extraction_metadata,
              };
            }
          } catch {
            continue;
          }
        }
      }
    } catch (e: any) {
      yield { type: "error", error: e.message || "Stream failed" };
    }
  }

  /**
   * Create an error generator for streaming errors
   */
  private async *createErrorGenerator(
    error: string
  ): AsyncGenerator<AnswerStreamChunk, void, unknown> {
    yield { type: "error", error };
  }
}

export type {
  SearchResponse,
  SearchType,
  SearchResult,
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
  AnswerStreamChunk,
  AnswerStreamChunkType,
  SearchMetadata,
  AIUsage,
  Cost,
  ExtractionMetadata,
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
  BatchStatus,
  BatchCounts,
  BatchUsage,
  DeepResearchBatch,
  CreateBatchOptions,
  BatchTaskInput,
  AddBatchTasksOptions,
  CreateBatchResponse,
  BatchStatusResponse,
  AddBatchTasksResponse,
  BatchTaskCreated,
  BatchTaskListItem,
  BatchPagination,
  ListBatchTasksResponse,
  CancelBatchResponse,
  ListBatchesResponse,
  BatchWaitOptions,
} from "./types";
