/**
 * Create / revise / close CLI command registration.
 */

import type { Command } from 'commander';
import { closePlanCommand, closeInitiativeCommand } from './commands/close.js';
import { createPlanCommand } from './commands/create-plan.js';
import { createHandoffCommand } from './commands/create-handoff.js';
import { createInitiativeCommand } from './commands/create-initiative.js';
import { revisePlanCommand } from './commands/revise-plan.js';

export function registerCreateCommands(program: Command): void {
  program
    .command('create-plan')
    .description('Create a plan (tasks.jsonl + HANDOFF.md + registry entry) from any harness')
    .requiredOption('--name <name>', 'short kebab-case plan name')
    .requiredOption('--title <title>', 'human-readable plan title')
    .option('--handoff <text>', 'HANDOFF.md markdown (inline)')
    .option('--handoff-file <path>', 'read HANDOFF.md markdown from a file ("-" for stdin)')
    .option('--tasks <json>', 'tasks as an inline JSON array of { description, ... }')
    .option('--tasks-file <path>', 'read the tasks JSON array from a file ("-" for stdin)')
    .option('--initiative <name>', 'parent initiative name to link this plan to')
    .option('--depends-on <names>', 'comma-separated plan names this plan depends on')
    .option('--json', 'machine-readable JSON output')
    .action((opts) => createPlanCommand(opts));

  program
    .command('create-initiative')
    .description('Create an initiative (INITIATIVE.md + registry entry) that groups plans')
    .requiredOption('--name <name>', 'short kebab-case initiative name')
    .requiredOption('--title <title>', 'human-readable initiative title')
    .option('--overview <text>', 'INITIATIVE.md markdown (inline)')
    .option('--overview-file <path>', 'read INITIATIVE.md markdown from a file ("-" for stdin)')
    .option('--json', 'machine-readable JSON output')
    .action((opts) => createInitiativeCommand(opts));

  program
    .command('revise-plan')
    .description('Rewrite an existing plan in place; omitted fields preserved')
    .requiredOption('--plan <name>', 'plan name (any directory prefix is stripped) to revise')
    .option('--title <title>', 'new human-readable plan title')
    .option('--handoff <text>', 'new HANDOFF.md markdown (inline)')
    .option('--handoff-file <path>', 'read new HANDOFF.md from a file ("-" for stdin)')
    .option('--tasks <json>', 'replacement tasks JSON array of { id, description, ... }')
    .option('--tasks-file <path>', 'read replacement tasks JSON from a file ("-" for stdin)')
    .option('--initiative <name>', 're-link parent initiative (omit to preserve)')
    .option('--depends-on <names>', 'comma-separated plan deps (omit to preserve)')
    .option('--json', 'machine-readable JSON output')
    .action((opts) => revisePlanCommand(opts));

  program
    .command('create-handoff')
    .description('Write/replace HANDOFF.md for a plan from any harness')
    .argument('[content]', 'HANDOFF.md markdown (inline); else use --file or stdin')
    .option('--plan <name>', 'plan to target')
    .option('--file <path>', 'read markdown from a file ("-" for stdin)')
    .option('--json', 'machine-readable JSON output')
    .action((content, opts) => createHandoffCommand(content, opts));

  program
    .command('close')
    .description('Set a plan lifecycle status')
    .argument('<status>', 'done|superseded|abandoned|in-progress')
    .option('--plan <name>', 'plan to target')
    .option('--reason <text>', 'why (recorded in the registry)')
    .option('--json', 'machine-readable JSON output')
    .action((status, opts) => closePlanCommand(status, opts));

  program
    .command('close-initiative')
    .description('Set an initiative lifecycle status')
    .argument('<status>', 'done|superseded|abandoned|in-progress')
    .argument('<name>', 'initiative name')
    .option('--reason <text>', 'why (recorded in the registry)')
    .option('--json', 'machine-readable JSON output')
    .action((status, name, opts) => closeInitiativeCommand(status, name, opts));
}
