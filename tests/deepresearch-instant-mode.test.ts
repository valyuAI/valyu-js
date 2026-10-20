import { Valyu } from "../src/index";

/**
 * Instant mode: the API reports an instant task's mode as `research_mode` and
 * leaves `mode` out. The SDK mirrors it into `mode` so it reads the same way
 * as every other task's mode.
 */

function json(data: any) {
  return { status: 200, data, headers: { "content-type": "application/json" } };
}

const INSTANT_CREATED = {
  deepresearch_id: "dr_instant",
  status: "queued",
  created_at: "2026-10-20T10:21:50.020Z",
  research_mode: "instant",
};

const INSTANT_COMPLETED = {
  deepresearch_id: "dr_instant",
  status: "completed",
  research_mode: "instant",
  output: "# Canberra\n\nCanberra is Australia's capital.",
  cost: 0.05,
};

describe("deepresearch instant mode", () => {
  it("sends mode: instant on create", async () => {
    const valyu = new Valyu("val_test");
    const post = jest.fn().mockResolvedValue(json(INSTANT_CREATED));
    (valyu as any).client = { post };

    await valyu.deepresearch.create({
      query: "What is the capital of Australia?",
      mode: "instant",
    });

    expect(post.mock.calls[0][1]).toEqual({
      query: "What is the capital of Australia?",
      mode: "instant",
      output_formats: ["markdown"],
    });
  });

  it("fills mode from research_mode on the create response", async () => {
    const valyu = new Valyu("val_test");
    (valyu as any).client = {
      post: jest.fn().mockResolvedValue(json(INSTANT_CREATED)),
    };

    const task = await valyu.deepresearch.create({
      query: "What is the capital of Australia?",
      mode: "instant",
    });

    expect(task.success).toBe(true);
    expect(task.mode).toBe("instant");
    expect(task.research_mode).toBe("instant");
  });

  it("fills mode from research_mode on status and wait", async () => {
    const valyu = new Valyu("val_test");
    (valyu as any).client = {
      get: jest.fn().mockResolvedValue(json(INSTANT_COMPLETED)),
    };

    const status = await valyu.deepresearch.status("dr_instant");
    expect(status.mode).toBe("instant");
    expect(status.research_mode).toBe("instant");

    const result = await valyu.deepresearch.wait("dr_instant");
    expect(result.status).toBe("completed");
    expect(result.mode).toBe("instant");
    expect(result.cost).toBe(0.05);
  });

  it("keeps the API's mode when it is present", async () => {
    const valyu = new Valyu("val_test");
    (valyu as any).client = {
      get: jest
        .fn()
        .mockResolvedValue(
          json({ deepresearch_id: "dr_fast", status: "running", mode: "fast" })
        ),
    };

    const status = await valyu.deepresearch.status("dr_fast");
    expect(status.mode).toBe("fast");
    expect(status.research_mode).toBeUndefined();
  });
});
