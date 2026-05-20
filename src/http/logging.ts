import type { Context } from "fresh";

export type LogValue = string | number | boolean | null | undefined | LogValue[] | {
  [key: string]: LogValue;
};
export type LogContext = Record<string, LogValue>;
type LogLevel = "info" | "warn" | "error";

const logEncoder = new globalThis.TextEncoder();

export async function logRequest(ctx: Context<unknown>): Promise<Response> {
  const startedAt = performance.now();

  try {
    const response = await ctx.next();
    const context = getRequestLogContext(ctx, {
      status: response.status,
      durationMs: getDurationMs(startedAt),
    });

    if (response.status >= 500) {
      logError("request", context);
    } else if (response.status >= 400) {
      logWarn("request", context);
    } else {
      logInfo("request", context);
    }

    return response;
  } catch (error) {
    logError(
      "request_unhandled_error",
      getRequestLogContext(ctx, {
        durationMs: getDurationMs(startedAt),
        error: getErrorLog(error),
      }),
    );
    throw error;
  }
}

export function getRequestLogContext(
  ctx: Context<unknown>,
  context: LogContext = {},
): LogContext {
  return {
    method: ctx.req.method,
    path: ctx.url.pathname,
    route: ctx.route ?? undefined,
    ...context,
  };
}

export function logInfo(event: string, context: LogContext = {}): void {
  writeLog("info", event, context);
}

export function logWarn(event: string, context: LogContext = {}): void {
  writeLog("warn", event, context);
}

export function logError(event: string, context: LogContext = {}): void {
  writeLog("error", event, context);
}

export function getErrorLog(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function getDurationMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function writeLog(level: LogLevel, event: string, context: LogContext): void {
  const message = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...context,
  });
  const encodedMessage = logEncoder.encode(`${message}\n`);

  if (level === "error") {
    Deno.stderr.writeSync(encodedMessage);
  } else if (level === "warn") {
    Deno.stderr.writeSync(encodedMessage);
  } else {
    Deno.stdout.writeSync(encodedMessage);
  }
}
