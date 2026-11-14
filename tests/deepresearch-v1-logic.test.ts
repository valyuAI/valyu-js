import { Valyu } from "../src/index";
import type { DeepResearchCostBreakdown } from "../src/types";

/** Old v1 request logic the SDK no longer sends, and response forms it accepts. */
function makeClient(postData: unknown = { deepresearch_id: "dr_test", status: "queued" }, getData: unknown = []) {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({ status: 200, data: postData });
  const get = jest.fn().mockResolvedValue({ status: 200, data: getData });
  (valyu as any).client = { post, get };
  return { valyu, post, get };
}

describe("mode lite", () => {
  it("is sent as standard on a task create", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "q", mode: "lite" });
    expect(post.mock.calls[0][1].mode).toBe("standard");
  });

  it("is sent as standard on a batch create", async () => {
    const { valyu, post } = makeClient({ batch_id: "b", status: "open" });
    await valyu.batch.create({ name: "b", mode: "lite" });
    expect(post.mock.calls[0][1].mode).toBe("standard");
  });

  it("leaves other modes as they are", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "q", mode: "heavy" });
    expect(post.mock.calls[0][1].mode).toBe("heavy");
  });
});

describe("batch list", () => {
  it("accepts a list body", async () => {
    const { valyu } = makeClient(undefined, [{ batch_id: "a" }]);
    const r = await valyu.batch.list({ limit: 20 });
    expect(r.batches?.map((b: any) => b.batch_id)).toEqual(["a"]);
  });

  it("accepts a { batches } body", async () => {
    const { valyu } = makeClient(undefined, { batches: [{ batch_id: "a" }, { batch_id: "b" }] });
    const r = await valyu.batch.list();
    expect(r.batches?.length).toBe(2);
  });
});

describe("cost_breakdown types", () => {
  it("type the v2 form", () => {
    const v2: DeepResearchCostBreakdown = { task: 0.15, base_usd: 0.15, tools: [{ item: "xSearch", usd: 0.6 }], datasets: [{ source: "s", usd: 0 }], total_usd: 0.75, base_credits: 24, total_credits: 120 };
    const v1: DeepResearchCostBreakdown = { task: 1, datasets: 0.2 };
    expect([v2.datasets, v1.datasets]).toEqual([[{ source: "s", usd: 0 }], 0.2]);
  });
});
