import { Valyu } from "../src/index";

function makeClient() {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: {
      success: true,
      error: null,
      tx_id: "tx_test",
      query: "q",
      results: [],
      urls_requested: 1,
      urls_processed: 1,
      urls_failed: 0,
      results_by_source: { web: 0, proprietary: 0 },
      total_deduction_dollars: 0,
      total_cost_dollars: 0,
      total_characters: 0,
    },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("includeImageLinks", () => {
  describe("search", () => {
    it("sends include_image_links: false when set to false", async () => {
      const { valyu, post } = makeClient();
      await valyu.search("solar panels", { includeImageLinks: false });
      expect(post.mock.calls[0][1].include_image_links).toBe(false);
    });

    it("omits include_image_links when true", async () => {
      const { valyu, post } = makeClient();
      await valyu.search("solar panels", { includeImageLinks: true });
      expect(post.mock.calls[0][1]).not.toHaveProperty("include_image_links");
    });

    it("omits include_image_links when unset", async () => {
      const { valyu, post } = makeClient();
      await valyu.search("solar panels");
      expect(post.mock.calls[0][1]).not.toHaveProperty("include_image_links");
    });
  });

  describe("contents", () => {
    it("sends include_image_links: false when set to false", async () => {
      const { valyu, post } = makeClient();
      await valyu.contents(["https://example.com"], { includeImageLinks: false });
      expect(post.mock.calls[0][1].include_image_links).toBe(false);
    });

    it("omits include_image_links when true", async () => {
      const { valyu, post } = makeClient();
      await valyu.contents(["https://example.com"], { includeImageLinks: true });
      expect(post.mock.calls[0][1]).not.toHaveProperty("include_image_links");
    });

    it("omits include_image_links when unset", async () => {
      const { valyu, post } = makeClient();
      await valyu.contents(["https://example.com"]);
      expect(post.mock.calls[0][1]).not.toHaveProperty("include_image_links");
    });
  });
});
