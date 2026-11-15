import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import type { McpServer } from "@modelcontextprotocol/server";

/**
 * Connect a test client over the in-memory transport. `InMemoryTransport`
 * connects 2025-era instances only, so these tests exercise the legacy path;
 * `mcp-stdio.test.ts` covers the modern (2026-07-28) era through `serveStdio`.
 */
export async function connectTestClient(server: McpServer) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "taskman-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}
