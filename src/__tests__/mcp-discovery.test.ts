import { afterEach, describe, expect, test } from "bun:test";
import { mcpFixture } from "./mcp-fixture.js";

let fixture: Awaited<ReturnType<typeof mcpFixture>>;
afterEach(async () => {
  await fixture?.close();
});

describe("MCP discovery", () => {
  test("registers exactly the eight Taskman tools and no resources or prompts", async () => {
    fixture = await mcpFixture();
    const listed = await fixture.client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      "taskman_add_task",
      "taskman_close",
      "taskman_create_plan",
      "taskman_list",
      "taskman_reconcile",
      "taskman_revise_plan",
      "taskman_status",
      "taskman_update_task",
    ]);
    expect(fixture.client.getServerCapabilities()).toMatchObject({ tools: {} });
    expect(fixture.client.getServerCapabilities()?.resources).toBeUndefined();
    expect(fixture.client.getServerCapabilities()?.prompts).toBeUndefined();
  });
});
