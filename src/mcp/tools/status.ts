import { getPlanStatus } from "../../app/status.js";
import { resolvePlan } from "../../app/resolve-plan.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { statusInput, statusOutput } from "../schemas/query.js";

export function registerStatus(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_status",
    {
      description: "Resolve and inspect a plan in the bound Taskman ledger.",
      inputSchema: statusInput,
      outputSchema: statusOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      respond(async () => {
        const resolution = await resolvePlan(context.app, input.plan);
        const ledger = { root: context.app.root, source: context.app.source };
        if (!resolution.planName)
          return { resolved: false, ledger, candidates: resolution.candidates };
        const view = await getPlanStatus(context.app, {
          plan: input.plan,
          includeHandoff: input.include_handoff,
        });
        return {
          resolved: true,
          ledger,
          candidates: resolution.candidates,
          plan: {
            name: view.planName,
            title: view.title,
            base_commit: view.baseCommit,
            handoff: view.handoff,
            tasks: view.tasks,
            counts: view.counts,
            finalizable: view.finalizable,
          },
        };
      }),
  );
}
