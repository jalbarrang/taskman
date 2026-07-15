export type AppErrorCode = "PLAN_NOT_FOUND" | "AMBIGUOUS_PLAN" | "INVALID_INPUT";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly data?: Record<string, unknown>;

  constructor(message: string);
  constructor(code: AppErrorCode, message: string, data?: Record<string, unknown>);
  constructor(
    codeOrMessage: AppErrorCode | string,
    message?: string,
    data?: Record<string, unknown>,
  ) {
    super(message ?? codeOrMessage);
    this.name = "AppError";
    this.code = message ? (codeOrMessage as AppErrorCode) : "INVALID_INPUT";
    this.data = message ? data : undefined;
  }
}
