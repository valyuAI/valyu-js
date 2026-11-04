/**
 * Tests for answer(query, { engine: "deepresearch_instant" }): the opt-in path that runs a
 * DeepResearch `instant` task and adapts it into the Answer API's response shape. The default
 * engine ("default") is untouched by this file.
 */

import { Valyu } from "../src/index";
import { AnswerResponse, AnswerStreamChunk } from "../src/types";

function client(): Valyu {
  return new Valyu("test-key");
}

function completedStatus(overrides: Record<string, any> = {}) {
  return {
    success: true,
    deepresearch_id: "dr_1",
    status: "completed",
    query: "what is the capital of australia",
    output: "Canberra is the capital of Australia.",
    sources: [
      { title: "Capital cities", url: "https://example.com/a", snippet: "Canberra...", source: "web" },
    ],
    cost: 0.05, // sample value
    ...overrides,
  };
}

describe("answer(engine: 'deepresearch_instant')", () => {
  test("throws before creating a task for unsupported params", async () => {
    const c = client();
    const create = jest.spyOn(c.deepresearch, "create");

    await expect(
      c.answer("q", { engine: "deepresearch_instant", dataMaxPrice: 1 })
    ).rejects.toThrow(/dataMaxPrice/);
    await expect(
      c.answer("q", { engine: "deepresearch_instant", fastMode: true })
    ).rejects.toThrow(/fastMode/);
    await expect(
      c.answer("q", { engine: "deepresearch_instant", searchType: "news" })
    ).rejects.toThrow(/searchType/);

    expect(create).not.toHaveBeenCalled();
  });

  test("fetch adapts a completed instant task", async () => {
    const c = client();
    jest
      .spyOn(c.deepresearch, "create")
      .mockResolvedValue({ success: true, deepresearch_id: "dr_1", status: "queued" } as any);
    jest.spyOn(c.deepresearch, "wait").mockResolvedValue(completedStatus() as any);

    const result = (await c.answer("What is the capital of Australia?", {
      engine: "deepresearch_instant",
    })) as AnswerResponse;

    expect(c.deepresearch.create).toHaveBeenCalledWith(
      expect.objectContaining({ query: "What is the capital of Australia?", mode: "instant" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tx_id).toBe("dr_1");
      expect(result.contents).toContain("Canberra");
      expect(result.search_results).toHaveLength(1);
      expect(result.cost.total_deduction_dollars).toBe(0.05);
    }
  });

  test("fetch returns an error response on a failed task", async () => {
    const c = client();
    jest
      .spyOn(c.deepresearch, "create")
      .mockResolvedValue({ success: true, deepresearch_id: "dr_1", status: "queued" } as any);
    jest.spyOn(c.deepresearch, "wait").mockResolvedValue({
      success: true,
      deepresearch_id: "dr_1",
      status: "failed",
      error_message: "research_failed",
    } as any);

    const result = (await c.answer("q", { engine: "deepresearch_instant" })) as AnswerResponse;

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("research_failed");
    }
  });

  test("streaming emits synthetic search_results, content, metadata, done", async () => {
    const c = client();
    jest
      .spyOn(c.deepresearch, "create")
      .mockResolvedValue({ success: true, deepresearch_id: "dr_1", status: "queued" } as any);
    jest.spyOn(c.deepresearch, "wait").mockResolvedValue(completedStatus() as any);

    const generator = (await c.answer("q", {
      engine: "deepresearch_instant",
      streaming: true,
    })) as AsyncGenerator<AnswerStreamChunk, void, unknown>;

    const chunks: AnswerStreamChunk[] = [];
    for await (const chunk of generator) chunks.push(chunk);

    expect(chunks.map((c) => c.type)).toEqual(["search_results", "content", "metadata", "done"]);
    expect(chunks[0].search_results).toHaveLength(1);
    expect(chunks[1].content).toContain("Canberra");
    expect(chunks[2].tx_id).toBe("dr_1");
  });

  test("create failure surfaces as an error response, not a thrown exception", async () => {
    const c = client();
    jest
      .spyOn(c.deepresearch, "create")
      .mockResolvedValue({ success: false, error: "credits.insufficient" } as any);

    const result = (await c.answer("q", { engine: "deepresearch_instant" })) as AnswerResponse;

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("credits.insufficient");
    }
  });

  test("default engine is unchanged: the default /answer path is still used when engine is omitted", async () => {
    const c = client();
    const create = jest.spyOn(c.deepresearch, "create");
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    } as any);

    await c.answer("q");

    expect(fetchSpy).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
