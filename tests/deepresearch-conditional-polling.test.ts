import { Valyu } from "../src/index";

/**
 * Conditional DeepResearch status polling: ETag / If-None-Match, 304 reuse,
 * Retry-After, and backoff on 429/5xx.
 */

type FakeResponse = {
  status: number;
  data: any;
  headers: Record<string, string>;
};

function json(status: number, data: any, headers: Record<string, string> = {}): FakeResponse {
  return { status, data, headers: { "content-type": "application/json", ...headers } };
}

function running(
  step = 1,
  opts: { etag?: string; retryAfter?: number } = {}
): FakeResponse {
  const headers: Record<string, string> = {};
  if (opts.etag) headers["etag"] = opts.etag;
  if (opts.retryAfter !== undefined) headers["retry-after"] = String(opts.retryAfter);
  return json(
    200,
    {
      success: true,
      deepresearch_id: "dr_1",
      status: "running",
      progress: { current_step: step, total_steps: 5 },
    },
    headers
  );
}

function completed(etag?: string): FakeResponse {
  return json(
    200,
    { success: true, deepresearch_id: "dr_1", status: "completed", output: "the report" },
    etag ? { etag } : {}
  );
}

function notModified(retryAfter?: number): FakeResponse {
  // A 304 has a zero-byte body; axios surfaces it as an empty string.
  return {
    status: 304,
    data: "",
    headers: retryAfter !== undefined ? { "retry-after": String(retryAfter) } : {},
  };
}

function makeClient(responses: FakeResponse[]) {
  const valyu = new Valyu("test-key", "https://api.valyu.ai/v1");
  const get = jest.fn();
  for (const r of responses) get.mockResolvedValueOnce(r);
  (valyu as any).client.get = get;
  const sleep = jest.fn().mockResolvedValue(undefined);
  (valyu as any).sleep = sleep;
  return { valyu, get, sleep };
}

const sentIfNoneMatch = (call: any[]) => call[1]?.headers?.["If-None-Match"];
const sleeps = (sleep: jest.Mock) => sleep.mock.calls.map((c) => c[0]);

describe("deepresearch conditional polling", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("round-trips the ETag as If-None-Match", async () => {
    const { valyu, get } = makeClient([
      running(1, { etag: 'W/"abc123"' }),
      running(2, { etag: 'W/"def456"' }),
      notModified(),
    ]);

    await valyu.deepresearch.status("dr_1");
    await valyu.deepresearch.status("dr_1");
    await valyu.deepresearch.status("dr_1");

    expect(sentIfNoneMatch(get.mock.calls[0])).toBeUndefined();
    expect(sentIfNoneMatch(get.mock.calls[1])).toBe('W/"abc123"');
    expect(sentIfNoneMatch(get.mock.calls[2])).toBe('W/"def456"');
    // The API key still goes out on conditional requests.
    expect(get.mock.calls[1][1].headers["x-api-key"]).toBe("test-key");
  });

  it("reuses the cached response on 304", async () => {
    const { valyu, get, sleep } = makeClient([
      running(3, { etag: 'W/"e1"' }),
      notModified(),
    ]);

    const first = await valyu.deepresearch.status("dr_1");
    const second = await valyu.deepresearch.status("dr_1");

    expect(second.success).toBe(true);
    expect(second.status).toBe("running");
    expect(second.progress?.current_step).toBe(3);
    expect(second).toEqual(first);
    expect(get).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("keeps the cache per task", async () => {
    const { valyu, get } = makeClient([
      running(1, { etag: 'W/"e1"' }),
      running(1, { etag: 'W/"e2"' }),
    ]);

    await valyu.deepresearch.status("dr_1");
    await valyu.deepresearch.status("dr_2");

    expect(sentIfNoneMatch(get.mock.calls[1])).toBeUndefined();
  });

  it("polls plainly when the server sends no ETag", async () => {
    const { valyu, get, sleep } = makeClient([running(1), running(2), completed()]);

    const result = await valyu.deepresearch.wait("dr_1");

    expect(result.status).toBe("completed");
    for (const call of get.mock.calls) {
      expect(sentIfNoneMatch(call)).toBeUndefined();
    }
    // The default 5s interval, as before.
    expect(sleeps(sleep)).toEqual([5000, 5000]);
  });

  it("uses Retry-After as the poll interval", async () => {
    const { valyu, sleep } = makeClient([
      running(1, { etag: 'W/"e1"', retryAfter: 7 }),
      notModified(7),
      completed('W/"e2"'),
    ]);

    await valyu.deepresearch.wait("dr_1");

    expect(sleeps(sleep)).toEqual([7000, 7000]);
  });

  it("clamps Retry-After to the SDK bounds", async () => {
    const { valyu, sleep } = makeClient([
      running(1, { etag: 'W/"e1"', retryAfter: 0 }),
      running(2, { etag: 'W/"e2"', retryAfter: 600 }),
      completed(),
    ]);

    await valyu.deepresearch.wait("dr_1");

    expect(sleeps(sleep)).toEqual([1000, 30000]);
  });

  it("lets a caller's pollInterval win over Retry-After", async () => {
    const { valyu, sleep } = makeClient([
      running(1, { etag: 'W/"e1"', retryAfter: 7 }),
      completed(),
    ]);

    await valyu.deepresearch.wait("dr_1", { pollInterval: 2000 });

    expect(sleeps(sleep)).toEqual([2000]);
  });

  it("fires onProgress only when the response changed", async () => {
    const { valyu } = makeClient([
      running(1, { etag: 'W/"e1"' }),
      notModified(),
      notModified(),
      running(2, { etag: 'W/"e2"' }),
      completed('W/"e3"'),
    ]);
    const seen: string[] = [];

    await valyu.deepresearch.wait("dr_1", {
      onProgress: (s) => seen.push(String(s.status)),
    });

    expect(seen).toEqual(["running", "running", "completed"]);
  });

  it("fires onProgress on every poll without an ETag, as before", async () => {
    const { valyu } = makeClient([running(1), running(1), completed()]);
    const seen: string[] = [];

    await valyu.deepresearch.wait("dr_1", {
      onProgress: (s) => seen.push(String(s.status)),
    });

    expect(seen).toEqual(["running", "running", "completed"]);
  });

  it("streams every 5s and reports every poll without an ETag", async () => {
    const { valyu, get, sleep } = makeClient([running(1), running(1), completed()]);
    const progress: number[] = [];

    await valyu.deepresearch.stream("dr_1", {
      onProgress: (current) => progress.push(current),
    });

    expect(progress).toEqual([1, 1]);
    expect(sleeps(sleep)).toEqual([5000, 5000]);
    for (const call of get.mock.calls) {
      expect(sentIfNoneMatch(call)).toBeUndefined();
    }
  });

  it("fires stream progress only on change and follows Retry-After", async () => {
    const { valyu, sleep } = makeClient([
      running(1, { etag: 'W/"e1"', retryAfter: 4 }),
      notModified(4),
      completed('W/"e2"'),
    ]);
    const progress: number[] = [];
    let completions = 0;

    await valyu.deepresearch.stream("dr_1", {
      onProgress: (current) => progress.push(current),
      onComplete: () => completions++,
    });

    expect(progress).toEqual([1]);
    expect(completions).toBe(1);
    expect(sleeps(sleep)).toEqual([4000, 4000]);
  });

  it("backs off exponentially on 429 and 5xx", async () => {
    const { valyu, sleep } = makeClient([
      json(429, { error: "rate limited" }),
      { status: 503, data: "", headers: {} },
      { status: 502, data: "<html>bad gateway</html>", headers: { "content-type": "text/html" } },
      running(1, { etag: 'W/"e1"' }),
    ]);

    const status = await valyu.deepresearch.status("dr_1");

    expect(status.success).toBe(true);
    expect(sleeps(sleep)).toEqual([1000, 2000, 4000]);
  });

  it("jitters the backoff", async () => {
    (Math.random as jest.Mock).mockReturnValue(0.5);
    const { valyu, sleep } = makeClient([
      { status: 503, data: "", headers: {} },
      running(1),
    ]);

    await valyu.deepresearch.status("dr_1");

    expect(sleeps(sleep)).toEqual([1500]);
  });

  it("honours a longer Retry-After on 429", async () => {
    const { valyu, sleep } = makeClient([
      json(429, { error: "slow down" }, { "retry-after": "12" }),
      running(1),
    ]);

    await valyu.deepresearch.status("dr_1");

    expect(sleeps(sleep)).toEqual([12000]);
  });

  it("retries an unrequested 304 instead of parsing it", async () => {
    const { valyu, get } = makeClient([notModified(), running(1)]);

    const status = await valyu.deepresearch.status("dr_1");

    expect(status.success).toBe(true);
    expect(status.status).toBe("running");
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("does not let a caller's mutation leak into the cache", async () => {
    const { valyu } = makeClient([running(1, { etag: 'W/"e1"' }), notModified()]);

    const first = await valyu.deepresearch.status("dr_1");
    first.status = "failed";
    const second = await valyu.deepresearch.status("dr_1");

    expect(second.status).toBe("running");
  });
});
