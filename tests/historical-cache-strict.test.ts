import { Valyu } from "../src/index";

/**
 * historical_cache_strict — per-request point-in-time strictness.
 *
 * The API has accepted this on /deepsearch and /contents for some time, but no
 * SDK exposed it. This SDK builds its payload by explicitly picking known
 * fields, so an unrecognised option was silently DROPPED: a caller could set
 * strict "only", get no error, and have the request go out as "prefer" — a
 * backtest believing it was leak-safe when it was not. These tests pin the
 * wiring so it cannot regress to that state.
 */
function makeClient(query = "fed rate decision") {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: {
      success: true,
      error: null,
      tx_id: "tx_test",
      query,
      results: [],
      results_by_source: { web: 0, proprietary: 0 },
      total_deduction_dollars: 0,
      total_characters: 0,
    },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("historicalCacheStrict", () => {
  it("forwards 'only' as historical_cache_strict on search", async () => {
    const { valyu, post } = makeClient();

    await valyu.search("fed rate decision", {
      historicalCache: true,
      endDate: "2026-07-24T04:27:00.000Z",
      historicalCacheStrict: "only",
    });

    expect(post.mock.calls[0][1].historical_cache_strict).toBe("only");
  });

  it.each(["off", "prefer", "only"] as const)(
    "forwards '%s' verbatim",
    async (mode) => {
      const { valyu, post } = makeClient();

      await valyu.search("fed rate decision", {
        historicalCache: true,
        historicalCacheStrict: mode,
      });

      expect(post.mock.calls[0][1].historical_cache_strict).toBe(mode);
    }
  );

  it("omits the field entirely when unset, so the API default applies", async () => {
    const { valyu, post } = makeClient();

    await valyu.search("fed rate decision", { historicalCache: true });

    expect(post.mock.calls[0][1]).not.toHaveProperty("historical_cache_strict");
    // historicalCache itself must still be sent — guards against a copy/paste
    // regression that drops both.
    expect(post.mock.calls[0][1].historical_cache).toBe(true);
  });

  it("forwards historical_cache_strict on contents", async () => {
    const { valyu, post } = makeClient();

    await valyu.contents(["https://example.test/a"], {
      historicalCache: true,
      historicalCacheStrict: "only",
    });

    expect(post.mock.calls[0][1].historical_cache_strict).toBe("only");
  });

  it("omits it on contents when unset", async () => {
    const { valyu, post } = makeClient();

    await valyu.contents(["https://example.test/a"], { historicalCache: true });

    expect(post.mock.calls[0][1]).not.toHaveProperty("historical_cache_strict");
  });
});
