/**
 * Tests that API validation detail survives into SDK error strings.
 *
 * The API returns an `errors` array naming each offending field. Keeping only
 * the summary ("2 validation errors") leaves a caller unable to tell which
 * parameter was wrong or what the API expected instead.
 */

import { Valyu } from "../src/index";

function makeClient(rejection: any) {
  const valyu = new Valyu("val_test");
  (valyu as any).client = {
    post: jest.fn().mockRejectedValue(rejection),
    get: jest.fn().mockRejectedValue(rejection),
  };
  return valyu;
}

const VALIDATION_FAILURE = {
  response: {
    status: 400,
    data: {
      error: "validation_failed",
      message: "2 validation errors",
      errors: [
        {
          code: "unknown_param",
          key: "company",
          message: 'Unknown parameter "company"',
        },
        {
          code: "missing_param",
          key: "target",
          message: 'Required parameter "target" is missing',
        },
      ],
    },
  },
  message: "Request failed with status code 400",
};

describe("API error messages", () => {
  it("names the offending fields on a workflow run", async () => {
    const valyu = makeClient(VALIDATION_FAILURE);

    const result = await valyu.deepresearch.create({
      workflowId: "ib-comps-analysis",
      workflowParams: { company: "Datadog (DDOG)" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("2 validation errors");
    expect(result.error).toContain('Unknown parameter "company"');
    expect(result.error).toContain('Required parameter "target" is missing');
  });

  it("names the offending fields on workflows.preview", async () => {
    const valyu = makeClient(VALIDATION_FAILURE);

    const result = await valyu.workflows.preview("ib-comps-analysis", {
      workflowParams: { company: "Datadog (DDOG)" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown parameter "company"');
  });

  it("prefixes the key when the detail does not name it", async () => {
    const valyu = makeClient({
      response: {
        status: 400,
        data: {
          message: "1 validation error",
          errors: [{ code: "missing_param", key: "sector" }],
        },
      },
      message: "Request failed with status code 400",
    });

    const result = await valyu.deepresearch.create({
      workflowId: "ib-precedent-transactions",
      workflowParams: {},
    });

    expect(result.error).toContain("sector: missing_param");
  });

  it("falls back to the summary when there is no errors array", async () => {
    const valyu = makeClient({
      response: { status: 402, data: { error: "Insufficient credits" } },
      message: "Request failed with status code 402",
    });

    const result = await valyu.deepresearch.create({ query: "a query" });

    expect(result.error).toBe("Insufficient credits");
  });

  it("falls back to the thrown message when there is no response body", async () => {
    const valyu = makeClient(new Error("socket hang up"));

    const result = await valyu.deepresearch.create({ query: "a query" });

    expect(result.error).toBe("socket hang up");
  });
});
