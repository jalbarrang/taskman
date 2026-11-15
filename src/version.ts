/**
 * Package version lookup.
 *
 * `package.json` sits one level above both the source tree and the bundled
 * `dist/` entry points, so this resolves identically in tests and when the
 * package is published. The fallback keeps a missing manifest non-fatal.
 */

import { readFileSync } from "node:fs";

export function packageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
