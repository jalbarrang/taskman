import type { AppContext } from "../app/context.js";
import { MutationQueue } from "./mutation-queue.js";

export interface McpContext {
  readonly app: AppContext;
  readonly mutations: MutationQueue;
}

export function makeMcpContext(app: AppContext): McpContext {
  return { app, mutations: new MutationQueue() };
}
