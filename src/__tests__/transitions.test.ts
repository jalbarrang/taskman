import { describe, expect, test } from "bun:test";
import {
  INITIATIVE_STATES,
  PLAN_STATES,
  TASK_UPDATE_TARGETS,
  canTransition,
  initiativeMachine,
  isTerminalStatus,
  nextStates,
  planMachine,
  taskMachine,
} from "../lifecycle/transitions.js";

describe("task machine", () => {
  test("update may set any active target from any state", () => {
    expect(canTransition(taskMachine, "pending", "done", "update")).toBe(true);
    expect(canTransition(taskMachine, "done", "pending", "update")).toBe(true);
    expect(canTransition(taskMachine, "deferred", "pending", "update")).toBe(true);
    expect(canTransition(taskMachine, "blocked", "skipped", "update")).toBe(true);
  });

  test("deferred is created by add-task, never reached by update", () => {
    expect(TASK_UPDATE_TARGETS).not.toContain("deferred");
    expect(canTransition(taskMachine, "pending", "deferred", "update")).toBe(false);
  });

  test("projection reopens only blocked and deferred work", () => {
    expect(nextStates(taskMachine, "blocked", "projection")).toEqual(["pending"]);
    expect(nextStates(taskMachine, "deferred", "projection")).toEqual(["pending"]);
    expect(nextStates(taskMachine, "pending", "projection")).toEqual([]);
    expect(nextStates(taskMachine, "done", "projection")).toEqual([]);
  });

  test("self-edges are always legal", () => {
    expect(canTransition(taskMachine, "done", "done", "projection")).toBe(true);
  });
});

describe("plan machine", () => {
  test("projection moves only between in-progress and done", () => {
    expect(canTransition(planMachine, "in-progress", "done", "projection")).toBe(true);
    expect(canTransition(planMachine, "done", "in-progress", "projection")).toBe(true);
    expect(canTransition(planMachine, "superseded", "in-progress", "projection")).toBe(false);
    expect(canTransition(planMachine, "abandoned", "done", "projection")).toBe(false);
  });

  test("repair takes only the safe upgrade edge", () => {
    expect(canTransition(planMachine, "in-progress", "done", "repair")).toBe(true);
    expect(canTransition(planMachine, "done", "in-progress", "repair")).toBe(false);
  });

  test("manual may reopen a terminal plan", () => {
    expect(canTransition(planMachine, "abandoned", "in-progress", "manual")).toBe(true);
    expect(canTransition(planMachine, "superseded", "done", "manual")).toBe(true);
  });

  test("terminal statuses are the non-active ones", () => {
    expect(PLAN_STATES.filter(isTerminalStatus)).toEqual(["done", "superseded", "abandoned"]);
  });
});

describe("initiative machine", () => {
  test("projection mirrors the plan-level in-progress ⇄ done rule", () => {
    expect(canTransition(initiativeMachine, "in-progress", "done", "projection")).toBe(true);
    expect(canTransition(initiativeMachine, "done", "in-progress", "projection")).toBe(true);
    expect(canTransition(initiativeMachine, "abandoned", "in-progress", "projection")).toBe(false);
  });

  test("states match the plan lifecycle literals", () => {
    expect(INITIATIVE_STATES).toEqual(PLAN_STATES);
  });
});
