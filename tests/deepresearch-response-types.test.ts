import { Valyu } from "../src/index";
import type {
  DeepResearchStatusResponse,
  DeepResearchCostBreakdown,
  ImageMetadata,
  DeliverableResult,
} from "../src/index";

/**
 * Type-level and runtime checks for DeepResearch status responses. Every field
 * added later is optional, and an unknown string value must type-check and
 * pass through the SDK untouched.
 */
describe("DeepResearch response types", () => {
  it("accepts a minimal older response", () => {
    const minimal: DeepResearchStatusResponse = {
      success: true,
      deepresearch_id: "dr_1",
      status: "completed",
      cost: 0.5,
      cost_breakdown: { task: 0.5 },
      images: [
        {
          image_id: "i1",
          image_type: "chart",
          image_url: "https://example.com/i.png",
          title: "T",
          created_at: 1,
        },
      ],
      deliverables: [
        {
          id: "d1",
          request: "r",
          type: "csv",
          status: "completed",
          title: "t",
          url: "u",
          s3_key: "k",
          created_at: 1,
        },
      ],
    };
    expect(minimal.cost_credits).toBeUndefined();
    expect(minimal.cost_detail).toBeUndefined();
    expect(minimal.pending_deliverables).toBeUndefined();
    expect(minimal.error_code).toBeUndefined();
  });

  it("accepts a response with every new field", () => {
    const breakdown: DeepResearchCostBreakdown = {
      task: 1,
      screenshots: 0.1,
      code_execution: 0.1,
      deliverables: 0.1,
      datasets: 0.1,
      x_search: 0.1,
      browse: 0.1,
      ocr: 0.1,
      urls: 0.1,
      other_tools: 0.1,
      future_line: 0.2,
    };
    const image: ImageMetadata = {
      image_id: "i1",
      image_type: "chart",
      image_url: "https://example.com/i.png",
      chart_type: "line",
      chart_kind: "slope",
      created_at: 1700000000000,
      title: "Slope",
    };
    const pending: DeliverableResult = {
      id: "d2",
      request: "r",
      type: "xlsx",
      status: "pending",
      title: "t",
      url: "",
      s3_key: "",
      created_at: 1700000000000,
    };
    const full: DeepResearchStatusResponse = {
      success: true,
      status: "failed",
      mode: "standard",
      research_mode: "standard",
      output_formats: ["markdown", { type: "json", schema: {} }],
      research_output_formats: ["markdown", { type: "json" }],
      cost: 1,
      cost_credits: 100,
      cost_breakdown: breakdown,
      cost_breakdown_credits: { task: 100, datasets: 10 },
      cost_detail: {
        base_usd: 1,
        tools: [
          {
            item: "browse",
            label: "Browse",
            pricing: "per_unit",
            unit: "page",
            units: 5,
            free_units: 2,
            billed_units: 3,
            unit_price_usd: 0.01,
            usd: 0.03,
            credits: 3,
          },
        ],
        datasets: [{ source: "valyu/x", rows: 10, usd: 0.1, credits: 10 }],
        total_usd: 1.13,
        base_credits: 100,
        total_credits: 113,
      },
      images: [image],
      deliverables: [],
      pending_deliverables: [pending],
      error: "boom",
      error_code: "task_failed",
    };
    expect(full.cost_detail?.tools[0].billed_units).toBe(3);
    expect(full.pending_deliverables?.[0].status).toBe("pending");
  });

  it("accepts unknown enum values", () => {
    const body: DeepResearchStatusResponse = {
      success: true,
      status: "some_new_status",
      mode: "some_new_mode",
      output_formats: ["some_new_format"],
      images: [
        {
          image_id: "i",
          image_type: "some_new_image_type",
          chart_type: "some_new_chart",
          chart_kind: "some_new_kind",
          image_url: "u",
        },
      ],
      deliverables: [
        {
          id: "d",
          request: "r",
          type: "odt",
          status: "some_new_state",
          title: "t",
          url: "u",
          s3_key: "k",
        },
      ],
    };
    expect(body.deliverables?.[0].type).toBe("odt");
  });

  it("passes unknown values through status() without throwing", async () => {
    const valyu = new Valyu("val_test");
    const data = {
      deepresearch_id: "dr_1",
      status: "some_new_status",
      research_mode: "some_new_mode",
      research_output_formats: ["markdown", { type: "json" }],
      cost_credits: 12,
      pending_deliverables: [{ id: "d", status: "pending", type: "odt" }],
      error_code: "x",
    };
    (valyu as any).client = {
      get: jest.fn().mockResolvedValue({ status: 200, data, headers: { "content-type": "application/json" } }),
    };
    const res = await valyu.deepresearch.status("dr_1");
    expect(res.success).toBe(true);
    expect(res.status).toBe("some_new_status");
    expect(res.cost_credits).toBe(12);
    expect(res.pending_deliverables?.[0].type).toBe("odt");
    expect(res.error_code).toBe("x");
  });
});

describe("deepresearch.create skills", () => {
  function makeClient() {
    const valyu = new Valyu("val_test");
    const post = jest.fn().mockResolvedValue({
      status: 200,
      data: { deepresearch_id: "dr_test", status: "queued" },
    });
    (valyu as any).client = { post };
    return { valyu, post };
  }

  it("sends skills when given", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "q", skills: ["forecasting"] });
    expect(post.mock.calls[0][1].skills).toEqual(["forecasting"]);
  });

  it("omits skills when not given", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({ query: "q" });
    expect("skills" in post.mock.calls[0][1]).toBe(false);
  });
});
