/**
 * Explicit lifecycle machines for tasks, plans, and initiatives.
 *
 * Each machine is a table: states, terminal states, and the edges that are
 * legal between them, tagged with the actors allowed to take each edge. Callers
 * ask the table instead of re-implementing the rules, so the policy lives in
 * one place. Self-edges are always legal (idempotent writes).
 *
 * Actors:
 *   - `projection`: the status is re-derived from task or member-plan state.
 *   - `repair`: `reconcile --apply` may only take the safe upgrade edges.
 *   - `manual`: an explicit user command (`close`, `close-initiative`).
 *   - `update`: a manual task status update (`update-task`).
 */

import type { InitiativeStatus, PlanStatus, TaskStatus } from "../types.js";

export interface Edge<S extends string, A extends string> {
  readonly to: S;
  readonly by: readonly A[];
}

export interface Machine<S extends string, A extends string> {
  readonly initial: S;
  /** States that record completion (`completed_at`). */
  readonly terminal: readonly S[];
  readonly edges: Readonly<Record<S, readonly Edge<S, A>[]>>;
}

export type TransitionOutcome<S extends string> =
  | { readonly kind: "changed" }
  | { readonly kind: "unchanged" }
  | { readonly kind: "missing" }
  | { readonly kind: "rejected"; readonly from: S; readonly allowed: readonly S[] };

/** Whether `actor` may move `from` to `to`. Self-edges are always allowed. */
export function canTransition<S extends string, A extends string>(
  machine: Machine<S, A>,
  from: S,
  to: S,
  actor: A,
): boolean {
  if (from === to) return true;
  return machine.edges[from].some((edge) => edge.to === to && edge.by.includes(actor));
}

/** Distinct states `actor` may move `from` to (self excluded). */
export function nextStates<S extends string, A extends string>(
  machine: Machine<S, A>,
  from: S,
  actor: A,
): S[] {
  const targets = machine.edges[from]
    .filter((edge) => edge.by.includes(actor))
    .map((edge) => edge.to);
  return [...new Set(targets)];
}

export function statesOf<S extends string, A extends string>(machine: Machine<S, A>): S[] {
  return Object.keys(machine.edges) as S[];
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskActor = "update" | "projection";

export const TASK_STATES = [
  "pending",
  "done",
  "skipped",
  "blocked",
  "deferred",
] as const satisfies readonly TaskStatus[];

/**
 * Targets a manual `update-task` may set. `deferred` is reachable only by
 * creating a follow-up (`add-task`), not by transitioning an existing task.
 */
export const TASK_UPDATE_TARGETS = [
  "done",
  "skipped",
  "blocked",
  "pending",
] as const satisfies readonly TaskStatus[];

const taskUpdateEdges = (from: TaskStatus): Edge<TaskStatus, TaskActor>[] =>
  TASK_UPDATE_TARGETS.filter((to) => to !== from).map((to) => ({
    to,
    by: ["update"],
  }));

/** Resuming a run reopens blocked and deferred work. */
const taskProjectionEdges: Edge<TaskStatus, TaskActor>[] = [{ to: "pending", by: ["projection"] }];

export const taskMachine = {
  initial: "pending",
  terminal: ["done", "skipped"],
  edges: {
    pending: taskUpdateEdges("pending"),
    done: taskUpdateEdges("done"),
    skipped: taskUpdateEdges("skipped"),
    blocked: [...taskUpdateEdges("blocked"), ...taskProjectionEdges],
    deferred: [...taskUpdateEdges("deferred"), ...taskProjectionEdges],
  },
} satisfies Machine<TaskStatus, TaskActor>;

// ── Plans ────────────────────────────────────────────────────────────────────

export type PlanActor = "projection" | "repair" | "manual";

export const PLAN_STATES = [
  "in-progress",
  "done",
  "superseded",
  "abandoned",
] as const satisfies readonly PlanStatus[];

export const planMachine = {
  initial: "in-progress",
  terminal: ["done", "superseded", "abandoned"],
  edges: {
    "in-progress": [
      { to: "done", by: ["projection", "repair", "manual"] },
      { to: "superseded", by: ["manual"] },
      { to: "abandoned", by: ["manual"] },
    ],
    done: [
      { to: "in-progress", by: ["projection", "manual"] },
      { to: "superseded", by: ["manual"] },
      { to: "abandoned", by: ["manual"] },
    ],
    superseded: [
      { to: "in-progress", by: ["manual"] },
      { to: "done", by: ["manual"] },
      { to: "abandoned", by: ["manual"] },
    ],
    abandoned: [
      { to: "in-progress", by: ["manual"] },
      { to: "done", by: ["manual"] },
      { to: "superseded", by: ["manual"] },
    ],
  },
} satisfies Machine<PlanStatus, PlanActor>;

// ── Initiatives ──────────────────────────────────────────────────────────────

export type InitiativeActor = "projection" | "manual";

export const INITIATIVE_STATES = PLAN_STATES;

export const initiativeMachine = {
  initial: "in-progress",
  terminal: ["done", "superseded", "abandoned"],
  edges: {
    "in-progress": [
      { to: "done", by: ["projection", "manual"] },
      { to: "superseded", by: ["manual"] },
      { to: "abandoned", by: ["manual"] },
    ],
    done: [
      { to: "in-progress", by: ["projection", "manual"] },
      { to: "superseded", by: ["manual"] },
      { to: "abandoned", by: ["manual"] },
    ],
    superseded: [
      { to: "in-progress", by: ["manual"] },
      { to: "done", by: ["manual"] },
      { to: "abandoned", by: ["manual"] },
    ],
    abandoned: [
      { to: "in-progress", by: ["manual"] },
      { to: "done", by: ["manual"] },
      { to: "superseded", by: ["manual"] },
    ],
  },
} satisfies Machine<InitiativeStatus, InitiativeActor>;

/** A status is terminal when it records completion (`completed_at`). */
export function isTerminalStatus(status: PlanStatus): boolean {
  const terminal: readonly PlanStatus[] = planMachine.terminal;
  return terminal.includes(status);
}
