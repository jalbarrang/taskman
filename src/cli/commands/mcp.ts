import { serveTaskmanMcp } from "../../mcp/serve.js";

export async function mcpCommand(cwd: string = process.cwd()): Promise<void> {
  await serveTaskmanMcp(cwd);
}
