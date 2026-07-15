/** `taskman reconcile [--apply]` adapter. */

import { reconcileLedger } from '../../app/reconcile.js';
import { getAppContext } from '../runtime.js';
import { emit } from '../format.js';

export async function reconcileCommand(opts: { apply?: boolean; json?: boolean }): Promise<void> {
  const result = await reconcileLedger(getAppContext(), opts);
  const lines: string[] = [];
  if (result.planDrift.length === 0 && result.initiativeDrift.length === 0) {
    lines.push('No drift detected.');
  } else {
    for (const row of result.planDrift) {
      lines.push(
        `  plan ${row.name}: ${row.drift}` +
          (row.drift === 'status'
            ? ` (${row.registryStatus} → ${row.derivedStatus}, ${row.direction})`
            : ''),
      );
    }
    for (const row of result.initiativeDrift) {
      lines.push(`  initiative ${row.name}: status (${row.registryStatus} → ${row.derivedStatus})`);
    }
  }
  if (result.applied) {
    lines.push(
      `Applied: ${result.applied.plans.length} plan(s), ${result.applied.initiatives.length} initiative(s) repaired.`,
    );
  } else if (result.planDrift.length || result.initiativeDrift.length) {
    lines.push('Run with --apply to repair safe (upgrade) drift.');
  }
  emit(
    Boolean(opts.json),
    {
      plan_drift: result.planDrift,
      initiative_drift: result.initiativeDrift,
      applied: result.applied,
    },
    lines.join('\n'),
  );
}
