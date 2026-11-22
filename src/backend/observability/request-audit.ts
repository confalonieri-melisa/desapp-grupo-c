export type AuditEvent = {
  timestamp: string;
  user: string;
  method: string;
  operation: string;
  parameters: unknown;
  status: number;
  durationMs: number;
  correlationId: string;
};

const sensitiveField = /(password|token|secret|authorization|cookie|api[-_]?key)/i;

export function sanitizeAuditValue(value: unknown, fieldName?: string): unknown {
  if (fieldName && sensitiveField.test(fieldName)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditValue(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, sanitizeAuditValue(nestedValue, key)]),
  );
}

export class RequestAudit {
  record(event: AuditEvent): void {
    console.log(JSON.stringify({ ...event, parameters: sanitizeAuditValue(event.parameters) }));
  }
}

export const requestAudit = new RequestAudit();
