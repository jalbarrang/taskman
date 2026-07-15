/**
 * Ledger-root resolution — where the plan ledger lives on disk.
 *
 * The default is `.taskman/plans/`, overridable per-project by a `.taskmanrc`
 * JSON file in the working directory with a `"plans-root"` property whose value
 * IS the ledger folder (it contains `plans.jsonl` directly). Resolution is
 * cwd-only by design: no walk-up, no env var, so agents can always predict
 * which folder a command will target.
 *
 * Only entry points (the CLI, or a library consumer that opts in) call
 * `resolveLedgerRoot` — storage programs never read config; they see the root
 * solely through the `FileSystem` seam built by `makePlanRuntime(root)`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_PLANS_ROOT = ".taskman/plans";
export const TASKMANRC_FILENAME = ".taskmanrc";

export interface ResolvedLedgerRoot {
  /**
   * Ledger folder as configured (or the default) — may be relative; feed to
   * `makePlanRuntime` and use as the prefix for user-facing paths.
   */
  root: string;
  /** `taskmanrc` when read from a config file, else `default`. */
  source: "taskmanrc" | "default";
}

/**
 * Read `<cwd>/.taskmanrc` and resolve the ledger root. A missing file yields
 * the default; a malformed file or a non-string `plans-root` throws an `Error`
 * with a message fit for direct CLI display (exit 1).
 */
export function resolveLedgerRoot(cwd?: string): ResolvedLedgerRoot {
  const rcPath = join(cwd ?? process.cwd(), TASKMANRC_FILENAME);

  let text: string;
  try {
    text = readFileSync(rcPath, "utf-8");
  } catch {
    return { root: DEFAULT_PLANS_ROOT, source: "default" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${TASKMANRC_FILENAME} is not valid JSON: ${detail}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${TASKMANRC_FILENAME} must be a JSON object.`);
  }

  const raw = (parsed as Record<string, unknown>)["plans-root"];
  if (raw === undefined) return { root: DEFAULT_PLANS_ROOT, source: "default" };
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`${TASKMANRC_FILENAME}: "plans-root" must be a non-empty string.`);
  }

  const root = raw.trim().replace(/\/+$/, "");
  if (root === "") {
    throw new Error(`${TASKMANRC_FILENAME}: "plans-root" must not be the filesystem root.`);
  }
  return { root, source: "taskmanrc" };
}
