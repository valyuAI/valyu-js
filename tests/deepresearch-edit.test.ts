import { Valyu } from "../src/index";

/**
 * DeepResearch report editing: the request body the strict edit endpoint
 * accepts, waiting on a running edit, error codes, versions and restore.
 */

function makeClient() {
  const valyu = new Valyu("test-key", "https://api.valyu.ai/v1");
  const get = jest.fn();
  const post = jest.fn();
  (valyu as any).client.get = get;
  (valyu as any).client.post = post;
  const sleep = jest.fn().mockResolvedValue(undefined);
  (valyu as any).sleep = sleep;
  return { valyu, get, post, sleep };
}

function httpError(status: number, data: any) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data, headers: {} },
  });
}

const running = {
  edit_id: "ed_1",
  deepresearch_id: "dr_1",
  status: "running",
  target: { kind: "report" },
  base_version: 1,
  created_at: "2026-11-19T14:20:00.000Z",
  retry_after_seconds: 3,
};

const applied = {
  ...running,
  status: "applied",
  version: 2,
  summary: "Cut the summary to 3 bullets.",
  retry_after_seconds: null,
};

describe("deepresearch.edit()", () => {
  // The endpoint rejects unknown fields with 400, so a stray key (an unset
  // option sent as undefined/null, a camelCase name, the idempotency key)
  // would fail every edit that sets it.
  it("sends only the fields the caller set, in API names, and the key as a header", async () => {
    const { valyu, post } = makeClient();
    post.mockResolvedValue({ status: 200, data: applied });

    const result = await valyu.deepresearch.edit("dr_1", {
      instruction: "Add a YoY growth column",
      target: { kind: "deliverable", deliverableId: "f_01" },
      focus: { startChar: 10, endChar: 40, section: "Outlook", scope: "strict" },
      baseVersion: 1,
      waitSeconds: 15,
      idempotencyKey: "key-1",
    });

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe("https://api.valyu.ai/v1/deepresearch/tasks/dr_1/edit");
    expect(body).toEqual({
      instruction: "Add a YoY growth column",
      target: { kind: "deliverable", deliverable_id: "f_01" },
      focus: { start_char: 10, end_char: 40, section: "Outlook", scope: "strict" },
      base_version: 1,
      wait_seconds: 15,
    });
    expect(config.headers["Idempotency-Key"]).toBe("key-1");
    expect(result).toMatchObject({ success: true, status: "applied", version: 2 });

    await valyu.deepresearch.edit("dr_1", { instruction: "Fix the typo" });
    expect(post.mock.calls[1][1]).toEqual({ instruction: "Fix the typo" });
    expect(post.mock.calls[1][2].headers["Idempotency-Key"]).toBeUndefined();
  });

  // Callers branch on the code (pick a candidate, re-read the head, back off),
  // so losing it to a bare message makes the error unactionable.
  it("returns the API error code and focus candidates", async () => {
    const { valyu, post } = makeClient();
    const candidates = [
      { start_char: 620, end_char: 655, section: "Summary" },
      { start_char: 4810, end_char: 4845, section: "Regions" },
    ];
    post.mockRejectedValue(
      httpError(422, { error: "Focused text matched 2 locations.", code: "focus.ambiguous", candidates })
    );

    const result = await valyu.deepresearch.edit("dr_1", {
      instruction: "Soften this",
      focus: { text: "revenue grew" },
    });

    expect(result).toEqual({
      success: false,
      error: "Focused text matched 2 locations.",
      code: "focus.ambiguous",
      httpStatus: 422,
      candidates,
    });
  });
});

describe("deepresearch.waitForEdit()", () => {
  // A 202 edit is only useful if the caller can wait it out: a 5xx blip must
  // not end the wait, and the server's retry hint sets the poll interval.
  it("polls through running and transient errors to the finished record", async () => {
    const { valyu, get, sleep } = makeClient();
    get
      .mockResolvedValueOnce({ status: 200, data: running })
      .mockRejectedValueOnce(httpError(502, "<html>Bad Gateway</html>"))
      .mockResolvedValueOnce({ status: 200, data: applied });

    const result = await valyu.deepresearch.waitForEdit("dr_1", "ed_1");

    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls[0][0]).toBe(
      "https://api.valyu.ai/v1/deepresearch/tasks/dr_1/edits/ed_1"
    );
    expect(sleep.mock.calls[0][0]).toBe(3000);
    expect(result.status).toBe("applied");
    expect(result.version).toBe(2);
  });

  it("returns a declined edit and throws on an edit that cannot be read", async () => {
    const { valyu, get } = makeClient();
    const declined = {
      ...running,
      status: "declined",
      decline: { code: "edit.out_of_evidence", message: "Not in the sources", suggestion: null },
    };
    get.mockResolvedValueOnce({ status: 200, data: declined });
    await expect(valyu.deepresearch.waitForEdit("dr_1", "ed_1")).resolves.toMatchObject({
      status: "declined",
      decline: { code: "edit.out_of_evidence" },
    });

    get.mockRejectedValueOnce(httpError(404, { error: "Not found" }));
    await expect(valyu.deepresearch.waitForEdit("dr_1", "ed_x")).rejects.toThrow("Not found");
  });
});

describe("deepresearch versions", () => {
  // Reading an old version must not reuse (or overwrite) the head's cached
  // ETag, or a 304 would hand back the head's report as that version.
  it("reads a version with ?version=N, cached apart from the head", async () => {
    const { valyu, get } = makeClient();
    const json = (data: any, etag: string) => ({
      status: 200,
      data,
      headers: { "content-type": "application/json", etag },
    });
    get
      .mockResolvedValueOnce(json({ status: "completed", version: 2, output: "head" }, '"h"'))
      .mockResolvedValueOnce(json({ status: "completed", version: 1, is_latest: false, output: "old" }, '"v1"'));

    await valyu.deepresearch.status("dr_1");
    const old = await valyu.deepresearch.status("dr_1", { version: 1 });

    expect(get.mock.calls[1][0]).toBe(
      "https://api.valyu.ai/v1/deepresearch/tasks/dr_1/status?version=1"
    );
    expect(get.mock.calls[1][1].headers["If-None-Match"]).toBeUndefined();
    expect(old).toMatchObject({ success: true, version: 1, is_latest: false, output: "old" });
  });

  it("lists versions and restores one", async () => {
    const { valyu, get, post } = makeClient();
    get.mockResolvedValue({
      status: 200,
      data: {
        deepresearch_id: "dr_1",
        head: 2,
        versions: [
          { version: 1, kind: "original", created_at: "2026-11-19T14:00:00Z", is_head: false },
          { version: 2, kind: "edit", created_at: "2026-11-19T14:20:00Z", is_head: true },
        ],
      },
    });
    post.mockResolvedValue({ status: 200, data: { version: 3, restored_from: 1 } });

    const versions = await valyu.deepresearch.listVersions("dr_1");
    const restored = await valyu.deepresearch.restoreVersion("dr_1", 1);

    expect(get.mock.calls[0][0]).toBe("https://api.valyu.ai/v1/deepresearch/tasks/dr_1/versions");
    expect(versions).toMatchObject({ success: true, head: 2 });
    expect(post.mock.calls[0][0]).toBe(
      "https://api.valyu.ai/v1/deepresearch/tasks/dr_1/versions/1/restore"
    );
    expect(restored).toEqual({ success: true, version: 3, restored_from: 1 });
  });
});
