import { Valyu } from "../src/index";

function makeClient() {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: {
      success: true,
      error: null,
      tx_id: "tx_test",
      urls_requested: 1,
      urls_processed: 1,
      urls_failed: 0,
      results: [],
      total_cost_dollars: 0,
      total_characters: 0,
    },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("contents maxAge", () => {
  it("omits max_age when unset", async () => {
    const { valyu, post } = makeClient();
    await valyu.contents(["https://example.com"]);
    expect(post.mock.calls[0][1]).not.toHaveProperty("max_age");
  });

  it("sends max_age: 0", async () => {
    const { valyu, post } = makeClient();
    await valyu.contents(["https://example.com"], { maxAge: 0 });
    expect(post.mock.calls[0][1].max_age).toBe(0);
  });

  it("sends a positive max_age", async () => {
    const { valyu, post } = makeClient();
    await valyu.contents(["https://example.com"], { maxAge: 3600 });
    expect(post.mock.calls[0][1].max_age).toBe(3600);
  });

  it("sends max_age on an async request", async () => {
    const { valyu, post } = makeClient();
    await valyu.contents(["https://example.com"], { async: true, maxAge: 60 });
    expect(post.mock.calls[0][1].max_age).toBe(60);
  });
});
