import { McpServer } from "@modelcontextprotocol/server";
import type { AppContext } from "../app/context.js";
import { packageVersion } from "../version.js";
import { makeMcpContext } from "./context.js";
import { registerAddTask } from "./tools/add-task.js";
import { registerClose } from "./tools/close.js";
import { registerCreatePlan } from "./tools/create-plan.js";
import { registerList } from "./tools/list.js";
import { registerReconcile } from "./tools/reconcile.js";
import { registerRevisePlan } from "./tools/revise-plan.js";
import { registerStatus } from "./tools/status.js";
import { registerUpdateTask } from "./tools/update-task.js";

export function buildTaskmanMcpServer(context: AppContext): McpServer {
  const mcp = makeMcpContext(context);
  const server = new McpServer({ name: "taskman", version: packageVersion() });
  registerStatus(server, mcp);
  registerList(server, mcp);
  registerCreatePlan(server, mcp);
  registerRevisePlan(server, mcp);
  registerUpdateTask(server, mcp);
  registerAddTask(server, mcp);
  registerClose(server, mcp);
  registerReconcile(server, mcp);
  return server;
}
