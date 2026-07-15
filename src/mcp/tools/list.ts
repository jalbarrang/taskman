import { listLedger } from "../../app/list.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context.js";
import { respond } from "../result.js";
import { listInput, listOutput } from "../schemas/query.js";

export function registerList(server: McpServer, context: McpContext): void {
  server.registerTool(
    "taskman_list",
    {
      description: "List plans or initiatives in the bound Taskman ledger.",
      inputSchema: listInput,
      outputSchema: listOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      respond(async () => {
        const result = await listLedger(context.app, {
          kind: input.kind ?? "plans",
          status: input.status,
          sort: input.sort,
        });
        return { kind: result.kind, items: result.items };
      }),
  );
}
