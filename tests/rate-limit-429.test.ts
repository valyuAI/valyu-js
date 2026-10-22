/**
 * Automatic retry and structured detail for the API's 429 rate-limit
 * response. A 429 means the request was never accepted, so retrying it is
 * always safe — unlike retrying after a timeout, where it's unknown whether
 * the request landed server-side.
 */

import { Valyu, RateLimitError } from "../src/index";
import { AnswerResponse } from "../src/types";

function ok(data: any = {}) {
  return { status: 200, data, headers: {} };
}

/** A 429 rejection shaped like the richer body: plan/limit/upgrade_url. */
function rateLimited(overrides: Record<string, any> = {}, retryAfterHeader = "2") {
  return {
    response: {
      status: 429,
      data: {
        error: "rate_limited",
        message:
          "Search rate limit reached: your Pay-as-you-go plan allows 5 requests per second. Retry after 2 seconds. Upgrade to Ridiculously Cheap for 10 requests per second: https://platform.valyu.ai/user/account/billing?tab=plan",
        retry_after: 2,
        plan: "Pay-as-you-go",
        limit: { endpoint: "search", requests_per_second: 5 },
        upgrade_url: "https://platform.valyu.ai/user/account/billing?tab=plan",
        ...overrides,
      },
      headers: { "retry-after": retryAfterHeader },
    },
    message: "Request failed with status code 429",
  };
}

/** A 429 rejection shaped like an old server's generic body: no plan/limit/upgrade_url. */
function genericRateLimited(retryAfterHeader = "5") {
  return {
    response: {
      status: 429,
      data: { error: "rate_limited", message: "Too many requests; retry after 5 seconds" },
      headers: { "retry-after": retryAfterHeader },
    },
    message: "Request failed with status code 429",
  };
}

function makeClient(maxRateLimitRetries?: number) {
  const valyu = new Valyu(
    "test-key",
    "https://api.valyu.ai/v1",
    maxRateLimitRetries !== undefined ? { maxRateLimitRetries } : {}
  );
  const post = jest.fn();
  (valyu as any).client = { post };
  const sleep = jest.fn().mockResolvedValue(undefined);
  (valyu as any).sleep = sleep;
  return { valyu, post, sleep };
}

const searchOk = ok({
  success: true,
  tx_id: "tx_1",
  query: "test",
  results: [],
  results_by_source: { web: 0, proprietary: 0 },
  total_deduction_dollars: 0,
  total_characters: 0,
});

describe("429 structured detail", () => {
  it("carries plan/limit/upgradeUrl from a 429 with full detail, with non-billing wording", async () => {
    const { valyu, post } = makeClient(0);
    post.mockRejectedValueOnce(rateLimited());

    const result = await valyu.search("test");

    expect(result.success).toBe(false);
    expect(result.rateLimit).toEqual({
      retryAfter: 2,
      plan: "Pay-as-you-go",
      limit: { endpoint: "search", requestsPerSecond: 5 },
      upgradeUrl: "https://platform.valyu.ai/user/account/billing?tab=plan",
      contactUrl: undefined,
    });
    expect(result.error?.toLowerCase()).not.toContain("credit");
    expect(result.error?.toLowerCase()).not.toContain("billing problem");
  });

  it("still works with only the generic 429 body (old servers), structured fields undefined", async () => {
    const { valyu, post } = makeClient(0);
    post.mockRejectedValueOnce(genericRateLimited("5"));

    const result = await valyu.search("test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Too many requests; retry after 5 seconds");
    expect(result.rateLimit?.retryAfter).toBe(5);
    expect(result.rateLimit?.plan).toBeUndefined();
    expect(result.rateLimit?.limit).toBeUndefined();
    expect(result.rateLimit?.upgradeUrl).toBeUndefined();
    expect(result.rateLimit?.contactUrl).toBeUndefined();
  });

  it("exposes contactUrl instead of upgradeUrl for a plan with no self-serve upgrade", async () => {
    const { valyu, post } = makeClient(0);
    post.mockRejectedValueOnce(
      rateLimited({
        plan: "Enterprise",
        upgrade_url: undefined,
        contact_url: "https://www.valyu.ai/contact",
      })
    );

    const result = await valyu.search("test");

    expect(result.rateLimit?.plan).toBe("Enterprise");
    expect(result.rateLimit?.upgradeUrl).toBeUndefined();
    expect(result.rateLimit?.contactUrl).toBe("https://www.valyu.ai/contact");
  });

  it("falls back to the Retry-After header when the body has no retry_after", async () => {
    const { valyu, post } = makeClient(0);
    post.mockRejectedValueOnce({
      response: {
        status: 429,
        data: { error: "rate_limited", message: "slow down" },
        headers: { "retry-after": "9" },
      },
      message: "Request failed with status code 429",
    });

    const result = await valyu.search("test");

    expect(result.rateLimit?.retryAfter).toBe(9);
  });
});

describe("429 automatic retry", () => {
  it("retries after the server's retry_after and succeeds", async () => {
    const { valyu, post, sleep } = makeClient(2);
    post.mockRejectedValueOnce(rateLimited({ retry_after: 3 })).mockResolvedValueOnce(searchOk);

    const result = await valyu.search("test");

    expect(result.success).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("caps the wait at 60 seconds even when the server asks for longer", async () => {
    const { valyu, post, sleep } = makeClient(1);
    post.mockRejectedValueOnce(rateLimited({ retry_after: 120 })).mockResolvedValueOnce(searchOk);

    const result = await valyu.search("test");

    expect(result.success).toBe(true);
    expect(sleep).toHaveBeenCalledWith(60000);
  });

  it("does not retry a non-429 error", async () => {
    const { valyu, post, sleep } = makeClient(2);
    post.mockRejectedValueOnce({
      response: { status: 500, data: { error: "server error" }, headers: {} },
      message: "Request failed with status code 500",
    });

    const result = await valyu.search("test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("server error");
    expect(result.rateLimit).toBeUndefined();
    expect(sleep).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("surfaces a RateLimitError after maxRateLimitRetries attempts, not an infinite loop", async () => {
    const { valyu, post, sleep } = makeClient(2);
    post.mockRejectedValue(rateLimited({ retry_after: 1 }));

    const result = await valyu.search("test");

    expect(result.success).toBe(false);
    expect(result.rateLimit?.retryAfter).toBe(1);
    expect(result.error).toContain("Search rate limit reached");
    // Initial attempt + 2 retries, then give up.
    expect(post).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("maxRateLimitRetries: 0 makes no retry attempt", async () => {
    const { valyu, post, sleep } = makeClient(0);
    post.mockRejectedValue(rateLimited());

    const result = await valyu.search("test");

    expect(result.success).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries contents(), deepresearch.create(), batch.create() and batch.addTasks() on a 429", async () => {
    const { valyu, post, sleep } = makeClient(1);

    post
      .mockRejectedValueOnce(rateLimited({ retry_after: 1 }))
      .mockResolvedValueOnce(ok({ success: true, urls_requested: 1, urls_processed: 1, urls_failed: 0, results: [] }));
    const contentsResult = await valyu.contents(["https://example.com"]);
    expect(contentsResult.success).toBe(true);

    post
      .mockRejectedValueOnce(rateLimited({ retry_after: 1 }))
      .mockResolvedValueOnce(ok({ success: true, deepresearch_id: "dr_1", status: "queued" }));
    const createResult = await valyu.deepresearch.create({ query: "q" });
    expect(createResult.success).toBe(true);

    post
      .mockRejectedValueOnce(rateLimited({ retry_after: 1 }))
      .mockResolvedValueOnce(ok({ success: true, batch_id: "b_1" }));
    const batchResult = await valyu.batch.create();
    expect(batchResult.success).toBe(true);

    post
      .mockRejectedValueOnce(rateLimited({ retry_after: 1 }))
      .mockResolvedValueOnce(ok({ success: true, batch_id: "b_1", added: 1 }));
    const addTasksResult = await valyu.batch.addTasks("b_1", { tasks: [{ query: "q" }] });
    expect(addTasksResult.success).toBe(true);

    expect(sleep).toHaveBeenCalledTimes(4);
  });
});

describe("RateLimitError", () => {
  it("is an Error carrying the structured detail", () => {
    const err = new RateLimitError("Search rate limit reached: slow down", {
      retryAfter: 2,
      plan: "Pay-as-you-go",
      limit: { endpoint: "search", requestsPerSecond: 5 },
      upgradeUrl: "https://platform.valyu.ai/user/account/billing?tab=plan",
    });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("RateLimitError");
    expect(err.message).toBe("Search rate limit reached: slow down");
    expect(err.retryAfter).toBe(2);
    expect(err.plan).toBe("Pay-as-you-go");
    expect(err.limit).toEqual({ endpoint: "search", requestsPerSecond: 5 });
    expect(err.upgradeUrl).toContain("billing");
    expect(err.contactUrl).toBeUndefined();
  });
});

describe("DeepResearch concurrency-queue message passthrough", () => {
  function makePostClient() {
    const valyu = new Valyu("test-key", "https://api.valyu.ai/v1");
    const post = jest.fn();
    (valyu as any).client = { post };
    return { valyu, post };
  }

  it("exposes message on deepresearch.create", async () => {
    const { valyu, post } = makePostClient();
    post.mockResolvedValueOnce(
      ok({
        success: true,
        deepresearch_id: "dr_1",
        status: "queued",
        message: "Queued: your plan runs 2 DeepResearch tasks at once.",
      })
    );

    const result = await valyu.deepresearch.create({ query: "q" });

    expect(result.message).toBe("Queued: your plan runs 2 DeepResearch tasks at once.");
  });

  it("exposes message on batch.create", async () => {
    const { valyu, post } = makePostClient();
    post.mockResolvedValueOnce(
      ok({ success: true, batch_id: "b_1", message: "Queued: your plan runs 2 DeepResearch tasks at once." })
    );

    const result = await valyu.batch.create();

    expect(result.message).toBe("Queued: your plan runs 2 DeepResearch tasks at once.");
  });

  it("exposes message on batch.addTasks", async () => {
    const { valyu, post } = makePostClient();
    post.mockResolvedValueOnce(
      ok({
        success: true,
        batch_id: "b_1",
        added: 1,
        message: "Queued: your plan runs 2 DeepResearch tasks at once.",
      })
    );

    const result = await valyu.batch.addTasks("b_1", { tasks: [{ query: "q" }] });

    expect(result.message).toBe("Queued: your plan runs 2 DeepResearch tasks at once.");
  });
});

describe("answer() 429 handling (fetch-based)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function fetchResponse(status: number, data: any, retryAfterHeader?: string) {
    const response: any = {
      status,
      ok: status >= 200 && status < 300,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "retry-after" ? retryAfterHeader ?? null : null,
      },
      json: async () => data,
    };
    response.clone = () => response;
    return response;
  }

  it("surfaces rateLimit with non-billing wording when retries are disabled", async () => {
    const valyu = new Valyu("test-key", "https://api.valyu.ai/v1", { maxRateLimitRetries: 0 });
    global.fetch = jest.fn().mockResolvedValue(
      fetchResponse(
        429,
        {
          error: "rate_limited",
          message:
            "Search rate limit reached: your Pay-as-you-go plan allows 5 requests per second. Retry after 4 seconds.",
          retry_after: 4,
          plan: "Pay-as-you-go",
          limit: { endpoint: "answer", requests_per_second: 5 },
          upgrade_url: "https://platform.valyu.ai/user/account/billing?tab=plan",
        },
        "4"
      )
    ) as any;

    const result = (await valyu.answer("test")) as AnswerResponse;

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Search rate limit reached");
      expect(result.error.toLowerCase()).not.toContain("credit");
      expect(result.rateLimit?.retryAfter).toBe(4);
      expect(result.rateLimit?.plan).toBe("Pay-as-you-go");
      expect(result.rateLimit?.upgradeUrl).toContain("billing");
    }
  });

  it("retries on 429 then succeeds", async () => {
    const valyu = new Valyu("test-key", "https://api.valyu.ai/v1", { maxRateLimitRetries: 1 });
    (valyu as any).sleep = jest.fn().mockResolvedValue(undefined);

    const successBody =
      'data: {"success":true,"tx_id":"tx_1","original_query":"test","contents":"answer","search_results":[]}\n\n';
    const successResponse = fetchResponse(200, {});
    successResponse.body = {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: new TextEncoder().encode(successBody) };
          },
        };
      },
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(fetchResponse(429, { error: "rate_limited", message: "slow down", retry_after: 1 }, "1"))
      .mockResolvedValueOnce(successResponse) as any;

    const result = (await valyu.answer("test")) as AnswerResponse;

    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });
});
