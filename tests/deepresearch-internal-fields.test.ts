import { Valyu, stripInternalFields } from "../src/index";

function withBody(valyu: Valyu, body: unknown): void {
  (valyu as any).client.defaults.adapter = async (config: any) => ({ data: JSON.parse(JSON.stringify(body)), status: 200, statusText: "OK", headers: { "content-type": "application/json" }, config });
}

describe("internal DeepResearch fields", () => {
  test("status drops internal deliverable and source keys and keeps the rest", async () => {
    const valyu = new Valyu("test-key");
    withBody(valyu, {
      deepresearch_id: "t1",
      status: "completed",
      deliverables: [{ id: "f_01", type: "csv", status: "completed", s3_key: "internal/key", url: "https://x" }],
      sources: [{ title: "A", url: "https://a", org_id: "o", doc_id: 1, source_id: 2, source: "web" }],
    });
    const r: any = await valyu.deepresearch.status("t1");
    expect(r.success).toBe(true);
    expect(r.deliverables[0]).not.toHaveProperty("s3_key");
    expect(r.deliverables[0].url).toBe("https://x");
    for (const k of ["org_id", "doc_id", "source_id"]) expect(r.sources[0]).not.toHaveProperty(k);
    expect(r.sources[0].source).toBe("web");
  });

  test("batch bodies drop internal ids, top level and in a list", () => {
    const one = stripInternalFields({ batch_id: "b1", organisation_id: "o", api_key_id: "k", credit_id: "c", status: "open" });
    expect(one).toEqual({ batch_id: "b1", status: "open" });
    const page = stripInternalFields({ batches: [{ batch_id: "b2", organisation_id: "o", name: "n" }] });
    expect(page.batches[0]).toEqual({ batch_id: "b2", name: "n" });
  });

  test("other responses are not changed", async () => {
    const valyu = new Valyu("test-key");
    (valyu as any).client.defaults.adapter = async (config: any) => ({ data: { results: [{ org_id: "kept", url: "u" }], success: true }, status: 200, statusText: "OK", headers: { "content-type": "application/json" }, config });
    const res = await (valyu as any).client.post("https://api.valyu.ai/v1/search", {});
    expect(res.data.results[0].org_id).toBe("kept");
  });
});
