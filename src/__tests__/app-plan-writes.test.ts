import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPlan } from "../app/create-plan.js";
import { revisePlan } from "../app/revise-plan.js";
import { makeAppContext } from "../app/context.js";
import { readPlansManifest } from "../storage/plans-manifest.js";
import { readTasksJsonl, writeTasksJsonl } from "../storage/task-storage.js";

let dir = "";
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

async function app() {
  dir = await mkdtemp(join(tmpdir(), "taskman-app-plan-"));
  return makeAppContext(dir);
}

describe("application plan write commands", () => {
  test("creates structured tasks, IDs, and plan links", async () => {
    const context = await app();
    const result = await createPlan(context, {
      name: "New Plan",
      title: "New Plan",
      handoff: "# Handoff",
      initiative: "Parent Initiative",
      dependsOnPlans: ["first plan"],
      tasks: [{ id: "t-005", description: "a".repeat(61) }, { description: "second" }],
    });
    expect(result).toMatchObject({
      planName: "new-plan",
      taskIds: ["t-005", "t-006"],
      initiative: "parent-initiative",
      unknownInitiative: true,
    });
    expect((await context.run(readTasksJsonl("new-plan")))?.tasks[0]?.description).toHaveLength(60);
    expect(await context.run(readPlansManifest())).toMatchObject([
      { name: "new-plan", depends_on: ["first-plan"] },
    ]);
  });

  test("revises tasks without losing task history or omitted links", async () => {
    const context = await app();
    await createPlan(context, {
      name: "p",
      title: "Original",
      handoff: "# Original",
      initiative: "parent",
      dependsOnPlans: ["blocked"],
      tasks: [{ id: "t-001", description: "original" }],
    });
    await context.run(
      writeTasksJsonl(
        "p",
        { _type: "meta", title: "Original", plan_name: "p", created_at: "old" },
        [
          {
            _type: "task",
            id: "t-001",
            description: "original",
            details: "old",
            status: "done",
            origin: "discovered",
            notes: "note",
            created_at: "old",
            updated_at: "old",
          },
        ],
      ),
    );
    const result = await revisePlan(context, {
      plan: "p",
      tasks: [{ id: "t-001", description: "renamed" }],
    });
    const task = (await context.run(readTasksJsonl("p")))?.tasks[0];
    expect(result.changed).toEqual(["tasks"]);
    expect(task).toMatchObject({
      status: "done",
      origin: "discovered",
      notes: "note",
      created_at: "old",
      description: "renamed",
    });
    expect(await context.run(readPlansManifest())).toMatchObject([
      { initiative: "parent", depends_on: ["blocked"] },
    ]);
  });
});
