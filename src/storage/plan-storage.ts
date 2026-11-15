/**
 * Plan document I/O — the initiative markdown document.
 *
 * Plans are recorded as a registry entry plus `tasks.jsonl`; only initiatives
 * keep a prose document (`INITIATIVE.md`).
 */

import { Effect } from "effect";
import { FileSystem } from "../effects/filesystem.js";
import type { PlanWriteError } from "../errors.js";

export function saveInitiative(
  initiativeDir: string,
  content: string,
): Effect.Effect<void, PlanWriteError, FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem;
    yield* fs.makeDir(initiativeDir);
    yield* fs.writeFileString(`${initiativeDir}/INITIATIVE.md`, content);
  });
}
