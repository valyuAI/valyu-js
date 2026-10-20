import { Valyu } from "../src/index";

/**
 * deepresearch.wait() with onInteraction. The status can keep showing a
 * checkpoint for a moment after it was answered, so wait() must offer each
 * checkpoint once and keep its poll interval after responding.
 */

type FakeResponse = { status: number; data: any; headers: Record<string, string> };

function json(data: any, headers: Record<string, string> = {}): FakeResponse {
  return {
    status: 200,
    data,
    headers: { "content-type": "application/json", ...headers },
  };
}

function paused(interactionId: string, etag?: string): FakeResponse {
  return json(
    {
      deepresearch_id: "dr_1",
      status: "paused",
      interaction: {
        interaction_id: interactionId,
        type: "plan_review",
        data: { plan: "1. Search filings\n2. Summarise" },
        created_at: 1760000000000,
        timeout_ms: 600000,
      },
    },
    etag ? { etag } : {}
  );
}

const running = () => json({ deepresearch_id: "dr_1", status: "running" });
const completed = () =>
  json({ deepresearch_id: "dr_1", status: "completed", output: "report" });
const notModified = (): FakeResponse => ({ status: 304, data: "", headers: {} });

function makeClient(responses: FakeResponse[], post: jest.Mock) {
  const valyu = new Valyu("test-key");
  const get = jest.fn();
  for (const r of responses) get.mockResolvedValueOnce(r);
  (valyu as any).client = { get, post };
  const sleep = jest.fn().mockResolvedValue(undefined);
  (valyu as any).sleep = sleep;
  return { valyu, get, sleep };
}

const accepted = () =>
  jest.fn().mockResolvedValue({ status: 200, data: { status: "running" } });

describe("deepresearch.wait HITL handling", () => {
  it("answers each checkpoint once while the status still shows it", async () => {
    const post = accepted();
    const { valyu, get, sleep } = makeClient(
      [
        paused("int_1", 'W/"a"'),
        paused("int_1", 'W/"a"'),
        notModified(),
        running(),
        paused("int_2"),
        paused("int_2"),
        completed(),
      ],
      post
    );
    const onInteraction = jest.fn().mockResolvedValue({ approved: true });

    const result = await valyu.deepresearch.wait("dr_1", { onInteraction });

    expect(result.status).toBe("completed");
    expect(onInteraction.mock.calls.map((c) => c[0].interaction_id)).toEqual([
      "int_1",
      "int_2",
    ]);
    expect(post.mock.calls.map((c) => c[1].interaction_id)).toEqual([
      "int_1",
      "int_2",
    ]);
    // Every poll but the last is followed by the normal interval, including
    // the polls right after responding.
    expect(get).toHaveBeenCalledTimes(7);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual(Array(6).fill(5000));
  });

  it("waits the poll interval after responding", async () => {
    const post = accepted();
    const order: string[] = [];
    post.mockImplementation(async () => {
      order.push("respond");
      return { status: 200, data: { status: "running" } };
    });
    const { valyu, sleep } = makeClient([paused("int_1"), completed()], post);
    sleep.mockImplementation(async (ms: number) => {
      order.push(`sleep ${ms}`);
    });

    await valyu.deepresearch.wait("dr_1", {
      pollInterval: 2000,
      onInteraction: () => ({ approved: true }),
    });

    expect(order).toEqual(["respond", "sleep 2000"]);
  });

  it("offers a checkpoint again when the response was not delivered", async () => {
    const post = jest
      .fn()
      .mockRejectedValueOnce({
        response: { status: 503, data: { message: "Service unavailable" } },
        message: "Request failed with status code 503",
      })
      .mockResolvedValueOnce({ status: 200, data: { status: "running" } });
    const { valyu } = makeClient(
      [paused("int_1"), paused("int_1"), paused("int_1"), completed()],
      post
    );
    const onInteraction = jest.fn().mockResolvedValue({ approved: true });

    await valyu.deepresearch.wait("dr_1", { onInteraction });

    expect(onInteraction).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("does not ask again about a checkpoint the callback left unanswered", async () => {
    const post = accepted();
    const { valyu } = makeClient(
      [paused("int_1"), paused("int_1"), paused("int_1"), completed()],
      post
    );
    const onInteraction = jest.fn().mockResolvedValue(null);

    await valyu.deepresearch.wait("dr_1", { onInteraction });

    expect(onInteraction).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
  });
});
