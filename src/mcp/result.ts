import { classifyError } from "./errors.js";

export function success<T extends Record<string, unknown>>(structuredContent: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

export async function respond<T extends Record<string, unknown>>(operation: () => Promise<T>) {
  try {
    return success(await operation());
  } catch (error) {
    const body = classifyError(error);
    return { content: [{ type: "text" as const, text: JSON.stringify(body) }], isError: true };
  }
}
