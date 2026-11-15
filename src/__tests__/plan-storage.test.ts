import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chdir } from "node:process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makePlanRuntime } from "../effects/runtime.js";
import { saveInitiative } from "../storage/plan-storage.js";

const run = makePlanRuntime();
let cwd: string;
let tmp: string;

beforeEach(async () => {
  cwd = process.cwd();
  tmp = await mkdtemp(join(tmpdir(), "taskman-planstorage-"));
  chdir(tmp);
});

afterEach(async () => {
  chdir(cwd);
  await rm(tmp, { recursive: true, force: true });
});

describe("initiative doc", () => {
  test("writes INITIATIVE.md under the default ledger root", async () => {
    await run(saveInitiative("init", "# Overview"));
    expect(await readFile(".taskman/plans/init/INITIATIVE.md", "utf-8")).toBe("# Overview");
  });
});
