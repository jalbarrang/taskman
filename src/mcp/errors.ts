import { AppError } from "../app/errors.js";

type ToolError = { code: string; message: string; data?: Record<string, unknown> };

export function classifyError(error: unknown): ToolError {
  if (error instanceof AppError)
    return { code: error.code, message: error.message, data: error.data };
  const tagged = error as {
    _tag?: string;
    name?: string;
    message?: string;
    path?: string;
    taskId?: string;
    from?: string;
    to?: string;
    allowed?: readonly string[];
  };
  const tag = tagged?._tag ?? tagged?.name ?? "";
  if (tag.includes("TaskNotFound"))
    return {
      code: "TASK_NOT_FOUND",
      message: tagged.message ?? "Task not found.",
      data: { task_id: tagged.taskId ?? "" },
    };
  if (tag.includes("InvalidTaskTransition"))
    return {
      code: "INVALID_INPUT",
      message: tagged.message ?? "Illegal task transition.",
      data: {
        task_id: tagged.taskId ?? "",
        from: tagged.from,
        to: tagged.to,
        allowed: tagged.allowed,
      },
    };
  if (
    ["JsonlParseError", "JsonlValidationError", "MissingMetaRecord"].some((name) =>
      tag.includes(name),
    )
  )
    return { code: "LEDGER_CORRUPT", message: tagged.message ?? "Ledger data is corrupt." };
  if (
    ["PlanReadError", "PlanWriteError", "TasksFileNotFound"].some((name) => tag.includes(name)) ||
    (error as NodeJS.ErrnoException)?.code
  )
    return { code: "IO_FAILURE", message: tagged.message ?? "Ledger I/O failed." };
  return {
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected internal error.",
  };
}
