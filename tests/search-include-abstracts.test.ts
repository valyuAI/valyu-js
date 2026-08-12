import { Valyu } from "../src/index";

function makeClient() {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: {
      success: true,
      error: null,
      tx_id: "tx_test",
      query: "cancer immunotherapy",
      results: [],
      results_by_source: { web: 0, proprietary: 0 },
      total_deduction_dollars: 0,
      total_characters: 0,
    },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("includeAbstracts", () => {
  it("forwards true as include_abstracts", async () => {
    const { valyu, post } = makeClient();

    await valyu.search("cancer immunotherapy", {
      includedSources: ["valyu/valyu-pubmed"],
      includeAbstracts: true,
    });

    expect(post.mock.calls[0][1].include_abstracts).toBe(true);
  });

  it("omits include_abstracts when the option is unset", async () => {
    const { valyu, post } = makeClient();

    await valyu.search("cancer immunotherapy");

    expect(post.mock.calls[0][1]).not.toHaveProperty("include_abstracts");
  });
});
