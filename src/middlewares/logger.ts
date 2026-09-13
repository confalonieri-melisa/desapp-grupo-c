import { crypto } from "next/dist/compiled/@edge-runtime/primitives";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogPayload {
  level: LogLevel;
  message: string;
  correlationId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

/**
 * Formats and outputs structured JSON log entries.
 */
export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  public static generateCorrelationId(): string {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  public static formatLog(
    level: LogLevel,
    message: string,
    correlationId?: string,
    data?: Record<string, unknown>,
    err?: Error
  ): LogPayload {
    const payload: LogPayload = {
      level,
      message,
      timestamp: Logger.getTimestamp(),
      ...(correlationId && { correlationId }),
      ...(data && { data }),
    };

    if (err) {
      payload.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    return payload;
  }

  public static info(
    message: string,
    correlationId?: string,
    data?: Record<string, unknown>
  ): LogPayload {
    const payload = Logger.formatLog("info", message, correlationId, data);
    console.log(JSON.stringify(payload));
    return payload;
  }

  public static warn(
    message: string,
    correlationId?: string,
    data?: Record<string, unknown>
  ): LogPayload {
    const payload = Logger.formatLog("warn", message, correlationId, data);
    console.warn(JSON.stringify(payload));
    return payload;
  }

  public static error(
    message: string,
    correlationId?: string,
    err?: Error,
    data?: Record<string, unknown>
  ): LogPayload {
    const payload = Logger.formatLog("error", message, correlationId, data, err);
    console.error(JSON.stringify(payload));
    return payload;
  }

  public static debug(
    message: string,
    correlationId?: string,
    data?: Record<string, unknown>
  ): LogPayload {
    const payload = Logger.formatLog("debug", message, correlationId, data);
    console.debug(JSON.stringify(payload));
    return payload;
  }
}
