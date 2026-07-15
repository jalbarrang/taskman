/**
 * Live Effect runtime for the plan-mode extension.
 *
 * Build the layer once inside the extension entry and run storage programs
 * through the `runPlanIO` bridge so the imperative pi event handlers keep their
 * `await fn(...)` shape.
 */

import { Effect, Layer } from "effect";
import { DEFAULT_PLANS_ROOT } from "../config.js";
import { FileSystem, makeNodeFileSystemService } from "./filesystem.js";

/**
 * Build the live filesystem layer. `root` is the ledger folder itself — the
 * directory that contains `plans.jsonl` directly (default `.taskman/plans`,
 * resolved against the working directory when relative). Storage programs use
 * ledger-relative paths, so the root places the whole registry.
 */
export function makeRuntimeLayer(root: string = DEFAULT_PLANS_ROOT): Layer.Layer<FileSystem> {
  return Layer.succeed(FileSystem, makeNodeFileSystemService(root));
}

/**
 * Build a bridge that runs storage programs against the live filesystem layer.
 * `root` is the ledger folder (see `makeRuntimeLayer`); pass the result of
 * `resolveLedgerRoot()` to honour a `.taskmanrc` — the library never reads
 * config implicitly.
 */
export function makePlanRuntime(root?: string) {
  const layer = makeRuntimeLayer(root);
  return function runPlanIO<A, E>(program: Effect.Effect<A, E, FileSystem>): Promise<A> {
    return Effect.runPromise(program.pipe(Effect.provide(layer)));
  };
}

export type RunPlanIO = ReturnType<typeof makePlanRuntime>;
