import { afterEach, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlan } from "../app/create-plan.js";
import { makeAppContext } from "../app/context.js";
import { packageVersion } from "../version.js";

let client: Client | undefined;
let dir = "";

afterEach(async () => {
  await client?.close();
  client = undefined;
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = "";
});

async function buildCli(): Promise<void> {
  const build = Bun.spawn(["bun", "run", "build"], { stderr: "pipe", stdout: "ignore" });
  if (await build.exited) throw new Error(await new Response(build.stderr).text());
}

test("serves the bound ledger over clean Node stdio", async () => {
  expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(24);
  await buildCli();
  dir = await mkdtemp(join(tmpdir(), "taskman-mcp-stdio-"));
  await createPlan(makeAppContext(dir), {
    name: "alpha",
    title: "Alpha",
    tasks: [{ id: "t-001", description: "first" }],
  });
  const transport = new StdioClientTransport({
    command: "node",
    args: [join(process.cwd(), "dist", "cli.mjs"), "mcp"],
    cwd: dir,
    stderr: "pipe",
  });
  client = new Client(
    { name: "taskman-stdio-test", version: "1.0.0" },
    // Probe with server/discover so this exercises the 2026-07-28 era rather
    // than the legacy initialize handshake.
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(transport);
  expect(client.getProtocolEra()).toBe("modern");
  expect(client.getServerVersion()).toMatchObject({ name: "taskman", version: packageVersion() });
  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
    "taskman_add_task",
    "taskman_close",
    "taskman_create_plan",
    "taskman_list",
    "taskman_reconcile",
    "taskman_revise_plan",
    "taskman_status",
    "taskman_update_task",
  ]);
  const status = await client.callTool({ name: "taskman_status", arguments: { plan: "alpha" } });
  expect(status.structuredContent).toMatchObject({ resolved: true, plan: { name: "alpha" } });
  const failure = await client.callTool({
    name: "taskman_update_task",
    arguments: { plan: "alpha", task_id: "t-999", status: "done" },
  });
  expect(failure.isError).toBe(true);
});
