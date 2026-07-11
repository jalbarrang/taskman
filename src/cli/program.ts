/**
 * Commander program wiring — each subcommand delegates to `cli/commands/`.
 */

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { registerQueryCommands } from './register-query.js';
import { registerMutateCommands } from './register-mutate.js';

function packageVersion(): string {
  try {
    // Resolved against the bundled dist/cli.mjs at runtime (one level above dist/).
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('taskman')
    .description(
      'Task-management engine over a JSONL plan ledger (default .taskman/plans/, configurable via .taskmanrc)',
    )
    .version(packageVersion());
  registerQueryCommands(program);
  registerMutateCommands(program);
  return program;
}
