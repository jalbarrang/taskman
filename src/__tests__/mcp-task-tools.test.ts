import { afterEach, describe, expect, test } from "bun:test";
import { content, mcpFixture } from "./mcp-fixture.js";

let fixture: Awaited<ReturnType<typeof mcpFixture>>;
afterEach(async () => {
  await fixture?.close();
});

describe("MCP task tools", () => {
  test("adds, updates, closes, and reconciles through application services", async () => {
    fixture = await mcpFixture();
    const added = content(
      await fixture.client.callTool({
        name: "taskman_add_task",
        arguments: { description: "follow up", reason: "gap" },
      }),
    );
    expect(added).toMatchObject({ task_id: "t-003", status: "deferred" });
    const updated = content(
      await fixture.client.callTool({
        name: "taskman_update_task",
        arguments: { task_id: "t-001", status: "done" },
      }),
    );
    expect(updated).toMatchObject({ status: "done" });
    const closed = content(
      await fixture.client.callTool({
        name: "taskman_close",
        arguments: { status: "abandoned", reason: "stopped" },
      }),
    );
    expect(closed).toMatchObject({ plan_name: "alpha", status: "abandoned" });
    const reconciled = content(
      await fixture.client.callTool({ name: "taskman_reconcile", arguments: { apply: true } }),
    );
    expect(reconciled).toHaveProperty("applied");
  });

  test("serializes concurrent writes without losing either task update", async () => {
    fixture = await mcpFixture();
    await Promise.all(
      ["t-001", "t-002"].map((task_id) =>
        fixture.client.callTool({
          name: "taskman_update_task",
          arguments: { task_id, status: "done" },
        }),
      ),
    );
    const status = content(
      await fixture.client.callTool({ name: "taskman_status", arguments: { plan: "alpha" } }),
    );
    const tasks = (status.plan as { tasks: Array<{ id: string; status: string }> }).tasks;
    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "t-001", status: "done" }),
        expect.objectContaining({ id: "t-002", status: "done" }),
      ]),
    );
  });
});
