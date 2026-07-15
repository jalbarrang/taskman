import { join } from 'node:path';
import { resolvePlanByName } from '../resolve.js';
import { AppError } from './errors.js';
import type { AppContext } from './context.js';

export interface PlanResolution {
  planName?: string;
  planDir?: string;
  candidates: string[];
}

export async function resolvePlan(context: AppContext, name?: string): Promise<PlanResolution> {
  return context.run(resolvePlanByName({ name }));
}

export async function requirePlan(
  context: AppContext,
  name?: string,
): Promise<{ planName: string; planDir: string }> {
  const result = await resolvePlan(context, name);
  if (result.planName && result.planDir) return result as { planName: string; planDir: string };
  if (name) {
    throw new AppError(
      'PLAN_NOT_FOUND',
      `Plan "${name}" not found. In-progress plans: ${result.candidates.join(', ') || '(none)'}.`,
      { candidates: result.candidates },
    );
  }
  if (result.candidates.length > 1) {
    throw new AppError(
      'AMBIGUOUS_PLAN',
      `Multiple in-progress plans — pass --plan <name>. Candidates: ${result.candidates.join(', ')}.`,
      { candidates: result.candidates },
    );
  }
  throw new AppError(
    'PLAN_NOT_FOUND',
    `No in-progress plan found in ${join(context.displayRoot, 'plans.jsonl')}. Pass --plan <name>.`,
  );
}
