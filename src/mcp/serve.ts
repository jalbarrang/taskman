/**
 * `taskman mcp` — serve the bound ledger over stdio.
 *
 * `serveStdio` owns the protocol-era decision for each connection: a modern
 * (2026-07-28) opening is served by a fresh `buildTaskmanMcpServer` instance,
 * and a 2025-era opening is served by the same factory through the legacy
 * shim. One factory instance is pinned per connection.
 */

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { makeAppContext } from "../app/context.js";
import { buildTaskmanMcpServer } from "./server.js";

export async function serveTaskmanMcp(cwd: string = process.cwd()): Promise<void> {
  const context = makeAppContext(cwd);
  serveStdio(() => buildTaskmanMcpServer(context), {
    onerror: (error) => process.stderr.write(`taskman mcp: ${error.message}\n`),
  });
}
