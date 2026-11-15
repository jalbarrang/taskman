/**
 * Commander program wiring — each subcommand delegates to `cli/commands/`.
 */

import { Command } from "commander";
import { packageVersion } from "../version.js";
import { registerQueryCommands } from "./register-query.js";
import { registerMutateCommands } from "./register-mutate.js";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("taskman")
    .description(
      "Task-management engine over a JSONL plan ledger (default .taskman/plans/, configurable via .taskmanrc)",
    )
    .version(packageVersion());
  registerQueryCommands(program);
  registerMutateCommands(program);
  program
    .command("mcp")
    .description("Serve the Taskman MCP server over stdio.")
    .action(async () => {
      const { mcpCommand } = await import("./commands/mcp.js");
      await mcpCommand(process.cwd());
    });
  return program;
}
