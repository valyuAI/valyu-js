import { Valyu } from "../src/index";

/**
 * Request timeouts on DeepResearch, batch and workflow calls, stream()'s
 * maximum duration, and error text taken from `message` when an error body
 * has no `error`.
 */

const ok = (data: any = {}) => ({
  status: 200,
  data,
  headers: { "content-type": "application/json" },
});

function stubClient(valyu: Valyu) {
  const client = {
    get: jest.fn().mockResolvedValue(ok({ status: "running" })),
    post: jest.fn().mockResolvedValue(ok({ deepresearch_id: "dr_1" })),
    patch: jest.fn().mockResolvedValue(ok()),
    delete: jest.fn().mockResolvedValue(ok()),
  };
  (valyu as any).client = client;
  return client;
}

const timeoutOf = (call: any[]) => call[call.length - 1]?.timeout;

describe("request timeout", () => {
  it("applies a 120 s default to DeepResearch, batch and workflow requests", async () => {
    const valyu = new Valyu("val_test");
    const client = stubClient(valyu);

    await valyu.deepresearch.create({ query: "q" });
    await valyu.deepresearch.status("dr_1");
    await valyu.deepresearch.respond("dr_1", "int_1", { approved: true });
    await valyu.batch.status("b_1");
    await valyu.workflows.get("ib-company-profile");

    const calls = [...client.post.mock.calls, ...client.get.mock.calls];
    expect(calls).toHaveLength(5);
    for (const call of calls) expect(timeoutOf(call)).toBe(120000);
  });

  it("takes the timeout from the constructor options, 0 disabling it", async () => {
    const valyu = new Valyu("val_test", undefined, { timeout: 5000 });
    const client = stubClient(valyu);
    await valyu.deepresearch.status("dr_1");
    expect(timeoutOf(client.get.mock.calls[0])).toBe(5000);

    const unlimited = new Valyu("val_test", undefined, { timeout: 0 });
    const client2 = stubClient(unlimited);
    await unlimited.deepresearch.status("dr_1");
    expect(timeoutOf(client2.get.mock.calls[0])).toBe(0);
  });

  it("leaves search requests without a timeout", async () => {
    const valyu = new Valyu("val_test");
    const client = stubClient(valyu);
    await valyu.search("test");
    expect(timeoutOf(client.post.mock.calls[0])).toBeUndefined();
  });
});

describe("deepresearch.stream maxWaitTime", () => {
  afterEach(() => jest.restoreAllMocks());

  it("stops with an error once maxWaitTime has passed", async () => {
    const valyu = new Valyu("val_test");
    const client = stubClient(valyu);
    (valyu as any).sleep = jest.fn().mockResolvedValue(undefined);
    let now = 0;
    jest.spyOn(Date, "now").mockImplementation(() => (now += 400));

    const onError = jest.fn();
    await valyu.deepresearch.stream("dr_1", { onError }, { maxWaitTime: 1000 });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("Maximum wait time exceeded");
    expect(client.get.mock.calls.length).toBeGreaterThan(0);
    expect(client.get.mock.calls.length).toBeLessThan(5);
  });
});

describe("error text falls back to message", () => {
  const rejection = (data: any, status = 404) => ({
    response: { status, data, headers: { "content-type": "application/json" } },
    message: `Request failed with status code ${status}`,
  });

  function failingClient(data: any, status?: number) {
    const valyu = new Valyu("val_test");
    const r = rejection(data, status);
    (valyu as any).client = {
      get: jest.fn().mockRejectedValue(r),
      post: jest.fn().mockRejectedValue(r),
      delete: jest.fn().mockRejectedValue(r),
    };
    return valyu;
  }

  it("uses message when error is absent", async () => {
    const valyu = failingClient({ message: "Task not found" });

    const results = [
      await valyu.deepresearch.update("dr_x", "add a section on risks"),
      await valyu.deepresearch.respond("dr_x", "int_1", { approved: true }),
      await valyu.deepresearch.cancel("dr_x"),
      await valyu.deepresearch.delete("dr_x"),
      await valyu.deepresearch.togglePublic("dr_x", true),
      await valyu.deepresearch.list({ limit: 5 }),
      await valyu.batch.status("b_x"),
      await valyu.batch.cancel("b_x"),
      await valyu.batch.list(),
    ];
    for (const r of results) {
      expect(r.success).toBe(false);
      expect(r.error).toBe("Task not found");
    }
  });

  it("prefers error over message", async () => {
    const valyu = failingClient({ error: "Task not found", message: "not_found" });
    const r = await valyu.deepresearch.cancel("dr_x");
    expect(r.error).toBe("Task not found");
  });

  it("falls back to the transport message without a body", async () => {
    const valyu = new Valyu("val_test");
    (valyu as any).client = {
      post: jest.fn().mockRejectedValue({ message: "socket hang up" }),
    };
    const r = await valyu.deepresearch.cancel("dr_x");
    expect(r.error).toBe("socket hang up");
  });

  it("uses message from a status error body", async () => {
    const valyu = new Valyu("val_test");
    (valyu as any).client = {
      get: jest.fn().mockResolvedValue({
        status: 404,
        data: { message: "Task not found" },
        headers: { "content-type": "application/json" },
      }),
    };
    const status = await valyu.deepresearch.status("dr_x");
    expect(status.success).toBe(false);
    expect(status.error).toBe("Task not found");
  });
});
