import { resolve } from "node:path";
import { resolveLedgerRoot } from "../config.js";
import { makePlanRuntime, type RunPlanIO } from "../effects/runtime.js";

export interface AppContext {
  readonly root: string;
  readonly displayRoot: string;
  readonly source: "default" | "taskmanrc";
  readonly run: RunPlanIO;
}

export function makeAppContext(cwd: string = process.cwd()): AppContext {
  const ledger = resolveLedgerRoot(cwd);
  return {
    root: resolve(cwd, ledger.root),
    displayRoot: ledger.root,
    source: ledger.source,
    run: makePlanRuntime(resolve(cwd, ledger.root)),
  };
}
