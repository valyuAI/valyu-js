/**
 * Proves the DeepResearch types accept both response shapes the API can send:
 *   - the legacy-compatible shape, and
 *   - the itemized shape (cost_breakdown holds the itemized bill, mode fields are open strings).
 *
 * The SDK does no runtime validation (the JSON passes straight through), so "parses" here
 * means: the fixture, read as JSON, is a structurally valid
 * DeepResearchStatusResponse/DeepResearchBatch etc. at compile time, and the helper functions
 * (effectiveMode, effectiveOutputFormats, effectiveCostDetail) behave correctly against it at
 * runtime. The fixtures hold response shapes with their values replaced by placeholders.
 */

import * as fs from "fs";
import * as path from "path";
import {
  DeepResearchStatusResponse,
  DeepResearchCreateResponse,
  DeepResearchBatch,
  effectiveMode,
  effectiveOutputFormats,
  effectiveCostDetail,
} from "../src/types";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "native-golden");

function loadGolden(name: string): { case: string; body: any } {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
  return JSON.parse(raw);
}

describe("itemized golden shapes", () => {
  const STATUS_CASES = [
    "create.json",
    "create-instant.json",
    "status-queued.json",
    "status-queued-legacy-made.json",
    "status-completed.json",
    "status-failed.json",
    "status-charts-deliverables.json",
    "task-cancel.json",
  ];

  test.each(STATUS_CASES)("%s is a usable DeepResearchStatusResponse", (name) => {
    const golden = loadGolden(name);
    const status: DeepResearchStatusResponse = { success: true, ...golden.body };
    expect(status.deepresearch_id).toBeDefined();
    // The placeholder status string ("s") is not a real status: it must still be usable, not
    // undefined and not throw — this is what keeps a caller's wait()-style loop from breaking
    // on a status value introduced after this SDK shipped.
    expect(status.status).toBeDefined();
  });

  test("status-charts-deliverables has images, deliverables, locations and cost_detail-via-cost_breakdown", () => {
    const golden = loadGolden("status-charts-deliverables.json");
    const status: DeepResearchStatusResponse = { success: true, ...golden.body };

    expect(status.images?.length).toBe(3);
    expect(status.deliverables?.length).toBe(2);
    expect(status.sources?.some((s) => s.locations && s.locations.length > 0)).toBe(true);

    // A native body has no separate cost_detail key: the itemized bill is cost_breakdown
    // itself. effectiveCostDetail() finds it either way.
    expect(status.cost_detail).toBeUndefined();
    const detail = effectiveCostDetail(status);
    expect(detail).toBeDefined();
    expect(detail?.base_usd).toBe(0.5);
    expect(detail?.tools?.length).toBe(1);
    expect(detail?.tools?.[0].usd).toBe(0.5);
  });

  test("create.json resolves via effectiveMode/effectiveOutputFormats", () => {
    const golden = loadGolden("create.json");
    const created: DeepResearchCreateResponse = { success: true, ...golden.body };
    expect(effectiveMode(created)).toBe("s");
    expect(effectiveOutputFormats(created)).toEqual(["s"]);
  });

  test("batch-create.json and batch-status.json are usable DeepResearchBatch bodies (no success wrapper)", () => {
    for (const name of ["batch-create.json", "batch-status.json"]) {
      const golden = loadGolden(name);
      const batch: DeepResearchBatch = golden.body;
      expect(batch.batch_id).toBeDefined();
      expect(effectiveMode(batch)).toBe("s");
    }
  });

  const ERROR_CASES = [
    "error-bad-mode.json",
    "error-missing-query.json",
    "error-brand-forbidden.json",
    "task-not-found.json",
  ];

  test.each(ERROR_CASES)("%s is a usable error body", (name) => {
    const golden = loadGolden(name);
    expect(golden.body.error).toBe("s");
  });
});
