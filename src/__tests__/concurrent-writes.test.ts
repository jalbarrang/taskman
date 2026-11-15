/**
 * Regression: concurrent read-modify-write on the registries must not lose
 * updates. Each `Effect.runPromise` mimics a separate tool execute running in
 * the same block (e.g. three `create-initiative` calls). Before the file-lock
 * fix, their reads all saw the same starting file and the last write clobbered
 * the rest — only one entry survived.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { chdir } from "node:process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileSystem, nodeFileSystemService } from "../effects/filesystem.js";
import { readPlansManifest, upsertPlanEntry } from "../storage/plans-manifest.js";
import { readInitiativesManifest, upsertInitiativeEntry } from "../storage/initiatives-manifest.js";
import { writeTasksJsonl, readTasksJsonl, updateTask } from "../storage/task-storage.js";
import { appendDeferredTask, setTaskStatus } from "../engine.js";
import type { TaskMeta, TaskRecord } from "../types.js";

// Each call gets its OWN runPromise so the writes are genuinely concurrent —
// the same shape as independent tool executes sharing one Node process.
const run = <A, E>(program: Effect.Effect<A, E, FileSystem>): Promise<A> =>
  Effect.runPromise(program.pipe(Effect.provideService(FileSystem, nodeFileSystemService)));

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "plan-mode-concurrent-"));
  chdir(dir);
});
afterEach(async () => {
  chdir(originalCwd);
  await rm(dir, { recursive: true, force: true });
});

describe("concurrent registry writes", () => {
  test("5 concurrent plan upserts all persist (no lost updates)", async () => {
    const names = ["a", "b", "c", "d", "e"];
    await Promise.all(
      names.map((n) => run(upsertPlanEntry(n, { status: "in-progress", title: n.toUpperCase() }))),
    );
    const entries = await run(readPlansManifest());
    expect(entries.map((e) => e.name).sort()).toEqual(names);
  });

  test("3 concurrent initiative upserts all persist (no lost updates)", async () => {
    const names = ["one", "two", "three"];
    await Promise.all(
      names.map((n) => run(upsertInitiativeEntry(n, { status: "in-progress", title: n }))),
    );
    const entries = await run(readInitiativesManifest());
    expect(entries.map((e) => e.name).sort()).toEqual([...names].sort());
  });

  test("concurrent task updates to the same plan all persist", async () => {
    const planDir = "p";
    const meta: TaskMeta = {
      _type: "meta",
      plan_name: "p",
      title: "P",
      created_at: "now",
    };
    const tasks: TaskRecord[] = ["t-001", "t-002", "t-003"].map((id) => ({
      _type: "task",
      id,
      description: id,
      status: "pending",
      created_at: "now",
      updated_at: "now",
    }));
    await run(writeTasksJsonl(planDir, meta, tasks));

    await Promise.all(tasks.map((t) => run(updateTask(planDir, t.id, { status: "done" }))));

    const snapshot = await run(readTasksJsonl(planDir));
    expect(snapshot?.tasks.every((t) => t.status === "done")).toBe(true);
  });

  // The application layer writes through the engine, not `updateTask`, so the
  // regression guard must exercise that path too.
  test("concurrent engine status updates persist and project correctly", async () => {
    const planDir = "engine";
    const taskIds = ["t-001", "t-002", "t-003"];
    await run(
      writeTasksJsonl(
        planDir,
        { _type: "meta", plan_name: planDir, title: "Engine", created_at: "now" },
        taskIds.map((id) => ({
          _type: "task" as const,
          id,
          description: id,
          status: "pending" as const,
          created_at: "now",
          updated_at: "now",
        })),
      ),
    );
    await run(upsertPlanEntry(planDir, { status: "in-progress", title: "Engine" }));

    await Promise.all(taskIds.map((id) => run(setTaskStatus(planDir, id, "done"))));

    const snapshot = await run(readTasksJsonl(planDir));
    expect(snapshot?.tasks.every((t) => t.status === "done")).toBe(true);
    const plan = (await run(readPlansManifest())).find((entry) => entry.name === planDir);
    expect(plan?.status).toBe("done");
  });

  test("concurrent deferred appends get distinct ids", async () => {
    const planDir = "appends";
    await run(
      writeTasksJsonl(
        planDir,
        { _type: "meta", plan_name: planDir, title: "Appends", created_at: "now" },
        [],
      ),
    );

    await Promise.all(
      ["a", "b", "c"].map((description) =>
        run(appendDeferredTask(planDir, { description, reason: "found while working" })),
      ),
    );

    const snapshot = await run(readTasksJsonl(planDir));
    const ids = snapshot?.tasks.map((task) => task.id) ?? [];
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
