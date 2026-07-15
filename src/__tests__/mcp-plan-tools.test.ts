import { afterEach, describe, expect, test } from "bun:test";
import { content, mcpFixture } from "./mcp-fixture.js";

let fixture: Awaited<ReturnType<typeof mcpFixture>>;
afterEach(async () => {
  await fixture?.close();
});

describe("MCP plan tools", () => {
  test("creates, revises, lists, and reads deep plan status", async () => {
    fixture = await mcpFixture();
    const created = content(
      await fixture.client.callTool({
        name: "taskman_create_plan",
        arguments: {
          name: "beta",
          title: "Beta",
          handoff: "# Beta",
          tasks: [{ description: "write beta" }],
        },
      }),
    );
    expect(created).toMatchObject({ plan_name: "beta", task_ids: ["t-001"], task_count: 1 });
    const revised = content(
      await fixture.client.callTool({
        name: "taskman_revise_plan",
        arguments: {
          plan: "beta",
          title: "Better",
          tasks: [{ id: "t-001", description: "revised beta" }],
        },
      }),
    );
    expect(revised).toMatchObject({ title: "Better", changed: ["title", "tasks"] });
    const status = content(
      await fixture.client.callTool({
        name: "taskman_status",
        arguments: { plan: "beta", include_handoff: true },
      }),
    );
    expect(status).toMatchObject({
      resolved: true,
      ledger: { source: "default" },
      plan: { name: "beta", handoff: "# Beta", tasks: [{ id: "t-001" }] },
    });
    const list = content(
      await fixture.client.callTool({
        name: "taskman_list",
        arguments: { kind: "plans", sort: "name" },
      }),
    );
    expect(list).toMatchObject({ kind: "plans" });
    expect(list.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "beta", title: "Better" })]),
    );
  });
});
