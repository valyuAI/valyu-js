import { Valyu } from "./index";
import type {
  SearchOptions,
  SearchResponse,
  ContentsOptions,
  ContentsResponse,
  AnswerOptions,
  AnswerResponse,
  DeepResearchCreateOptions,
  DeepResearchCreateResponse,
  DeepResearchStatusResponse,
  WaitOptions,
} from "./types";

// Initialize Valyu client
let valyuClient: Valyu | null = null;

function getClient(): Valyu {
  if (!valyuClient) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error(
        "VALYU_API_KEY environment variable is not set. Please set it in your Claude skill configuration."
      );
    }
    valyuClient = new Valyu(apiKey);
  }
  return valyuClient;
}

/**
 * Claude skill handler - processes tool calls from Claude
 */
export async function handleToolCall(
  toolName: string,
  parameters: Record<string, any>
): Promise<any> {
  const client = getClient();

  try {
    switch (toolName) {
      case "search": {
        const searchOptions: SearchOptions = {
          searchType: parameters.searchType,
          maxNumResults: parameters.maxNumResults,
          relevanceThreshold: parameters.relevanceThreshold,
          maxPrice: parameters.maxPrice,
          includedSources: parameters.includedSources,
          excludeSources: parameters.excludeSources,
          category: parameters.category,
          startDate: parameters.startDate,
          endDate: parameters.endDate,
          countryCode: parameters.countryCode,
          responseLength: parameters.responseLength,
          fastMode: parameters.fastMode,
        };

        const result: SearchResponse = await client.search(
          parameters.query,
          searchOptions
        );

        return {
          success: result.success,
          ...(result.success
            ? {
                tx_id: result.tx_id,
                query: result.query,
                results: result.results,
                results_by_source: result.results_by_source,
                total_deduction_dollars: result.total_deduction_dollars,
                total_characters: result.total_characters,
              }
            : { error: result.error }),
        };
      }

      case "contents": {
        const contentsOptions: ContentsOptions = {
          summary:
            parameters.summaryInstructions !== undefined
              ? parameters.summaryInstructions
              : parameters.summary,
          extractEffort: parameters.extractEffort,
          responseLength: parameters.responseLength,
          maxPriceDollars: parameters.maxPriceDollars,
        };

        const result: ContentsResponse = await client.contents(
          parameters.urls,
          contentsOptions
        );

        return {
          success: result.success,
          ...(result.success
            ? {
                tx_id: result.tx_id,
                urls_requested: result.urls_requested,
                urls_processed: result.urls_processed,
                urls_failed: result.urls_failed,
                results: result.results,
                total_cost_dollars: result.total_cost_dollars,
                total_characters: result.total_characters,
              }
            : { error: result.error }),
        };
      }

      case "answer": {
        const answerOptions: AnswerOptions = {
          searchType: parameters.searchType,
          systemInstructions: parameters.systemInstructions,
          dataMaxPrice: parameters.dataMaxPrice,
          countryCode: parameters.countryCode,
          includedSources: parameters.includedSources,
          excludedSources: parameters.excludedSources,
          startDate: parameters.startDate,
          endDate: parameters.endDate,
          fastMode: parameters.fastMode,
          streaming: false, // Claude skills don't support streaming yet
        };

        const result: AnswerResponse = await client.answer(
          parameters.query,
          answerOptions
        );

        return result;
      }

      case "deepresearch_create": {
        const createOptions: DeepResearchCreateOptions = {
          input: parameters.input,
          model: parameters.model,
          outputFormats: parameters.outputFormats,
          strategy: parameters.strategy,
          search: parameters.searchType || parameters.includedSources
            ? {
                searchType: parameters.searchType,
                includedSources: parameters.includedSources,
              }
            : undefined,
          urls: parameters.urls,
          codeExecution: parameters.codeExecution,
        };

        const result: DeepResearchCreateResponse =
          await client.deepresearch.create(createOptions);

        return result;
      }

      case "deepresearch_status": {
        const result: DeepResearchStatusResponse =
          await client.deepresearch.status(parameters.taskId);

        return result;
      }

      case "deepresearch_wait": {
        const waitOptions: WaitOptions = {
          pollInterval: parameters.pollInterval,
          maxWaitTime: parameters.maxWaitTime,
        };

        const result: DeepResearchStatusResponse =
          await client.deepresearch.wait(parameters.taskId, waitOptions);

        return result;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// Export for use as Claude skill
export default {
  handleToolCall,
};
