/**
 * Tests that a workflow run sends the same per-run options a freeform run does.
 *
 * The workflow template supplies the freeform fields (prompt, strategy, report
 * format). Everything else — deliverables, search, previousReports, hitl, urls,
 * files, mcpServers, brandCollectionId — is a per-run concern the API accepts
 * either way, so it must reach the wire rather than being dropped when
 * workflowId is set.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { Valyu } from "../src/index";

const packageVersion: string = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf8")
).version;

/** Per-run options that must survive on both code paths. */
const SHARED_OPTIONS = {
  deliverables: ["xlsx"],
  search: { startDate: "2019-01-01", includedSources: ["finance"] },
  previousReports: ["dr_a", "dr_b"],
  hitl: { planReview: true },
  urls: ["https://example.com"],
  mcpServers: [{ name: "srv", url: "https://mcp.example.com" }],
  brandCollectionId: "brand_1",
  metadata: { deal: "project-frost" },
  tools: { code_execution: { enabled: true, max_calls: 5 } },
  webhookUrl: "https://example.com/hook",
  alertEmail: "analyst@example.com",
} as any;

/** The snake_case body the shared options are expected to serialise into. */
const EXPECTED_WIRE_FIELDS = {
  deliverables: ["xlsx"],
  search: { start_date: "2019-01-01", included_sources: ["finance"] },
  previous_reports: ["dr_a", "dr_b"],
  hitl: { plan_review: true },
  urls: ["https://example.com"],
  mcp_servers: [{ name: "srv", url: "https://mcp.example.com" }],
  brand_collection_id: "brand_1",
  metadata: { deal: "project-frost" },
  tools: { code_execution: { enabled: true, max_calls: 5 } },
  webhook_url: "https://example.com/hook",
  alert_email: "analyst@example.com",
};

function makeClient() {
  const valyu = new Valyu("val_test");
  const post = jest
    .fn()
    .mockResolvedValue({ data: { deepresearch_id: "dr_123", status: "queued" } });
  (valyu as any).client = { post };
  return { valyu, post };
}

/** The JSON body handed to client.post. */
function sentPayload(post: jest.Mock) {
  return post.mock.calls[0][1];
}

describe("workflow run payload", () => {
  it("forwards every per-run option", async () => {
    const { valyu, post } = makeClient();

    const result = await valyu.deepresearch.create({
      workflowId: "ib-comps-analysis",
      workflowParams: { target: "Datadog (DDOG)" },
      ...SHARED_OPTIONS,
    });

    expect(result.success).toBe(true);
    const payload = sentPayload(post);
    expect(payload.workflow_id).toBe("ib-comps-analysis");
    expect(payload.workflow_params).toEqual({ target: "Datadog (DDOG)" });
    for (const [key, value] of Object.entries(EXPECTED_WIRE_FIELDS)) {
      expect(payload[key]).toEqual(value);
    }
  });

  it("serialises per-run options identically to a freeform run", async () => {
    const workflow = makeClient();
    await workflow.valyu.deepresearch.create({
      workflowId: "ib-comps-analysis",
      workflowParams: { target: "Datadog (DDOG)" },
      ...SHARED_OPTIONS,
    });

    const freeform = makeClient();
    await freeform.valyu.deepresearch.create({
      query: "a freeform query",
      ...SHARED_OPTIONS,
    });

    const workflowPayload = sentPayload(workflow.post);
    const freeformPayload = sentPayload(freeform.post);
    for (const key of Object.keys(EXPECTED_WIRE_FIELDS)) {
      expect(workflowPayload[key]).toEqual(freeformPayload[key]);
    }
  });

  it("stays minimal when no per-run options are set", async () => {
    const { valyu, post } = makeClient();

    await valyu.deepresearch.create({
      workflowId: "ib-company-profile",
      workflowParams: { company: "NVIDIA (NVDA)" },
    });

    expect(sentPayload(post)).toEqual({
      workflow_id: "ib-company-profile",
      workflow_params: { company: "NVIDIA (NVDA)" },
    });
  });

  it("applies the files[].context cap", async () => {
    const { valyu, post } = makeClient();

    const result = await valyu.deepresearch.create({
      workflowId: "ib-company-profile",
      workflowParams: { company: "NVIDIA (NVDA)" },
      files: [{ url: "https://example.com/a.pdf", context: "x".repeat(10001) }],
    } as any);

    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain("files[0].context exceeds 10,000 character limit");
  });

  it("stays mutually exclusive with the template-supplied fields", async () => {
    const { valyu, post } = makeClient();

    const result = await valyu.deepresearch.create({
      workflowId: "ib-company-profile",
      workflowParams: { company: "NVIDIA (NVDA)" },
      query: "a freeform query",
    });

    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain("mutually exclusive");
  });
});

describe("SDK version", () => {
  it("matches package.json", async () => {
    const { valyu, post } = makeClient();
    await valyu.deepresearch.create({
      workflowId: "ib-company-profile",
      workflowParams: { company: "NVIDIA (NVDA)" },
    });

    // Reported on every request, so a constant that drifts from the published
    // version misreports which build a request came from.
    const headers = (valyu as any).headers;
    expect(headers["x-valyu-sdk-version"] ?? headers["X-Valyu-SDK-Version"]).toBe(
      packageVersion
    );
  });
});
