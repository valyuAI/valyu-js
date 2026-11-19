import { Valyu } from "../src/index";
import type { Deliverable, KnownDeliverableType } from "../src/types";

function makeClient() {
  const valyu = new Valyu("val_test");
  const post = jest.fn().mockResolvedValue({
    status: 200,
    data: { deepresearch_id: "dr_test", status: "queued" },
  });
  (valyu as any).client = { post };
  return { valyu, post };
}

describe("json and html deliverables", () => {
  it("accepts html and json as known deliverable types", () => {
    const types: KnownDeliverableType[] = ["html", "json"];
    const d: Deliverable[] = types.map((type) => ({ type, description: "x" }));
    expect(d.map((x) => x.type)).toEqual(["html", "json"]);
  });

  it("sends a json deliverable schema unchanged, nested keys intact", async () => {
    const { valyu, post } = makeClient();
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["company_name"],
      properties: {
        company_name: { type: "string" },
        revenue_items: { type: "array", items: { $ref: "#/$defs/line_item" } },
      },
      $defs: {
        line_item: {
          type: "object",
          additionalProperties: false,
          properties: { fiscal_year: { type: "integer" }, camelCaseKey: { type: "number" } },
        },
      },
    };
    const before = JSON.parse(JSON.stringify(schema));

    await valyu.deepresearch.create({
      query: "Revenue history",
      deliverables: [
        { type: "json", description: "Revenue by year", schema },
        { type: "html", description: "One page summary" },
      ],
    });

    const body = post.mock.calls[0][1];
    expect(body.deliverables[0]).toEqual({ type: "json", description: "Revenue by year", schema: before });
    expect(body.deliverables[1]).toEqual({ type: "html", description: "One page summary" });
    expect(schema).toEqual(before);
  });
});
