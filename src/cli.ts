/**
 * `taskman` CLI — drive the `.plans/` task ledger from any Node harness.
 *
 * Thin entry over Commander wiring in `cli/program.ts`. Human text by default;
 * `--json` for machines.
 */

import { CliError } from './cli/runtime.js';
import { buildProgram } from './cli/program.js';

export { buildProgram };

export async function main(argv: string[] = process.argv): Promise<void> {
  try {
    await buildProgram().parseAsync(argv);
  } catch (err) {
    const message =
      err instanceof CliError ? err.message : err instanceof Error ? err.message : String(err);
    process.stderr.write(`taskman: ${message}\n`);
    process.exitCode = 1;
  }
}

main();
