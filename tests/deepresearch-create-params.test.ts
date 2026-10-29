import { Valyu } from "../src/index";

/**
 * deepresearch.create builds its request body by explicitly mapping each known
 * camelCase option to the API's snake_case field. A field missed by that
 * mapping is either dropped or sent under a name the API ignores, with no error
 * either way. These tests pin the exact outgoing body.
 */
function makeClient() {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: { deepresearch_id: "dr_test", status: "queued" },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("deepresearch.create request body", () => {
  it("sends search.countryCode as search.country_code", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      query: "UK housing market outlook",
      search: { searchType: "web", countryCode: "GB" },
    });

    expect(post.mock.calls[0][1]).toEqual({
      query: "UK housing market outlook",
      mode: "standard",
      output_formats: ["markdown"],
      search: { search_type: "web", country_code: "GB" },
    });
  });

  it("omits country_code when countryCode is unset", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      query: "UK housing market outlook",
      search: { searchType: "web" },
    });

    expect(post.mock.calls[0][1].search).toEqual({ search_type: "web" });
  });

  it("sends mcpServers[].allowedTools and toolPrefix in snake_case", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      query: "Summarise open issues",
      mcpServers: [
        {
          url: "https://mcp.example.com/sse",
          name: "tracker",
          toolPrefix: "tracker",
          auth: { type: "bearer", token: "test-token" },
          allowedTools: ["list_issues", "get_issue"],
        },
        { url: "https://other.example.com/mcp" },
      ],
    });

    expect(post.mock.calls[0][1]).toEqual({
      query: "Summarise open issues",
      mode: "standard",
      output_formats: ["markdown"],
      mcp_servers: [
        {
          url: "https://mcp.example.com/sse",
          name: "tracker",
          tool_prefix: "tracker",
          auth: { type: "bearer", token: "test-token" },
          allowed_tools: ["list_issues", "get_issue"],
        },
        { url: "https://other.example.com/mcp" },
      ],
    });
  });

  it("applies the same mapping to workflow runs", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      workflowId: "wf_test",
      search: { countryCode: "US" },
      mcpServers: [
        { url: "https://mcp.example.com/sse", allowedTools: ["search"] },
      ],
    });

    expect(post.mock.calls[0][1]).toEqual({
      workflow_id: "wf_test",
      search: { country_code: "US" },
      mcp_servers: [
        { url: "https://mcp.example.com/sse", allowed_tools: ["search"] },
      ],
    });
  });
});

describe("batch.create request body", () => {
  it("sends search.countryCode as search.country_code", async () => {
    const { valyu, post } = makeClient();

    await valyu.batch.create({
      name: "UK market scan",
      mode: "standard",
      search: { searchType: "web", countryCode: "GB" },
    });

    expect(post.mock.calls[0][1]).toEqual({
      name: "UK market scan",
      mode: "standard",
      search: { search_type: "web", country_code: "GB" },
    });
  });

  it("omits country_code when countryCode is unset", async () => {
    const { valyu, post } = makeClient();

    await valyu.batch.create({ search: { searchType: "web" } });

    expect(post.mock.calls[0][1]).toEqual({
      search: { search_type: "web" },
    });
  });
});

describe("deepresearch.create coverArt and brandCollectionId", () => {
  it("sends coverArt as cover_art with mediaType kept camelCase", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      query: "Q3 board update",
      brandCollectionId: "none",
      coverArt: {
        kind: "image",
        data: "AAAA",
        mediaType: "image/jpeg",
        filename: "cover.jpg",
      },
    });

    const body = post.mock.calls[0][1];
    expect(body.brand_collection_id).toBe("none");
    expect(body.cover_art).toEqual({
      kind: "image",
      data: "AAAA",
      mediaType: "image/jpeg",
      filename: "cover.jpg",
    });
  });

  it("sends a url cover art and omits unset fields", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      query: "Q3 board update",
      coverArt: { url: "https://example.com/a.png" },
    });

    expect(post.mock.calls[0][1].cover_art).toEqual({
      url: "https://example.com/a.png",
    });
  });

  it("omits cover_art when coverArt is unset", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "Q3 board update" });
    expect(post.mock.calls[0][1]).not.toHaveProperty("cover_art");
  });
});

describe("deepresearch.create tools.ultrasearch", () => {
  it("sends tools.ultrasearch: true and no top-level ultrasearch key", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({
      query: "Q3 board update",
      mode: "heavy",
      tools: { ultrasearch: true },
    });
    const body = post.mock.calls[0][1];
    expect(body.tools).toEqual({ ultrasearch: true });
    expect(body).not.toHaveProperty("ultrasearch");
  });

  it("sends tools.ultrasearch with a max_usd cap", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({
      query: "Q3 board update",
      mode: "max",
      tools: { ultrasearch: { max_usd: 1.25 } },
    });
    const body = post.mock.calls[0][1];
    expect(body.tools).toEqual({ ultrasearch: { max_usd: 1.25 } });
    expect(body).not.toHaveProperty("ultrasearch");
  });

  it("omits every ultrasearch key when the option is absent", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({
      query: "Q3 board update",
      mode: "heavy",
      tools: { charts: true },
    });
    const body = post.mock.calls[0][1];
    expect(body.tools).not.toHaveProperty("ultrasearch");
    expect(body).not.toHaveProperty("ultrasearch");
    await valyu.deepresearch.create({ query: "Q3 board update" });
    const plain = post.mock.calls[1][1];
    expect(plain).not.toHaveProperty("tools");
    expect(plain).not.toHaveProperty("ultrasearch");
  });

  it.each([0, -1, NaN, Infinity])(
    "rejects max_usd %p without sending a request",
    async (maxUsd) => {
      const { valyu, post } = makeClient();
      const result = await valyu.deepresearch.create({
        query: "Q3 board update",
        mode: "heavy",
        tools: { ultrasearch: { max_usd: maxUsd } },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("tools.ultrasearch");
      expect(post).not.toHaveBeenCalled();
    }
  );

  it("accepts ultrasearch in a response body type", () => {
    const status: import("../src/types").DeepResearchStatusResponse = {
      success: true,
      tools: { ultrasearch: { max_usd: 0.5 } },
    };
    expect(status.tools?.ultrasearch).toEqual({ max_usd: 0.5 });
  });
});
