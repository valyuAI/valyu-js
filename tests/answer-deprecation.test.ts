import { Valyu } from "../src/index";

function sseResponse(body: any) {
  const encoder = new TextEncoder();
  const chunks = [`data: ${JSON.stringify(body)}\n\n`, "data: [DONE]\n\n"];
  let i = 0;
  const response: any = {
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: async () => body,
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length
            ? { done: false, value: encoder.encode(chunks[i++]) }
            : { done: true, value: undefined },
        releaseLock: () => {},
      }),
    },
  };
  response.clone = () => response;
  return response;
}

describe("answer() deprecation warning", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("warns once per process across calls and still works", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const body = { success: true, tx_id: "tx_1", contents: "hi" };
    global.fetch = jest.fn().mockImplementation(async () => sseResponse(body)) as any;
    const valyu = new Valyu("test-key");

    const first: any = await valyu.answer("q");
    await valyu.answer("q");

    expect(first.success).toBe(true);
    const calls = warn.mock.calls.filter((c) => String(c[0]).includes("deprecated"));
    expect(calls).toHaveLength(1);
    const message = String(calls[0][0]);
    expect(message).toContain("2026-12-17");
    expect(message).toContain("mode: 'instant'");
    expect(message).toContain("migrate-from-answer");
  });
});
