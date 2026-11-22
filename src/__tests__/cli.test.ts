import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chdir } from "node:process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makePlanRuntime } from "../effects/runtime.js";
import { readPlansManifest, upsertPlanEntry } from "../storage/plans-manifest.js";
import { writeTasksJsonl } from "../storage/task-storage.js";
import type { TaskMeta, TaskRecord } from "../types.js";
import { statusCommand } from "../cli/commands/status.js";
import { updateTaskCommand } from "../cli/commands/update-task.js";
import { addTaskCommand } from "../cli/commands/add-task.js";
import { listPlansCommand } from "../cli/commands/list.js";
import { createPlanCommand } from "../cli/commands/create-plan.js";
import { CliError } from "../cli/runtime.js";

const run = makePlanRuntime();
let cwd: string;
let tmp: string;

const meta: TaskMeta = {
  _type: "meta",
  title: "Title p",
  plan_name: "p",
  created_at: "2026-01-01T00:00:00.000Z",
};
const task = (id: string): TaskRecord => ({
  _type: "task",
  id,
  description: `task ${id}`,
  status: "pending",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

/** Capture everything written to stdout while `fn` runs. */
async function capture(fn: () => Promise<void>): Promise<string> {
  const original = process.stdout.write.bind(process.stdout);
  let out = "";
  process.stdout.write = ((chunk: string) => {
    out += chunk;
    return true;
  }) as typeof process.stdout.write;
  try {
    await fn();
  } finally {
    process.stdout.write = original;
  }
  return out;
}

beforeEach(async () => {
  cwd = process.cwd();
  tmp = await mkdtemp(join(tmpdir(), "taskman-cli-"));
  chdir(tmp);
  await run(upsertPlanEntry("p", { status: "in-progress", title: "Title p" }));
  await run(writeTasksJsonl("p", meta, [task("t-001"), task("t-002")]));
});

afterEach(async () => {
  chdir(cwd);
  await rm(tmp, { recursive: true, force: true });
});

describe("status", () => {
  test("json output reports counts and task ids", async () => {
    const out = await capture(() => statusCommand({ json: true }));
    const parsed = JSON.parse(out);
    expect(parsed.plan_name).toBe("p");
    expect(parsed.total).toBe(2);
    expect(parsed.task_ids).toEqual(["t-001", "t-002"]);
  });

  test("errors clearly when plan missing", async () => {
    await expect(statusCommand({ plan: "ghost" })).rejects.toBeInstanceOf(CliError);
  });

  test("includes the plan overview in json and human output", async () => {
    await run(
      upsertPlanEntry("p", {
        status: "in-progress",
        title: "Title p",
        overview: "Constraint: keep it small.",
      }),
    );
    const json = JSON.parse(await capture(() => statusCommand({ json: true })));
    expect(json.overview).toBe("Constraint: keep it small.");
    expect(await capture(() => statusCommand({}))).toContain("Constraint: keep it small.");
  });

  test("reports overview as null when the plan has none", async () => {
    const json = JSON.parse(await capture(() => statusCommand({ json: true })));
    expect(json.overview).toBeNull();
  });
});

describe("update-task → status", () => {
  test("marking done is reflected by status", async () => {
    await capture(() => updateTaskCommand("t-001", "done", {}));
    const out = await capture(() => statusCommand({ json: true }));
    const parsed = JSON.parse(out);
    expect(parsed.counts.done).toBe(1);
  });

  test("rejects an invalid status", async () => {
    await expect(updateTaskCommand("t-001", "bogus", {})).rejects.toBeInstanceOf(CliError);
  });
});

describe("add-task", () => {
  test("reason is optional", async () => {
    const out = await capture(() => addTaskCommand("follow up", { json: true }));
    expect(JSON.parse(out).status).toBe("deferred");
  });

  test("appends a deferred task", async () => {
    const out = await capture(() => addTaskCommand("follow up", { reason: "gap", json: true }));
    expect(JSON.parse(out).task_id).toBe("t-003");
  });
});

describe("list", () => {
  test("json lists the plan", async () => {
    const out = await capture(() => listPlansCommand({ json: true }));
    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("p");
  });
});

describe("create-plan", () => {
  test("writes tasks.jsonl and a registry entry", async () => {
    const out = await capture(() =>
      createPlanCommand({
        name: "New Plan",
        title: "New Plan",
        tasks: JSON.stringify([{ description: "first" }, { description: "second" }]),
        json: true,
      }),
    );
    const parsed = JSON.parse(out);
    expect(parsed.plan_name).toBe("new-plan");
    expect(parsed.task_ids).toEqual(["t-001", "t-002"]);

    const list = JSON.parse(await capture(() => listPlansCommand({ json: true })));
    expect(list.map((p: { name: string }) => p.name)).toContain("new-plan");
  });

  test("honors explicit task ids and generates the rest", async () => {
    const out = await capture(() =>
      createPlanCommand({
        name: "mixed",
        title: "Mixed",
        tasks: JSON.stringify([{ id: "t-005", description: "a" }, { description: "b" }]),
        json: true,
      }),
    );
    expect(JSON.parse(out).task_ids).toEqual(["t-005", "t-006"]);
  });

  test("creates an empty project when tasks are omitted", async () => {
    const out = await capture(() => createPlanCommand({ title: "Empty Project", json: true }));
    expect(JSON.parse(out)).toMatchObject({ plan_name: "empty-project", task_count: 0 });
  });

  test("derives the plan name from the title", async () => {
    const out = await capture(() => createPlanCommand({ title: "Derived Name", json: true }));
    expect(JSON.parse(out).plan_name).toBe("derived-name");
  });

  test("rejects malformed tasks JSON", async () => {
    await expect(
      createPlanCommand({ name: "x", title: "X", tasks: "not json" }),
    ).rejects.toBeInstanceOf(CliError);
  });

  test("stores the overview on the registry row", async () => {
    const out = await capture(() =>
      createPlanCommand({ name: "ov", title: "OV", overview: "## Goal\nShip", json: true }),
    );
    expect(JSON.parse(out).overview).toBe("## Goal\nShip");
    const entry = (await run(readPlansManifest())).find((plan) => plan.name === "ov");
    expect(entry?.overview).toBe("## Goal\nShip");
  });

  test("requires a title", async () => {
    await expect(createPlanCommand({ tasks: '[{"description":"a"}]' })).rejects.toBeInstanceOf(
      CliError,
    );
  });
});
