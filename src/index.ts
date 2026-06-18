import { createHmac, timingSafeEqual } from "crypto";
import http from "http";
import https from "https";
import axios, { AxiosInstance } from "axios";
import {
  SearchResponse,
  SearchType,
  SearchOptions,
  ContentsOptions,
  ContentsResponse,
  ContentsAsyncJobResponse,
  ContentsJobResponse,
  ContentsJobWaitOptions,
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
  DeepResearchGetAssetsOptions,
  DeepResearchGetAssetsResponse,
  DeepResearchRespondResponse,
  WaitOptions,
  StreamCallback,
  ListOptions,
  CreateBatchOptions,
  CreateBatchResponse,
  BatchStatusResponse,
  AddBatchTasksOptions,
  AddBatchTasksResponse,
  ListBatchTasksOptions,
  ListBatchTasksResponse,
  CancelBatchResponse,
  ListBatchesOptions,
  ListBatchesResponse,
  BatchWaitOptions,
  DeepResearchBatch,
  DatasourcesListOptions,
  DatasourcesListResponse,
  DatasourcesCategoriesResponse,
  WorkflowsListOptions,
  WorkflowsListResponse,
  WorkflowResponse,
  WorkflowVersionsResponse,
  WorkflowPreviewOptions,
  WorkflowPreviewResponse,
  WorkflowCreateOptions,
  WorkflowUpdateOptions,
  WorkflowDeleteResponse,
} from "./types";

const SDK_VERSION = "2.9.0";

/**
 * HTTP status codes that indicate a transient gateway/server/rate-limit
 * condition rather than a definitive answer about the task. The status
 * endpoint is idempotent and meant to be polled, so these are retried.
 */
const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/** Normalize API job response (snake_case) to SDK format (camelCase). */
function normalizeContentsJobResponse(api: Record<string, any>): ContentsJobResponse {
  return {
    success: api.success ?? true,
    jobId: api.job_id ?? api.jobId,
    status: api.status ?? "pending",
    urlsTotal: api.urls_total ?? api.urlsTotal ?? 0,
    urlsProcessed: api.urls_processed ?? api.urlsProcessed ?? 0,
    urlsFailed: api.urls_failed ?? api.urlsFailed ?? 0,
    createdAt: api.created_at ?? api.createdAt ?? 0,
    updatedAt: api.updated_at ?? api.updatedAt ?? 0,
    currentBatch: api.current_batch ?? api.currentBatch,
    totalBatches: api.total_batches ?? api.totalBatches,
    results: api.results,
    actualCostDollars: api.actual_cost_dollars ?? api.actualCostDollars,
    error: api.error,
    webhookSecret: api.webhook_secret ?? api.webhookSecret,
  };
}

/** Normalize API async job creation response (202) to SDK format. */
function normalizeContentsAsyncJobResponse(
  api: Record<string, any>
): ContentsAsyncJobResponse {
  return {
    success: api.success ?? true,
    jobId: api.job_id ?? api.jobId,
    status: "pending",
    urlsTotal: api.urls_total ?? api.urlsTotal ?? 0,
    pollUrl: api.poll_url ?? api.pollUrl,
    webhookSecret: api.webhook_secret ?? api.webhookSecret,
    txId: api.tx_id ?? api.txId ?? "",
  };
}

/**
 * Verify webhook signature for Contents API async completion notifications.
 * Use the raw request body (not parsed JSON) as payload.
 * @param payload - Raw request body string
 * @param signature - X-Webhook-Signature header value
 * @param timestamp - X-Webhook-Timestamp header value
 * @param secret - webhookSecret from job creation
 */
export function verifyContentsWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedSignature = `sha256=${expected}`;
  if (signature.length !== expectedSignature.length) return false;
  return timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );
}

// Valyu API client
export class Valyu {
  private baseUrl: string;
  private headers: Record<string, string>;
  private client: AxiosInstance;

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
    getAssets: (
      taskId: string,
      assetId: string,
      options?: DeepResearchGetAssetsOptions
    ) => Promise<DeepResearchGetAssetsResponse>;
    respond: (
      taskId: string,
      interactionId: string,
      response: Record<string, any>
    ) => Promise<DeepResearchRespondResponse>;
    respondPlanningQuestions: (taskId: string, interactionId: string, answers: { question: string; answer: string }[]) => Promise<DeepResearchRespondResponse>;
    approvePlan: (taskId: string, interactionId: string, modifications?: string) => Promise<DeepResearchRespondResponse>;
    respondSourceReview: (taskId: string, interactionId: string, options?: { includedDomains?: string[]; excludedDomains?: string[] }) => Promise<DeepResearchRespondResponse>;
    approveOutline: (taskId: string, interactionId: string, modifications?: string) => Promise<DeepResearchRespondResponse>;
  };

  // Batch API namespace
  public batch: {
    create: (options?: CreateBatchOptions) => Promise<CreateBatchResponse>;
    status: (batchId: string) => Promise<BatchStatusResponse>;
    addTasks: (
      batchId: string,
      options: AddBatchTasksOptions
    ) => Promise<AddBatchTasksResponse>;
    listTasks: (
      batchId: string,
      options?: ListBatchTasksOptions
    ) => Promise<ListBatchTasksResponse>;
    cancel: (batchId: string) => Promise<CancelBatchResponse>;
    list: (options?: ListBatchesOptions) => Promise<ListBatchesResponse>;
    waitForCompletion: (
      batchId: string,
      options?: BatchWaitOptions
    ) => Promise<DeepResearchBatch>;
  };

  // Datasources API namespace
  public datasources: {
    list: (options?: DatasourcesListOptions) => Promise<DatasourcesListResponse>;
    categories: () => Promise<DatasourcesCategoriesResponse>;
  };

  // Workflows API namespace
  public workflows: {
    list: (options?: WorkflowsListOptions) => Promise<WorkflowsListResponse>;
    get: (slug: string, version?: number) => Promise<WorkflowResponse>;
    versions: (slug: string) => Promise<WorkflowVersionsResponse>;
    preview: (
      slug: string,
      options?: WorkflowPreviewOptions
    ) => Promise<WorkflowPreviewResponse>;
    create: (options: WorkflowCreateOptions) => Promise<WorkflowResponse>;
    update: (
      slug: string,
      options: WorkflowUpdateOptions
    ) => Promise<WorkflowResponse>;
    delete: (slug: string) => Promise<WorkflowDeleteResponse>;
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
      "User-Agent": `valyu-js/${SDK_VERSION}`,
      "X-Valyu-SDK": "valyu-js",
      "X-Valyu-SDK-Version": SDK_VERSION,
    };

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    });

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
      getAssets: this._deepresearchGetAssets.bind(this),
      respond: this._deepresearchRespond.bind(this),
      respondPlanningQuestions: this._deepresearchRespondPlanningQuestions.bind(this),
      approvePlan: this._deepresearchApprovePlan.bind(this),
      respondSourceReview: this._deepresearchRespondSourceReview.bind(this),
      approveOutline: this._deepresearchApproveOutline.bind(this),
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

    // Initialize Datasources namespace
    this.datasources = {
      list: this._datasourcesList.bind(this),
      categories: this._datasourcesCategories.bind(this),
    };

    // Initialize Workflows namespace
    this.workflows = {
      list: this._workflowsList.bind(this),
      get: this._workflowsGet.bind(this),
      versions: this._workflowsVersions.bind(this),
      preview: this._workflowsPreview.bind(this),
      create: this._workflowsCreate.bind(this),
      update: this._workflowsUpdate.bind(this),
      delete: this._workflowsDelete.bind(this),
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
   * @param options.historicalCache - When true and a date range is set, return the newest cached snapshot inside the range instead of the latest crawl. No-op without a date range (default: false)
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
        payload.excluded_sources = options.excludeSources;
      }

      if (options.sourceBiases !== undefined) {
        payload.source_biases = options.sourceBiases;
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

      if (options.historicalCache !== undefined) {
        payload.historical_cache = options.historicalCache;
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

      if (options.instructions !== undefined) {
        payload.instructions = options.instructions;
      }

      const response = await this.client.post(`${this.baseUrl}/search`, payload, {
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
        total_deduction_dollars: 0.0,
        total_characters: 0,
      };
    }
  }

  /**
   * Extract content from URLs with optional AI processing
   * @param urls - Array of URLs to process (max 10 sync, max 50 with async: true)
   * @param options - Content extraction configuration options
   * @param options.summary - AI summary configuration: false (raw), true (auto), string (custom), or JSON schema
   * @param options.extractEffort - Extraction thoroughness: "normal", "high", or "auto"
   * @param options.responseLength - Content length per URL
   * @param options.maxPriceDollars - Maximum cost limit in USD
   * @param options.screenshot - Request page screenshots (default: false)
   * @param options.async - Force async processing (required for >10 URLs)
   * @param options.webhookUrl - HTTPS URL for completion notification (async only)
   * @param options.startDate - Start date filter (YYYY-MM-DD format), inclusive
   * @param options.endDate - End date filter (YYYY-MM-DD format), inclusive
   * @param options.historicalCache - When true and a date range is set, return the newest cached snapshot inside the range instead of the latest crawl. No-op without a date range (default: false)
   * @returns Promise resolving to sync results or async job (when async: true or >10 URLs)
   */
  async contents(
    urls: string[],
    options: ContentsOptions = {}
  ): Promise<ContentsResponse | ContentsAsyncJobResponse> {
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

      const isAsync = options.async === true || urls.length > 10;

      if (urls.length > 10 && !options.async) {
        return {
          success: false,
          error:
            "Requests with more than 10 URLs require async processing. Add async: true to the request.",
          urls_requested: urls.length,
          urls_processed: 0,
          urls_failed: urls.length,
          results: [],
          total_cost_dollars: 0,
          total_characters: 0,
        };
      }

      if (urls.length > 50) {
        return {
          success: false,
          error: "Maximum 50 URLs allowed per request",
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

      if (isAsync) {
        payload.async = true;
      }
      if (options.webhookUrl !== undefined) {
        payload.webhook_url = options.webhookUrl;
      }

      if (options.startDate !== undefined) {
        payload.start_date = options.startDate;
      }

      if (options.endDate !== undefined) {
        payload.end_date = options.endDate;
      }

      if (options.historicalCache !== undefined) {
        payload.historical_cache = options.historicalCache;
      }

      const response = await this.client.post(`${this.baseUrl}/contents`, payload, {
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

      // 202 Accepted - async job created
      if (response.status === 202) {
        return normalizeContentsAsyncJobResponse(response.data);
      }

      return response.data as ContentsResponse;
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
   * Get async Contents job status and results
   * @param jobId - Job ID from contents() async response
   * @returns Promise resolving to job status
   */
  async getContentsJob(jobId: string): Promise<ContentsJobResponse> {
    try {
      const response = await this.client.get(
        `${this.baseUrl}/contents/jobs/${jobId}`,
        { headers: this.headers }
      );
      return normalizeContentsJobResponse(response.data);
    } catch (e: any) {
      const errData = e.response?.data;
      const status = e.response?.status;
      return {
        success: false,
        jobId,
        status: "failed",
        urlsTotal: 0,
        urlsProcessed: 0,
        urlsFailed: 0,
        createdAt: 0,
        updatedAt: 0,
        error:
          errData?.error ||
          (status === 403
            ? "Forbidden - you do not have access to this job"
            : status === 404
              ? `Job ${jobId} not found`
              : e.message),
      };
    }
  }

  /**
   * Wait for async Contents job completion (polls until terminal state)
   * @param jobId - Job ID from contents() async response
   * @param options - Wait configuration (pollInterval, maxWaitTime, onProgress)
   * @returns Promise resolving to final job status with results
   */
  async waitForJob(
    jobId: string,
    options: ContentsJobWaitOptions = {}
  ): Promise<ContentsJobResponse> {
    const pollInterval = options.pollInterval ?? 5000;
    const maxWaitTime = options.maxWaitTime ?? 7200000;
    const startTime = Date.now();

    while (true) {
      const status = await this.getContentsJob(jobId);

      if (!status.success && status.error) {
        throw new Error(status.error);
      }

      if (options.onProgress) {
        options.onProgress(status);
      }

      if (
        status.status === "completed" ||
        status.status === "partial" ||
        status.status === "failed"
      ) {
        return status;
      }

      if (Date.now() - startTime > maxWaitTime) {
        throw new Error("Maximum wait time exceeded");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
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
   * @param options.search.historicalCache - When true and a date range is set, searches return the newest cached snapshot inside the range instead of the latest crawl. Locked for the whole research run — the agent cannot toggle it mid-research
   * @param options.search.category - Category filter for search results
   */
  private async _deepresearchCreate(
    options: DeepResearchCreateOptions
  ): Promise<DeepResearchCreateResponse> {
    try {
      // Use query field (input is supported for backward compatibility)
      const queryValue = options.query ?? options.input;

      // Workflow runs: the template supplies the freeform fields
      if (options.workflowId) {
        if (
          queryValue ||
          options.strategy ||
          options.researchStrategy ||
          options.reportFormat
        ) {
          return {
            success: false,
            error:
              "workflowId is mutually exclusive with query/input/researchStrategy/reportFormat - the workflow template supplies those fields",
          };
        }
        const payload: Record<string, any> = {
          workflow_id: options.workflowId,
        };
        if (options.workflowParams !== undefined) {
          payload.workflow_params = options.workflowParams;
        }
        if (options.workflowVersion !== undefined) {
          payload.workflow_version = options.workflowVersion;
        }
        // Only send mode/output_formats when explicitly set so the
        // workflow's recommended defaults apply otherwise
        const explicitMode = options.mode ?? options.model;
        if (explicitMode) payload.mode = explicitMode;
        if (options.outputFormats) payload.output_formats = options.outputFormats;
        if (options.tools) payload.tools = options.tools;
        if (options.webhookUrl) payload.webhook_url = options.webhookUrl;
        if (options.alertEmail) {
          payload.alert_email =
            typeof options.alertEmail === "string"
              ? options.alertEmail
              : {
                  email: options.alertEmail.email,
                  custom_url: options.alertEmail.custom_url,
                };
        }
        if (options.metadata) payload.metadata = options.metadata;

        const response = await this.client.post(
          `${this.baseUrl}/deepresearch/tasks`,
          payload,
          { headers: this.headers }
        );
        return { success: true, ...response.data };
      }

      // Validation
      if (!queryValue?.trim()) {
        return {
          success: false,
          error: "query is required and cannot be empty",
        };
      }

      if (queryValue.length > 25000) {
        return {
          success: false,
          error: `query exceeds 25,000 character limit (${queryValue.length} characters)`,
        };
      }

      const strategyLen = (options.researchStrategy ?? "").length;
      const formatLen = (options.reportFormat ?? "").length;
      if (strategyLen + formatLen > 15000) {
        return {
          success: false,
          error: `Combined length of researchStrategy (${strategyLen}) and reportFormat (${formatLen}) exceeds 15,000 character limit`,
        };
      }

      if (options.files) {
        for (let i = 0; i < options.files.length; i++) {
          const ctx = options.files[i].context;
          if (ctx && ctx.length > 10000) {
            return {
              success: false,
              error: `files[${i}].context exceeds 10,000 character limit (${ctx.length} characters)`,
            };
          }
        }
      }

      // Build payload with snake_case
      // Prefer mode over model (backward compatible)
      const mode = options.mode ?? options.model;
      const payload: Record<string, any> = {
        query: queryValue,
        mode: mode || "fast", // API defaults to "standard", but we keep "fast" for backward compatibility
        output_formats: options.outputFormats || ["markdown"],
      };

      // Handle tools configuration
      if (options.tools) {
        payload.tools = options.tools;
      } else if (options.codeExecution !== undefined) {
        // Backward compatibility: top-level code_execution (deprecated)
        payload.code_execution = options.codeExecution;
      }

      // Add optional fields
      if (options.strategy) payload.strategy = options.strategy;
      if (options.researchStrategy)
        payload.research_strategy = options.researchStrategy;
      if (options.reportFormat)
        payload.report_format = options.reportFormat;
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
        if (options.search.sourceBiases) {
          payload.search.source_biases = options.search.sourceBiases;
        }
        if (options.search.startDate) {
          payload.search.start_date = options.search.startDate;
        }
        if (options.search.endDate) {
          payload.search.end_date = options.search.endDate;
        }
        if (options.search.historicalCache !== undefined) {
          payload.search.historical_cache = options.search.historicalCache;
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
      if (options.brandCollectionId)
        payload.brand_collection_id = options.brandCollectionId;
      if (options.alertEmail) {
        if (typeof options.alertEmail === "string") {
          payload.alert_email = options.alertEmail;
        } else {
          payload.alert_email = {
            email: options.alertEmail.email,
            custom_url: options.alertEmail.custom_url,
          };
        }
      }
      if (options.metadata) payload.metadata = options.metadata;
      if (options.hitl) {
        payload.hitl = {};
        if (options.hitl.planningQuestions !== undefined)
          payload.hitl.planning_questions = options.hitl.planningQuestions;
        if (options.hitl.planReview !== undefined)
          payload.hitl.plan_review = options.hitl.planReview;
        if (options.hitl.sourceReview !== undefined)
          payload.hitl.source_review = options.hitl.sourceReview;
        if (options.hitl.outlineReview !== undefined)
          payload.hitl.outline_review = options.hitl.outlineReview;
      }

      const response = await this.client.post(
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
    taskId: string,
    maxAttempts: number = 5
  ): Promise<DeepResearchStatusResponse> {
    // The status endpoint is idempotent and built to be polled, so transient
    // failures are retried with exponential backoff + jitter instead of being
    // reported as task failures. Treated as transient (and retried): network
    // errors and timeouts, HTTP 429/5xx (e.g. an ALB 502 gateway page), and
    // non-JSON or empty response bodies. Only a definitive error response (a
    // 4xx other than 429 carrying a JSON error) is returned as a failure.
    const url = `${this.baseUrl}/deepresearch/tasks/${taskId}/status`;
    let lastError = "status endpoint unreachable";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.client.get(url, {
          headers: this.headers,
          // Classify status codes ourselves rather than letting axios throw.
          validateStatus: () => true,
        });

        if (TRANSIENT_STATUS_CODES.has(response.status)) {
          // Gateway/rate-limit/server blip — the task is unaffected.
          lastError = `HTTP ${response.status}`;
        } else {
          const contentType = String(
            response.headers?.["content-type"] || ""
          );
          const body = response.data;
          // An HTML 502 page or an empty body is a gateway artifact, not the
          // task's real status. Guard before trusting it so we never conflate
          // a bad body with a failed task.
          const isJsonObject =
            contentType.toLowerCase().includes("application/json") &&
            typeof body === "object" &&
            body !== null &&
            !Array.isArray(body);

          if (!isJsonObject) {
            lastError = `non-JSON/empty status response (HTTP ${response.status}, content-type: ${contentType || "none"})`;
          } else if (response.status >= 400) {
            // Definitive error response (e.g. 4xx) — terminal, not transient.
            return {
              success: false,
              error: (body as any).error || `HTTP Error: ${response.status}`,
            };
          } else {
            const { success: _ignored, ...rest } = body as any;
            return { success: true, ...rest };
          }
        }
      } catch (e: any) {
        // Network errors / timeouts — no HTTP response was received.
        lastError = e?.message || String(e);
      }

      if (attempt < maxAttempts - 1) {
        // Exponential backoff capped at 30s, with jitter to avoid synchronised
        // retries hammering a recovering gateway.
        const delayMs = Math.min(2 ** attempt, 30) * 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      success: false,
      unreachable: true,
      error: `Status endpoint unreachable after ${maxAttempts} attempts: ${lastError}`,
    };
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
        // A transiently unreachable status endpoint is not a task failure —
        // keep polling within maxWaitTime, since the task may well be running
        // (or already completed) server-side.
        if (status.unreachable) {
          if (Date.now() - startTime > maxWaitTime) {
            throw new Error(
              `Status endpoint unreachable for ${maxWaitTime}ms: ${status.error}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }
        throw new Error(status.error);
      }

      // Notify progress callback
      if (options.onProgress) {
        options.onProgress(status);
      }

      // HITL checkpoint handling
      if (
        (status.status === "awaiting_input" || status.status === "paused") &&
        status.interaction
      ) {
        if (options.onInteraction) {
          const response = await options.onInteraction(status.interaction);
          if (response) {
            await this._deepresearchRespond(
              taskId,
              status.interaction.interaction_id,
              response
            );
            continue;
          }
        }
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
    options?: ListOptions
  ): Promise<DeepResearchListResponse> {
    try {
      const limit = options?.limit || 10;
      const response = await this.client.get(
        `${this.baseUrl}/deepresearch/list?limit=${limit}`,
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

      const response = await this.client.post(
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
   * DeepResearch: Respond to a HITL checkpoint
   * @param taskId - The task ID to respond to
   * @param interactionId - The interaction_id from the task's interaction field
   * @param response - Response data matching the checkpoint type
   */
  private async _deepresearchRespond(
    taskId: string,
    interactionId: string,
    response: Record<string, any>
  ): Promise<DeepResearchRespondResponse> {
    try {
      const resp = await this.client.post(
        `${this.baseUrl}/deepresearch/tasks/${taskId}/respond`,
        {
          interaction_id: interactionId,
          response,
        },
        { headers: this.headers }
      );

      return { success: true, ...resp.data };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * DeepResearch: Respond to a planning_questions checkpoint
   */
  private async _deepresearchRespondPlanningQuestions(
    taskId: string,
    interactionId: string,
    answers: { question: string; answer: string }[]
  ): Promise<DeepResearchRespondResponse> {
    return this._deepresearchRespond(taskId, interactionId, {
      answers,
    });
  }

  /**
   * DeepResearch: Approve or request modifications to a plan_review checkpoint
   */
  private async _deepresearchApprovePlan(
    taskId: string,
    interactionId: string,
    modifications?: string
  ): Promise<DeepResearchRespondResponse> {
    const response: Record<string, any> = { approved: true };
    if (modifications) {
      response.approved = false;
      response.modifications = modifications;
    }
    return this._deepresearchRespond(taskId, interactionId, response);
  }

  /**
   * DeepResearch: Respond to a source_review checkpoint
   */
  private async _deepresearchRespondSourceReview(
    taskId: string,
    interactionId: string,
    options: {
      includedDomains?: string[];
      excludedDomains?: string[];
    } = {}
  ): Promise<DeepResearchRespondResponse> {
    return this._deepresearchRespond(taskId, interactionId, {
      included_domains: options.includedDomains || [],
      excluded_domains: options.excludedDomains || [],
    });
  }

  /**
   * DeepResearch: Approve or request modifications to an outline_review checkpoint
   */
  private async _deepresearchApproveOutline(
    taskId: string,
    interactionId: string,
    modifications?: string
  ): Promise<DeepResearchRespondResponse> {
    const response: Record<string, any> = { approved: true };
    if (modifications) {
      response.approved = false;
      response.modifications = modifications;
    }
    return this._deepresearchRespond(taskId, interactionId, response);
  }

  /**
   * DeepResearch: Cancel task
   */
  private async _deepresearchCancel(
    taskId: string
  ): Promise<DeepResearchCancelResponse> {
    try {
      const response = await this.client.post(
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
      const response = await this.client.delete(
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
      const response = await this.client.post(
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
   * DeepResearch: Get task assets (images, deliverables, PDFs)
   */
  private async _deepresearchGetAssets(
    taskId: string,
    assetId: string,
    options: DeepResearchGetAssetsOptions = {}
  ): Promise<DeepResearchGetAssetsResponse> {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (options.token) {
        params.append("token", options.token);
      }

      // Build headers - use API key if no token provided, always include SDK metadata
      const headers: Record<string, string> = {
        "User-Agent": `valyu-js/${SDK_VERSION}`,
        "X-Valyu-SDK": "valyu-js",
        "X-Valyu-SDK-Version": SDK_VERSION,
      };
      if (!options.token) {
        headers["x-api-key"] = this.headers["x-api-key"];
      }

      const url = `${
        this.baseUrl
      }/deepresearch/tasks/${taskId}/assets/${assetId}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await this.client.get(url, {
        headers,
        responseType: "arraybuffer", // For binary data
      });

      return {
        success: true,
        data: Buffer.from(response.data),
        contentType:
          response.headers["content-type"] || "application/octet-stream",
      };
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
   * @param options.search.historicalCache - When true and a date range is set, searches return the newest cached snapshot inside the range instead of the latest crawl
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
      // Accept both mode (preferred) and model (backward compatible)
      const mode = options.mode ?? options.model;
      if (mode) payload.mode = mode;
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
        if (options.search.sourceBiases) {
          payload.search.source_biases = options.search.sourceBiases;
        }
        if (options.search.startDate) {
          payload.search.start_date = options.search.startDate;
        }
        if (options.search.endDate) {
          payload.search.end_date = options.search.endDate;
        }
        if (options.search.historicalCache !== undefined) {
          payload.search.historical_cache = options.search.historicalCache;
        }
        if (options.search.category) {
          payload.search.category = options.search.category;
        }
      }
      if (options.webhookUrl) payload.webhook_url = options.webhookUrl;
      if (options.metadata) payload.metadata = options.metadata;

      const response = await this.client.post(
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
      const response = await this.client.get(
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
        if (task.researchStrategy)
          taskPayload.research_strategy = task.researchStrategy;
        if (task.reportFormat)
          taskPayload.report_format = task.reportFormat;
        if (task.urls) taskPayload.urls = task.urls;
        if (task.metadata) taskPayload.metadata = task.metadata;

        return taskPayload;
      });

      const response = await this.client.post(
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
   * @param options - Optional pagination and filtering options
   * @param options.status - Filter by status: "queued", "running", "completed", "failed", or "cancelled"
   * @param options.limit - Maximum number of tasks to return
   * @param options.lastKey - Pagination token from previous response
   * @returns Promise resolving to list of tasks with their status and pagination info
   */
  private async _batchListTasks(
    batchId: string,
    options: ListBatchTasksOptions = {}
  ): Promise<ListBatchTasksResponse> {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (options.status) {
        params.append("status", options.status);
      }
      if (options.limit !== undefined) {
        params.append("limit", options.limit.toString());
      }
      if (options.lastKey) {
        params.append("last_key", options.lastKey);
      }
      if (options.includeOutput !== undefined) {
        params.append("include_output", options.includeOutput.toString());
      }

      const url = `${this.baseUrl}/deepresearch/batches/${batchId}/tasks${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await this.client.get(url, { headers: this.headers });

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
      const response = await this.client.post(
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
   * @param options - Optional options
   * @param options.limit - Maximum number of batches to return
   * @returns Promise resolving to list of all batches
   */
  private async _batchList(
    options: ListBatchesOptions = {}
  ): Promise<ListBatchesResponse> {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (options.limit !== undefined) {
        params.append("limit", options.limit.toString());
      }

      const url = `${this.baseUrl}/deepresearch/batches${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await this.client.get(url, {
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
          contents: finalMetadata.contents || fullContent || "",
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
                contents: parsed.contents,
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

  /**
   * Datasources: List all available datasources
   * @param options - Optional filter options
   * @param options.category - Filter by category (e.g., "research", "markets", "healthcare")
   * @returns Promise resolving to list of datasources with their metadata
   */
  private async _datasourcesList(
    options: DatasourcesListOptions = {}
  ): Promise<DatasourcesListResponse> {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (options.category) {
        params.append("category", options.category);
      }

      const url = `${this.baseUrl}/datasources${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await this.client.get(url, { headers: this.headers });

      return { success: true, datasources: response.data.datasources };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /**
   * Datasources: Get all available categories
   * @returns Promise resolving to list of categories with their metadata
   */
  private async _datasourcesCategories(): Promise<DatasourcesCategoriesResponse> {
    try {
      const response = await this.client.get(`${this.baseUrl}/datasources/categories`, {
        headers: this.headers,
      });

      return { success: true, categories: response.data.categories };
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    }
  }

  /** Extract the most descriptive error message from a Workflows API error. */
  private workflowError(e: any): string {
    return e.response?.data?.message || e.response?.data?.error || e.message;
  }

  /**
   * Workflows: List workflows available to your org
   * @param options - Filters: vertical, scope ("valyu" | "org" | "all"), q, tags, limit, expand
   */
  private async _workflowsList(
    options: WorkflowsListOptions = {}
  ): Promise<WorkflowsListResponse> {
    try {
      const params = new URLSearchParams();
      if (options.vertical) params.append("vertical", options.vertical);
      if (options.scope) params.append("scope", options.scope);
      if (options.q) params.append("q", options.q);
      if (options.tags?.length) params.append("tags", options.tags.join(","));
      if (options.limit !== undefined) {
        params.append("limit", String(options.limit));
      }
      if (options.expand) params.append("expand", "true");

      const url = `${this.baseUrl}/workflows${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await this.client.get(url, { headers: this.headers });

      return { success: true, ...response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
  }

  /**
   * Workflows: Get a workflow's full detail, including its template
   * @param slug - Workflow slug
   * @param version - Specific version to fetch (defaults to the current version)
   */
  private async _workflowsGet(
    slug: string,
    version?: number
  ): Promise<WorkflowResponse> {
    try {
      const url = `${this.baseUrl}/workflows/${encodeURIComponent(slug)}${
        version !== undefined ? `?version=${version}` : ""
      }`;
      const response = await this.client.get(url, { headers: this.headers });

      return { success: true, workflow: response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
  }

  /**
   * Workflows: List a workflow's version history
   * @param slug - Workflow slug
   */
  private async _workflowsVersions(
    slug: string
  ): Promise<WorkflowVersionsResponse> {
    try {
      const response = await this.client.get(
        `${this.baseUrl}/workflows/${encodeURIComponent(slug)}/versions`,
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
  }

  /**
   * Workflows: Resolve a workflow's template with params without creating a task
   * @param slug - Workflow slug
   * @param options - workflowParams (variable values) and optional workflowVersion
   */
  private async _workflowsPreview(
    slug: string,
    options: WorkflowPreviewOptions = {}
  ): Promise<WorkflowPreviewResponse> {
    try {
      const payload: Record<string, any> = {};
      if (options.workflowParams !== undefined) {
        payload.workflow_params = options.workflowParams;
      }
      if (options.workflowVersion !== undefined) {
        payload.workflow_version = options.workflowVersion;
      }

      const response = await this.client.post(
        `${this.baseUrl}/workflows/${encodeURIComponent(slug)}/preview`,
        payload,
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
  }

  /**
   * Workflows: Create a new workflow for your org
   * @param options - slug, title, version (template body), and optional metadata
   */
  private async _workflowsCreate(
    options: WorkflowCreateOptions
  ): Promise<WorkflowResponse> {
    try {
      const payload: Record<string, any> = {
        slug: options.slug,
        title: options.title,
        version: options.version,
      };
      if (options.subtitle !== undefined) payload.subtitle = options.subtitle;
      if (options.description !== undefined) {
        payload.description = options.description;
      }
      if (options.vertical !== undefined) payload.vertical = options.vertical;
      if (options.tags !== undefined) payload.tags = options.tags;
      if (options.icon !== undefined) payload.icon = options.icon;

      const response = await this.client.post(
        `${this.baseUrl}/workflows`,
        payload,
        { headers: this.headers }
      );

      return { success: true, workflow: response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
  }

  /**
   * Workflows: Update a workflow's metadata and/or publish a new template version.
   * Only workflows owned by your org can be updated; versions are append-only
   * (a version body requires a changelog).
   * @param slug - Workflow slug
   * @param options - Metadata fields and/or a new version body
   */
  private async _workflowsUpdate(
    slug: string,
    options: WorkflowUpdateOptions
  ): Promise<WorkflowResponse> {
    try {
      const payload: Record<string, any> = {};
      if (options.title !== undefined) payload.title = options.title;
      if (options.subtitle !== undefined) payload.subtitle = options.subtitle;
      if (options.description !== undefined) {
        payload.description = options.description;
      }
      if (options.vertical !== undefined) payload.vertical = options.vertical;
      if (options.tags !== undefined) payload.tags = options.tags;
      if (options.icon !== undefined) payload.icon = options.icon;
      if (options.version !== undefined) payload.version = options.version;
      if (options.setCurrent !== undefined) {
        payload.set_current = options.setCurrent;
      }

      const response = await this.client.patch(
        `${this.baseUrl}/workflows/${encodeURIComponent(slug)}`,
        payload,
        { headers: this.headers }
      );

      return { success: true, workflow: response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
  }

  /**
   * Workflows: Delete a workflow owned by your org (soft delete)
   * @param slug - Workflow slug
   */
  private async _workflowsDelete(
    slug: string
  ): Promise<WorkflowDeleteResponse> {
    try {
      const response = await this.client.delete(
        `${this.baseUrl}/workflows/${encodeURIComponent(slug)}`,
        { headers: this.headers }
      );

      return { success: true, ...response.data };
    } catch (e: any) {
      return { success: false, error: this.workflowError(e) };
    }
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
  ContentsAsyncJobResponse,
  ContentsJobResponse,
  ContentsJobStatus,
  ContentsJobWaitOptions,
  ContentResult,
  ContentResultSuccess,
  ContentResultFailed,
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
  AlertEmailConfig,
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
  DeepResearchCostBreakdown,
  ToolConfig,
  DeepResearchTools,
  DeepResearchCreateResponse,
  DeepResearchStatusResponse,
  DeepResearchTaskListItem,
  DeepResearchListResponse,
  DeepResearchUpdateResponse,
  DeepResearchCancelResponse,
  DeepResearchDeleteResponse,
  DeepResearchTogglePublicResponse,
  DeepResearchGetAssetsOptions,
  DeepResearchGetAssetsResponse,
  DeepResearchRespondResponse,
  HitlConfig,
  InteractionType,
  Interaction,
  InteractionHistoryEntry,
  WaitOptions,
  StreamCallback,
  ListOptions,
  BatchStatus,
  BatchCounts,
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
  ListBatchTasksOptions,
  ListBatchTasksResponse,
  CancelBatchResponse,
  ListBatchesOptions,
  ListBatchesResponse,
  BatchWaitOptions,
  DatasourceCategoryId,
  DatasourceModality,
  DatasourcePricing,
  DatasourceCoverage,
  Datasource,
  DatasourceCategory,
  DatasourcesListOptions,
  DatasourcesListResponse,
  DatasourcesCategoriesResponse,
  WorkflowMode,
  WorkflowVariableType,
  WorkflowVariableValidation,
  WorkflowVariable,
  WorkflowDeliverable,
  WorkflowTools,
  Workflow,
  WorkflowVersionSummary,
  WorkflowRunInfo,
  ResolvedWorkflowTemplate,
  WorkflowVersionInput,
  WorkflowsListOptions,
  WorkflowCreateOptions,
  WorkflowUpdateOptions,
  WorkflowPreviewOptions,
  WorkflowsListResponse,
  WorkflowResponse,
  WorkflowVersionsResponse,
  WorkflowPreviewResponse,
  WorkflowDeleteResponse,
} from "./types";
