/**
 * Read-side CLI command registration (status, list, initiatives).
 */

import type { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { listPlansCommand, listInitiativesCommand } from './commands/list.js';
import { initiativeStatusCommand } from './commands/initiative-status.js';

export function registerQueryCommands(program: Command): void {
  program
    .command('status')
    .description('Progress + task ids/statuses for the active plan')
    .option('--plan <name>', 'plan name (or .plans/<name>) to inspect')
    .option('--json', 'machine-readable JSON output')
    .action((opts) => statusCommand(opts));

  program
    .command('list')
    .description('List plans')
    .option('--status <status>', 'all|in-progress|done|superseded|abandoned')
    .option('--sort <field>', 'name|date-asc|date-desc|tasks')
    .option('--json', 'machine-readable JSON output')
    .action((opts) => listPlansCommand(opts));

  program
    .command('initiatives')
    .description('List initiatives')
    .option('--status <status>', 'all|in-progress|done|superseded|abandoned')
    .option('--json', 'machine-readable JSON output')
    .action((opts) => listInitiativesCommand(opts));

  program
    .command('initiative-status')
    .description('Member plans + readiness for an initiative')
    .argument('[name]', 'initiative name (defaults to the sole in-progress one)')
    .option('--json', 'machine-readable JSON output')
    .action((name, opts) => initiativeStatusCommand(name, opts));
}
