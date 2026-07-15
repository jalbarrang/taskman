import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { makeAppContext } from "../app/context.js";
import { buildTaskmanMcpServer } from "./server.js";

export async function serveTaskmanMcp(cwd: string = process.cwd()): Promise<void> {
  const context = makeAppContext(cwd);
  const server = buildTaskmanMcpServer(context);
  const transport = new StdioServerTransport();
  transport.onerror = (error) => process.stderr.write(`taskman mcp: ${error.message}\n`);
  await server.connect(transport);
  process.stdin.resume();
}
