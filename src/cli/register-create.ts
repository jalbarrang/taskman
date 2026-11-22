/**
 * Create / revise / close CLI command registration.
 */

import type { Command } from "commander";
import { INITIATIVE_STATES, PLAN_STATES } from "../lifecycle/transitions.js";
import { closePlanCommand, closeInitiativeCommand } from "./commands/close.js";
import { createPlanCommand } from "./commands/create-plan.js";
import { createInitiativeCommand } from "./commands/create-initiative.js";
import { revisePlanCommand } from "./commands/revise-plan.js";

export function registerCreateCommands(program: Command): void {
  program
    .command("create-plan")
    .description("Create a plan (tasks.jsonl + registry entry) from any harness")
    .option("--name <name>", "short kebab-case plan name (defaults to a kebab of --title)")
    .requiredOption("--title <title>", "human-readable plan title")
    .option("--overview <text>", "plan overview markdown: goal, approach, constraints, verification")
    .option("--overview-file <path>", 'read the plan overview markdown from a file ("-" for stdin)')
    .option("--tasks <json>", "tasks as an inline JSON array of { description, ... }")
    .option("--tasks-file <path>", 'read the tasks JSON array from a file ("-" for stdin)')
    .option("--initiative <name>", "parent initiative name to link this plan to")
    .option("--depends-on <names>", "comma-separated plan names this plan depends on")
    .option("--json", "machine-readable JSON output")
    .action((opts) => createPlanCommand(opts));

  program
    .command("create-initiative")
    .description("Create an initiative (INITIATIVE.md + registry entry) that groups plans")
    .requiredOption("--name <name>", "short kebab-case initiative name")
    .requiredOption("--title <title>", "human-readable initiative title")
    .option("--overview <text>", "INITIATIVE.md markdown (inline)")
    .option("--overview-file <path>", 'read INITIATIVE.md markdown from a file ("-" for stdin)')
    .option("--json", "machine-readable JSON output")
    .action((opts) => createInitiativeCommand(opts));

  program
    .command("revise-plan")
    .description("Rewrite an existing plan in place; omitted fields preserved")
    .requiredOption("--plan <name>", "plan name (any directory prefix is stripped) to revise")
    .option("--title <title>", "new human-readable plan title")
    .option("--overview <text>", "replace the plan overview markdown (empty string clears it)")
    .option("--overview-file <path>", 'read the replacement overview from a file ("-" for stdin)')
    .option("--tasks <json>", "replacement tasks JSON array of { id, description, ... }")
    .option("--tasks-file <path>", 'read replacement tasks JSON from a file ("-" for stdin)')
    .option("--initiative <name>", "re-link parent initiative (omit to preserve)")
    .option("--depends-on <names>", "comma-separated plan deps (omit to preserve)")
    .option("--json", "machine-readable JSON output")
    .action((opts) => revisePlanCommand(opts));

  program
    .command("close")
    .description("Set a plan lifecycle status")
    .argument("<status>", PLAN_STATES.join("|"))
    .option("--plan <name>", "plan to target")
    .option("--reason <text>", "why (recorded in the registry)")
    .option("--json", "machine-readable JSON output")
    .action((status, opts) => closePlanCommand(status, opts));

  program
    .command("close-initiative")
    .description("Set an initiative lifecycle status")
    .argument("<status>", INITIATIVE_STATES.join("|"))
    .argument("<name>", "initiative name")
    .option("--reason <text>", "why (recorded in the registry)")
    .option("--json", "machine-readable JSON output")
    .action((status, name, opts) => closeInitiativeCommand(status, name, opts));
}
