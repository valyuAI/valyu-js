import { Valyu } from "../src/index";

function makeClient(postData: any = {}, getData: any = {}) {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: {
      success: true,
      tx_id: "tx_test",
      query: "q",
      results: [],
      results_by_source: { web: 0, proprietary: 0 },
      total_deduction_dollars: 0,
      total_characters: 0,
      deepresearch_id: "dr_test",
      status: "queued",
      ...postData,
    },
  });
  const get = jest.fn().mockResolvedValue({ status: 200, data: getData });
  (valyu as any).client = { post, get };
  return { valyu, post, get };
}

describe("search scopePolicy and hlsCoverage", () => {
  it("sends scope_policy and hls_coverage when set", async () => {
    const { valyu, post } = makeClient();
    await valyu.search("q", {
      includedSources: ["valyu/valyu-pubmed", "valyu/valyu-arxiv"],
      scopePolicy: "strict",
      hlsCoverage: "increased_coverage",
    });
    expect(post.mock.calls[0][1].scope_policy).toBe("strict");
    expect(post.mock.calls[0][1].hls_coverage).toBe("increased_coverage");
  });

  it("omits both when unset", async () => {
    const { valyu, post } = makeClient();
    await valyu.search("q");
    expect(post.mock.calls[0][1]).not.toHaveProperty("scope_policy");
    expect(post.mock.calls[0][1]).not.toHaveProperty("hls_coverage");
  });

  it("passes source_scope through on the response", async () => {
    const scope = { policy: "strict", selected_dataset_ids: ["valyu/valyu-pubmed"] };
    const { valyu } = makeClient({ source_scope: scope });
    const res = await valyu.search("q", { scopePolicy: "strict" });
    expect(res.source_scope).toEqual(scope);
  });
});

describe("search excludedSources alias", () => {
  it("sends excludedSources as excluded_sources", async () => {
    const { valyu, post } = makeClient();
    await valyu.search("q", { excludedSources: ["example.com"] });
    expect(post.mock.calls[0][1].excluded_sources).toEqual(["example.com"]);
  });

  it("lets excludeSources win when both are set", async () => {
    const { valyu, post } = makeClient();
    await valyu.search("q", {
      excludeSources: ["a.com"],
      excludedSources: ["b.com"],
    });
    expect(post.mock.calls[0][1].excluded_sources).toEqual(["a.com"]);
  });
});

describe("deepresearch.create", () => {
  it("defaults mode to standard, the API default", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "x" });
    expect(post.mock.calls[0][1].mode).toBe("standard");
  });

  it("keeps an explicit mode", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "x", mode: "fast" });
    expect(post.mock.calls[0][1].mode).toBe("fast");
  });

  it("sends search.referenceDate as search.reference_date", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({
      query: "x",
      search: { referenceDate: "2026-07-31" },
    });
    expect(post.mock.calls[0][1].search).toEqual({ reference_date: "2026-07-31" });
  });
});

describe("batch.create", () => {
  it("sends search.referenceDate as search.reference_date", async () => {
    const { valyu, post } = makeClient({ batch_id: "b1" });
    await valyu.batch.create({ search: { referenceDate: "2026-07-31" } });
    expect(post.mock.calls[0][1].search.reference_date).toBe("2026-07-31");
  });
});

describe("datasources", () => {
  it("search calls GET /datasources/search with q and limit", async () => {
    const data = {
      success: true,
      query: "clinical trials",
      search_mode: "semantic",
      total_count: 1,
      results: [{ id: "valyu/x", relevance_score: 0.9 }],
    };
    const { valyu, get } = makeClient({}, data);
    const res = await valyu.datasources.search("clinical trials", { limit: 5 });
    const url = get.mock.calls[0][0] as string;
    expect(url).toMatch(/\/datasources\/search\?/);
    const params = new URL(url).searchParams;
    expect(params.get("q")).toBe("clinical trials");
    expect(params.get("limit")).toBe("5");
    expect(res.success).toBe(true);
    expect(res.results).toEqual(data.results);
    expect(res.search_mode).toBe("semantic");
  });

  it("search omits limit when unset and rejects an empty query", async () => {
    const { valyu, get } = makeClient({}, { success: true, results: [] });
    await valyu.datasources.search("x");
    expect(new URL(get.mock.calls[0][0]).searchParams.has("limit")).toBe(false);
    const bad = await valyu.datasources.search("  ");
    expect(bad.success).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("list returns total_count", async () => {
    const { valyu } = makeClient({}, { datasources: [], total_count: 36 });
    const res = await valyu.datasources.list();
    expect(res.total_count).toBe(36);
  });
});
