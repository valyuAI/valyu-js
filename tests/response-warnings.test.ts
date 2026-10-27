import { Valyu } from "../src/index";
import type { AnswerStreamChunk, AnswerSuccessResponse } from "../src/types";

const WARNING = {
  type: "datasets_not_in_plan",
  message: "Your plan doesn't include valyu/valyu-biorxiv, so it was skipped.",
  detail: { upgrade_url: "https://platform.valyu.ai/user/account/billing?tab=plan" },
};

const SEARCH_BODY = {
  success: true,
  tx_id: "tx_test",
  query: "q",
  results: [],
  results_by_source: { web: 0, proprietary: 0 },
  total_deduction_dollars: 0,
  total_characters: 0,
};

function searchWith(extra: Record<string, unknown>) {
  const valyu = new Valyu("val_test");
  (valyu as any).client = {
    post: jest.fn().mockResolvedValue({ status: 200, data: { ...SEARCH_BODY, ...extra } }),
  };
  return valyu.search("q");
}

function sseResponse(body: Record<string, unknown>) {
  const text = `data: ${JSON.stringify(body)}\n\ndata: [DONE]\n\n`;
  let done = false;
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    body: {
      getReader: () => ({
        read: async () => {
          if (done) return { done: true, value: undefined };
          done = true;
          return { done: false, value: new TextEncoder().encode(text) };
        },
      }),
    },
  };
}

describe("response warnings", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("passes object warnings through", async () => {
    expect((await searchWith({ warnings: [WARNING] })).warnings).toEqual([WARNING]);
  });

  it("normalises string warnings", async () => {
    expect((await searchWith({ warnings: ["Skipped a dataset"] })).warnings).toEqual([
      { type: "warning", message: "Skipped a dataset" },
    ]);
  });

  it("leaves warnings undefined when absent", async () => {
    expect((await searchWith({})).warnings).toBeUndefined();
  });

  it("drops junk entries without throwing", async () => {
    const result = await searchWith({ warnings: [42, null, { type: "x" }, "kept", WARNING] });
    expect(result.success).toBe(true);
    expect(result.warnings?.map((w) => w.message)).toEqual(["kept", WARNING.message]);
    expect((await searchWith({ warnings: "oops" })).warnings).toBeUndefined();
  });

  it("normalises DeepResearch create and status warnings", async () => {
    const valyu = new Valyu("val_test");
    (valyu as any).client.post = jest.fn().mockResolvedValue({
      status: 200,
      data: { deepresearch_id: "dr_1", status: "queued", warnings: ["Skipped a dataset"] },
    });
    (valyu as any).client.get = jest.fn().mockResolvedValue({
      status: 200,
      headers: { "content-type": "application/json" },
      data: { deepresearch_id: "dr_1", status: "running", warnings: [WARNING] },
    });

    const created = await valyu.deepresearch.create({ query: "q" });
    expect(created.warnings).toEqual([{ type: "warning", message: "Skipped a dataset" }]);
    expect((await valyu.deepresearch.status("dr_1")).warnings).toEqual([WARNING]);
  });

  it("carries warnings on the answer response and stream metadata", async () => {
    const valyu = new Valyu("val_test");
    const body = { success: true, tx_id: "tx_a", contents: "hi", warnings: [WARNING, "old"] };
    const expected = [WARNING, { type: "warning", message: "old" }];

    global.fetch = jest.fn().mockResolvedValue(sseResponse(body)) as any;
    const answer = (await valyu.answer("q")) as AnswerSuccessResponse;
    expect(answer.warnings).toEqual(expected);

    global.fetch = jest.fn().mockResolvedValue(sseResponse(body)) as any;
    const stream = (await valyu.answer("q", { streaming: true })) as AsyncGenerator<AnswerStreamChunk>;
    const chunks: AnswerStreamChunk[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(chunks.find((c) => c.type === "metadata")?.warnings).toEqual(expected);
  });
});
