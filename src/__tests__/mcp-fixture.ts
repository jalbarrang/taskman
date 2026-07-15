import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlan } from "../app/create-plan.js";
import { makeAppContext } from "../app/context.js";
import { buildTaskmanMcpServer } from "../mcp/server.js";
import { connectTestClient } from "../mcp/testing.js";

export async function mcpFixture() {
  const dir = await mkdtemp(join(tmpdir(), "taskman-mcp-"));
  const app = makeAppContext(dir);
  await createPlan(app, {
    name: "alpha",
    title: "Alpha",
    handoff: "# Alpha",
    tasks: [
      { id: "t-001", description: "first" },
      { id: "t-002", description: "second" },
    ],
  });
  const server = buildTaskmanMcpServer(app);
  const client = await connectTestClient(server);
  return {
    client,
    app,
    async close() {
      await client.close();
      await server.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

export function content(result: unknown): Record<string, unknown> {
  return (result as { structuredContent: Record<string, unknown> }).structuredContent;
}

export function error(result: unknown): Record<string, unknown> {
  const text = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "{}";
  return JSON.parse(text) as Record<string, unknown>;
}
