import { Valyu } from "../src/index";

/**
 * startDate / endDate accept a full ISO-8601 datetime, not just YYYY-MM-DD.
 *
 * The API accepts a sub-day timestamp whenever historicalCache is true — that is
 * how an intraday point-in-time cutoff is expressed. This SDK used to validate
 * against /^\d{4}-\d{2}-\d{2}$/ and reject the datetime form BEFORE sending, so
 * no JS caller could run a sub-day backtest at all, while valyu-py (which does no
 * client-side date validation) could. types.ts already documented the datetime
 * form on DeepResearchSearchConfig, so the SDK contradicted itself.
 */
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
      results_by_source: { web: 0, proprietary: 0 },
      total_deduction_dollars: 0,
      total_characters: 0,
    },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("ISO-8601 datetime date bounds", () => {
  it.each([
    "2026-07-24T04:27:00.000Z",
    "2026-07-24T04:27:00Z",
    "2026-07-24T04:27Z",
    "2026-07-24T04:27:00+01:00",
    "2026-07-24T04:27:00-05:00",
    "2026-07-24T04:27:00",
  ])("sends the request for endDate %s", async (endDate) => {
    const { valyu, post } = makeClient();

    const res = await valyu.search("q", { historicalCache: true, endDate });

    expect(res.error).toBeNull();
    expect(post).toHaveBeenCalled();
    expect(post.mock.calls[0][1].end_date).toBe(endDate);
  });

  it("still accepts a bare date unchanged", async () => {
    const { valyu, post } = makeClient();

    await valyu.search("q", { historicalCache: true, endDate: "2026-07-24" });

    expect(post.mock.calls[0][1].end_date).toBe("2026-07-24");
  });

  it("accepts an ISO datetime on startDate too", async () => {
    const { valyu, post } = makeClient();

    await valyu.search("q", {
      historicalCache: true,
      startDate: "2026-02-24T04:27:00.000Z",
      endDate: "2026-07-24T04:27:00.000Z",
    });

    expect(post.mock.calls[0][1].start_date).toBe("2026-02-24T04:27:00.000Z");
  });

  it.each([
    "24-07-2026",
    "2026/07/24",
    "2026-07-24T",
    "2026-07-24T99:99:99Z",
    "2026-13-45",
    "not-a-date",
    "2026-07-24Tmidnight",
  ])("still rejects malformed value %s", async (endDate) => {
    const { valyu, post } = makeClient();

    const res = await valyu.search("q", { historicalCache: true, endDate });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid endDate format/);
    expect(post).not.toHaveBeenCalled();
  });
});
