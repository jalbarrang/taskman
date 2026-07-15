/** Shared CLI adapters over the application context. */

import { join } from "node:path";
import { type ResolvedLedgerRoot } from "../config.js";
import { type RunPlanIO } from "../effects/runtime.js";
import { makeAppContext, type AppContext } from "../app/context.js";
import { requirePlan } from "../app/resolve-plan.js";

let context: AppContext | undefined;
let contextCwd: string | undefined;

export function getAppContext(): AppContext {
  const cwd = process.cwd();
  if (!context || contextCwd !== cwd) {
    context = makeAppContext(cwd);
    contextCwd = cwd;
  }
  return context;
}

export function getLedger(): ResolvedLedgerRoot {
  const { displayRoot: root, source } = getAppContext();
  return { root, source };
}

export const runPlanIO: RunPlanIO = (program) => getAppContext().run(program);

export function displayPath(...segments: string[]): string {
  return join(getAppContext().displayRoot, ...segments);
}

export { AppError as CliError } from "../app/errors.js";

export async function resolvePlanDir(
  name?: string,
): Promise<{ planName: string; planDir: string }> {
  return requirePlan(getAppContext(), name);
}
