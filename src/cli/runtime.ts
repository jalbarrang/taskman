/**
 * Shared CLI plumbing: `.taskmanrc` ledger-root resolution, a single
 * `runPlanIO` bridge rooted at the ledger, plus stateless plan resolution that
 * exits with a clear message when no single plan can be picked.
 */

import { join } from 'node:path';
import { resolveLedgerRoot, type ResolvedLedgerRoot } from '../config.js';
import { makePlanRuntime, type RunPlanIO } from '../effects/runtime.js';
import { resolvePlanByName } from '../resolve.js';

let resolved: ResolvedLedgerRoot | undefined;

/**
 * Ledger root for this CLI process, resolved from `<cwd>/.taskmanrc` (or the
 * default `.taskman/plans`). Resolved lazily on first use — not at import —
 * so a malformed `.taskmanrc` surfaces through the CLI's normal error path,
 * and relative roots keep resolving against the working directory at
 * operation time.
 */
export function getLedger(): ResolvedLedgerRoot {
  resolved ??= resolveLedgerRoot();
  return resolved;
}

let bridge: RunPlanIO | undefined;

export const runPlanIO: RunPlanIO = (program) => {
  bridge ??= makePlanRuntime(getLedger().root);
  return bridge(program);
};

/** Root-prefixed path for human/JSON output (storage paths stay ledger-relative). */
export function displayPath(...segments: string[]): string {
  return join(getLedger().root, ...segments);
}

export class CliError extends Error {}

/**
 * Resolve a target plan directory from an optional `--plan` hint, else the sole
 * in-progress plan. Throws `CliError` (caught at the top level → exit 1) with
 * the in-progress candidates when resolution is ambiguous or misses.
 */
export async function resolvePlanDir(
  name?: string,
): Promise<{ planName: string; planDir: string }> {
  const { planName, planDir, candidates } = await runPlanIO(resolvePlanByName({ name }));
  if (planName && planDir) return { planName, planDir };

  if (name) {
    throw new CliError(
      `Plan "${name}" not found. In-progress plans: ${candidates.join(', ') || '(none)'}.`,
    );
  }
  if (candidates.length > 1) {
    throw new CliError(
      `Multiple in-progress plans — pass --plan <name>. Candidates: ${candidates.join(', ')}.`,
    );
  }
  throw new CliError(
    `No in-progress plan found in ${displayPath('plans.jsonl')}. Pass --plan <name>.`,
  );
}
