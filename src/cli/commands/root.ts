/**
 * `taskman root` — print the resolved plans root so humans and agents can
 * discover which folder holds the ledger (default or `.taskmanrc`-configured).
 */

import { resolve } from "node:path";
import { TASKMANRC_FILENAME } from "../../config.js";
import { getLedger } from "../runtime.js";
import { emit } from "../format.js";

export function rootCommand(opts: { json?: boolean }): void {
  const ledger = getLedger();
  const origin = ledger.source === "taskmanrc" ? `from ${TASKMANRC_FILENAME}` : "default";

  emit(
    Boolean(opts.json),
    {
      plans_root: ledger.root,
      source: ledger.source,
      absolute: resolve(process.cwd(), ledger.root),
    },
    `Plans root: ${ledger.root} (${origin})`,
  );
}
