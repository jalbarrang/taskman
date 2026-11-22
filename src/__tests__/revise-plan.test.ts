import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chdir } from "node:process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makePlanRuntime } from "../effects/runtime.js";
import { readPlansManifest, upsertPlanEntry } from "../storage/plans-manifest.js";
import { writeTasksJsonl, readTasksJsonl } from "../storage/task-storage.js";
import type { TaskMeta, TaskRecord } from "../types.js";
import { revisePlanCommand } from "../cli/commands/revise-plan.js";
import { CliError } from "../cli/runtime.js";

const run = makePlanRuntime();
let cwd: string;
let tmp: string;

const meta: TaskMeta = {
  _type: "meta",
  title: "Original Title",
  plan_name: "p",
  created_at: "2026-01-01T00:00:00.000Z",
};

function task(id: string, overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    _type: "task",
    id,
    description: `task ${id}`,
    details: `details ${id}`,
    status: "pending",
    origin: "plan",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(async () => {
  cwd = process.cwd();
  tmp = await mkdtemp(join(tmpdir(), "taskman-revise-"));
  chdir(tmp);
  await run(upsertPlanEntry("p", { status: "in-progress", title: "Original Title" }));
  await run(
    writeTasksJsonl("p", meta, [task("t-001", { status: "done", notes: "x" }), task("t-002")]),
  );
});

afterEach(async () => {
  chdir(cwd);
  await rm(tmp, { recursive: true, force: true });
});

describe("revise-plan", () => {
  test("preserves status and notes for unchanged task ids; drops omitted ids", async () => {
    await revisePlanCommand({
      plan: "p",
      tasks: JSON.stringify([
        { id: "t-001", description: "renamed one" },
        { id: "t-003", description: "brand new" },
      ]),
    });
    const snap = await run(readTasksJsonl("p"));
    const byId = Object.fromEntries((snap?.tasks ?? []).map((t) => [t.id, t]));
    expect(byId["t-001"]?.status).toBe("done");
    expect(byId["t-001"]?.notes).toBe("x");
    expect(byId["t-001"]?.description).toBe("renamed one");
    expect(byId["t-003"]?.status).toBe("pending");
    expect(byId["t-002"]).toBeUndefined();
  });

  test("omitting tasks leaves the task set untouched", async () => {
    await revisePlanCommand({ plan: "p", title: "New Title Only" });
    const snap = await run(readTasksJsonl("p"));
    expect(snap?.meta.title).toBe("New Title Only");
    expect(snap?.tasks.map((t) => t.id)).toEqual(["t-001", "t-002"]);
    expect(snap?.tasks.find((t) => t.id === "t-001")?.notes).toBe("x");
  });

  test("title-only revise leaves tasks intact", async () => {
    await revisePlanCommand({ plan: "p", title: "Just Title" });
    const snap = await run(readTasksJsonl("p"));
    expect(snap?.tasks).toHaveLength(2);
    expect(snap?.tasks.find((t) => t.id === "t-001")?.notes).toBe("x");
  });

  test("sets, preserves, and clears the plan overview", async () => {
    await revisePlanCommand({ plan: "p", overview: "## Goal\nShip it" });
    let [entry] = await run(readPlansManifest());
    expect(entry?.overview).toBe("## Goal\nShip it");

    // Omitted overview is preserved, like every other revise field.
    await revisePlanCommand({ plan: "p", title: "Title Only" });
    [entry] = await run(readPlansManifest());
    expect(entry?.overview).toBe("## Goal\nShip it");

    // An empty string is the documented way to clear it.
    await revisePlanCommand({ plan: "p", overview: "" });
    [entry] = await run(readPlansManifest());
    expect(entry?.overview).toBeUndefined();
  });

  test("errors clearly when the plan is unknown", async () => {
    await expect(revisePlanCommand({ plan: "ghost", title: "X" })).rejects.toBeInstanceOf(CliError);
  });
});
