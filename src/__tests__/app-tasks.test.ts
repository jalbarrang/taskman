import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeAppContext, type AppContext } from "../app/context.js";
import { AppError } from "../app/errors.js";
import { addDeferredTask, updateTask } from "../app/tasks.js";
import { readPlansManifest, upsertPlanEntry } from "../storage/plans-manifest.js";
import { writeTasksJsonl } from "../storage/task-storage.js";

let dir = "";
const meta = { _type: "meta" as const, title: "Plan", plan_name: "p", created_at: "now" };
const task = (status: "pending" | "done" = "pending") => ({
  _type: "task" as const,
  id: "t-001",
  description: "task",
  status,
  created_at: "now",
  updated_at: "now",
});

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function context(status: "pending" | "done" = "pending"): Promise<AppContext> {
  dir = await mkdtemp(join(tmpdir(), "taskman-app-tasks-"));
  const app = makeAppContext(dir);
  await app.run(upsertPlanEntry("p", { status: "in-progress", title: "Plan" }));
  await app.run(writeTasksJsonl("p", meta, [task(status)]));
  return app;
}

describe("application task commands", () => {
  test("updates a task and preserves engine status projection", async () => {
    const app = await context();
    expect(await updateTask(app, { taskId: "t-001", status: "done" })).toMatchObject({
      planName: "p",
      taskId: "t-001",
      status: "done",
      finalizable: true,
    });
    expect((await app.run(readPlansManifest()))[0]?.status).toBe("done");
  });

  test("adds a deferred task through the engine and reopens the plan", async () => {
    const app = await context("done");
    await updateTask(app, { taskId: "t-001", status: "done" });
    expect(
      await addDeferredTask(app, { plan: "p", description: "follow up", reason: "gap" }),
    ).toMatchObject({
      planName: "p",
      taskId: "t-002",
      status: "deferred",
    });
    expect((await app.run(readPlansManifest()))[0]?.status).toBe("in-progress");
  });

  test("rejects invalid task input with an application error", async () => {
    const app = await context();
    await expect(updateTask(app, { taskId: "t-001", status: "bogus" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    } satisfies Partial<AppError>);
    await expect(addDeferredTask(app, { description: "follow up" })).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
