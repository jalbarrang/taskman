import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeAppContext } from "../app/context.js";
import { AppError } from "../app/errors.js";
import { requirePlan, resolvePlan } from "../app/resolve-plan.js";
import { getPlanStatus } from "../app/status.js";
import { upsertPlanEntry } from "../storage/plans-manifest.js";
import { writeTasksJsonl } from "../storage/task-storage.js";

let dir = "";
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

const meta = (name: string) => ({
  _type: "meta" as const,
  title: name,
  plan_name: name,
  created_at: "now",
});
const task = {
  _type: "task" as const,
  id: "t-001",
  description: "read",
  status: "pending" as const,
  created_at: "now",
  updated_at: "now",
};

describe("application status and root binding", () => {
  test("binds a configured root and reads a plan from it", async () => {
    dir = await mkdtemp(join(tmpdir(), "taskman-app-"));
    await writeFile(join(dir, ".taskmanrc"), '{"plans-root":"ledger"}');
    const context = makeAppContext(dir);
    expect(context).toMatchObject({
      root: join(dir, "ledger"),
      displayRoot: "ledger",
      source: "taskmanrc",
    });
    await context.run(upsertPlanEntry("only", { status: "in-progress", title: "Only" }));
    await context.run(writeTasksJsonl("only", meta("Only"), [task]));
    const status = await getPlanStatus(context);
    expect(status).toMatchObject({
      planName: "Only",
      counts: { pending: 1 },
      finalizable: false,
    });
  });

  test("surfaces the plan overview from the registry row", async () => {
    dir = await mkdtemp(join(tmpdir(), "taskman-app-"));
    const context = makeAppContext(dir);
    await context.run(
      upsertPlanEntry("with-overview", {
        status: "in-progress",
        title: "With Overview",
        overview: "Constraint: no schema changes.",
      }),
    );
    await context.run(writeTasksJsonl("with-overview", meta("with-overview"), [task]));
    expect((await getPlanStatus(context)).overview).toBe("Constraint: no schema changes.");
  });

  test("omits the overview when the plan has none", async () => {
    dir = await mkdtemp(join(tmpdir(), "taskman-app-"));
    const context = makeAppContext(dir);
    await context.run(upsertPlanEntry("bare", { status: "in-progress", title: "Bare" }));
    await context.run(writeTasksJsonl("bare", meta("bare"), [task]));
    expect((await getPlanStatus(context)).overview).toBeUndefined();
  });

  test("returns read candidates and rejects an ambiguous strict resolution", async () => {
    dir = await mkdtemp(join(tmpdir(), "taskman-app-"));
    const context = makeAppContext(dir);
    await context.run(upsertPlanEntry("one", { status: "in-progress", title: "one" }));
    await context.run(upsertPlanEntry("two", { status: "in-progress", title: "two" }));
    expect((await resolvePlan(context)).candidates.sort()).toEqual(["one", "two"]);
    await expect(requirePlan(context)).rejects.toMatchObject({
      code: "AMBIGUOUS_PLAN",
    } satisfies Partial<AppError>);
  });
});
