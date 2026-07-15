import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeAppContext, type AppContext } from "../app/context.js";
import { AppError } from "../app/errors.js";
import { closePlan } from "../app/lifecycle.js";
import { reconcileLedger } from "../app/reconcile.js";
import { readPlansManifest, upsertPlanEntry } from "../storage/plans-manifest.js";
import { writeTasksJsonl } from "../storage/task-storage.js";

let dir = "";
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function context(status: "in-progress" | "done" = "in-progress"): Promise<AppContext> {
  dir = await mkdtemp(join(tmpdir(), "taskman-app-lifecycle-"));
  const app = makeAppContext(dir);
  await app.run(upsertPlanEntry("p", { status, title: "Plan" }));
  await app.run(
    writeTasksJsonl(
      "p",
      {
        _type: "meta",
        title: "Plan",
        plan_name: "p",
        created_at: "now",
      },
      [
        {
          _type: "task",
          id: "t-001",
          description: "task",
          status: "pending",
          created_at: "now",
          updated_at: "now",
        },
      ],
    ),
  );
  return app;
}

describe("application lifecycle and reconcile commands", () => {
  test("closes a resolved plan through the existing lifecycle projection", async () => {
    const app = await context();
    expect(await closePlan(app, { status: "superseded", reason: "replaced" })).toMatchObject({
      planName: "p",
      status: "superseded",
      reason: "replaced",
    });
    expect((await app.run(readPlansManifest()))[0]?.status).toBe("superseded");
  });

  test("rejects invalid lifecycle status with an application error", async () => {
    await expect(closePlan(await context(), { status: "closed" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    } satisfies Partial<AppError>);
  });

  test("does not apply the unsafe done-to-in-progress reconcile direction", async () => {
    const app = await context("done");
    const result = await reconcileLedger(app, { apply: true });
    expect(result.planDrift).toMatchObject([{ name: "p", direction: "downgrade" }]);
    expect(result.applied?.plans).toEqual([]);
    expect((await app.run(readPlansManifest()))[0]?.status).toBe("done");
  });
});
