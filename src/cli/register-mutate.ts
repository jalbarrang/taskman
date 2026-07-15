/**
 * Write-side CLI command registration (update-task, add-task, reconcile).
 */

import type { Command } from "commander";
import { updateTaskCommand } from "./commands/update-task.js";
import { addTaskCommand } from "./commands/add-task.js";
import { reconcileCommand } from "./commands/reconcile.js";
import { registerCreateCommands } from "./register-create.js";

export function registerMutateCommands(program: Command): void {
  program
    .command("update-task")
    .description("Set a task status (done|skipped|blocked|pending)")
    .argument("<id>", "task id, e.g. t-001")
    .argument("<status>", "done|skipped|blocked|pending")
    .option("--plan <name>", "plan to target")
    .option("--notes <text>", "notes recorded on the task")
    .option("--json", "machine-readable JSON output")
    .action((id, status, opts) => updateTaskCommand(id, status, opts));

  program
    .command("add-task")
    .description("Append a deferred follow-up task")
    .argument("<description>", "short task label")
    .requiredOption("--reason <text>", "why this follow-up matters")
    .option("--plan <name>", "plan to target")
    .option("--details <text>", "fuller implementation notes")
    .option("--json", "machine-readable JSON output")
    .action((description, opts) => addTaskCommand(description, opts));

  program
    .command("reconcile")
    .description("Detect (and with --apply, repair) status drift")
    .option("--apply", "repair safe in-progress→done drift")
    .option("--json", "machine-readable JSON output")
    .action((opts) => reconcileCommand(opts));

  registerCreateCommands(program);
}
