import { afterEach, describe, expect, test } from "bun:test";
import { content, error, mcpFixture } from "./mcp-fixture.js";

let fixture: Awaited<ReturnType<typeof mcpFixture>>;
afterEach(async () => {
  await fixture?.close();
});

describe("MCP errors and unresolved reads", () => {
  test("returns typed errors without success-shaped structured content", async () => {
    fixture = await mcpFixture();
    const result = await fixture.client.callTool({
      name: "taskman_update_task",
      arguments: { task_id: "t-999", status: "done" },
    });
    expect(result).toMatchObject({ isError: true });
    expect((result as { structuredContent?: unknown }).structuredContent).toBeUndefined();
    expect(error(result)).toMatchObject({ code: "TASK_NOT_FOUND" });
  });

  test("returns unresolved status for explicit unknown plans without an error", async () => {
    fixture = await mcpFixture();
    const result = await fixture.client.callTool({
      name: "taskman_status",
      arguments: { plan: "missing" },
    });
    expect(result).not.toMatchObject({ isError: true });
    expect(content(result)).toMatchObject({ resolved: false, candidates: ["alpha"] });
  });
});
