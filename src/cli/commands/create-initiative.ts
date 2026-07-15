/**
 * `taskman create-initiative` — create an initiative that groups multiple plans.
 *
 * CLI sibling of plan-mode's `submit_initiative`: writes INITIATIVE.md and an
 * initiatives.jsonl registry entry. Overview comes from `--overview`,
 * `--overview-file`, or stdin.
 */

import { Effect } from "effect";
import { saveInitiative } from "../../storage/plan-storage.js";
import {
  readInitiativesManifest,
  upsertInitiativeEntry,
} from "../../storage/initiatives-manifest.js";
import { runPlanIO, displayPath, CliError } from "../runtime.js";
import { resolveContent } from "../input.js";
import { emit } from "../format.js";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createInitiativeCommand(opts: {
  name?: string;
  title?: string;
  overview?: string;
  overviewFile?: string;
  json?: boolean;
}): Promise<void> {
  if (!opts.name) throw new CliError("--name is required.");
  if (!opts.title) throw new CliError("--title is required.");
  if (!KEBAB.test(opts.name)) {
    throw new CliError(`--name must be kebab-case (e.g. "auth-overhaul"), got "${opts.name}".`);
  }

  const name = opts.name;
  // Ledger-relative; the runtime roots it at the resolved plans root.
  const initiativeDir = name;
  const overview = await resolveContent(opts.overview, opts.overviewFile, "overview");

  const existing = await runPlanIO(readInitiativesManifest());
  if (existing.some((entry) => entry.name === name)) {
    throw new CliError(
      `Initiative "${name}" already exists. Pick a new --name or revise the existing initiative.`,
    );
  }

  await runPlanIO(
    Effect.gen(function* () {
      yield* saveInitiative(initiativeDir, overview);
      yield* upsertInitiativeEntry(name, { status: "in-progress", title: opts.title! });
    }),
  );

  emit(
    Boolean(opts.json),
    { name, title: opts.title, initiative_dir: displayPath(name) },
    `Initiative "${opts.title}" created in ${displayPath(name)}. Submit member plans with --initiative ${name}.`,
  );
}
