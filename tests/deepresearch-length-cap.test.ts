import { Valyu } from "../src/index";

/**
 * The DeepResearch create endpoint rejects requests whose combined
 * research_strategy (or legacy strategy) + report_format length is strictly
 * greater than 15,000 characters. These tests verify the client-side pre-check
 * short-circuits at 15,001 without a network call, and lets 15,000 through.
 */
describe("deepresearch.create combined length cap", () => {
  const MAX = 15000;

  function makeClient(): { valyu: Valyu; post: jest.Mock } {
    const valyu = new Valyu("test-key", "https://api.valyu.ai/v1");
    // Replace the axios instance's post so nothing ever hits the network.
    const post = jest
      .fn()
      .mockResolvedValue({ data: { task_id: "task_123", status: "queued" } });
    (valyu as any).client.post = post;
    return { valyu, post };
  }

  it("does not short-circuit at exactly 15,000 combined characters", async () => {
    const { valyu, post } = makeClient();

    const result = await valyu.deepresearch.create({
      query: "some research question",
      researchStrategy: "a".repeat(MAX),
      // reportFormat omitted -> combined === 15000, which is allowed
    });

    // The guard let the request through to the network layer.
    expect(post).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("returns the server-identical error at 15,001 without a network call", async () => {
    const { valyu, post } = makeClient();

    const result = await valyu.deepresearch.create({
      query: "some research question",
      researchStrategy: "a".repeat(MAX),
      reportFormat: "b", // combined === 15001, first failing value
    });

    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "research_strategy and report_format combined length (15001) exceeds 15,000 character limit"
    );
  });

  it("counts the legacy strategy alias toward the cap", async () => {
    const { valyu, post } = makeClient();

    const result = await valyu.deepresearch.create({
      query: "some research question",
      strategy: "a".repeat(MAX),
      reportFormat: "b", // combined === 15001 via legacy alias
    });

    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "research_strategy and report_format combined length (15001) exceeds 15,000 character limit"
    );
  });
});
