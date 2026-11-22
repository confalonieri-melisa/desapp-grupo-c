import { randomUUID } from "node:crypto";
import { verifyToken } from "@/backend/utils/jwt";
import { httpMetrics } from "@/backend/observability/http-metrics";
import { requestAudit } from "@/backend/observability/request-audit";

type RequestAction = (request: Request) => Response | Promise<Response>;

type Observation = {
  correlationId: string;
  startedAt: number;
  parameters: unknown;
};

async function requestParameters(request: Request): Promise<unknown> {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  let body: unknown;

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.clone().json();
    } catch {
      body = undefined;
    }
  }

  return { path: url.pathname, query, ...(body === undefined ? {} : { body }) };
}

function authenticatedUser(request: Request): string {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return "anonymous";

  try {
    return verifyToken(token).sub;
  } catch {
    return "anonymous";
  }
}

function withCorrelationId(response: Response, correlationId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-correlation-id", correlationId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export class RequestObservation {
  constructor(
    private readonly metrics = httpMetrics,
    private readonly audit = requestAudit,
  ) {}

  async observe(request: Request, operation: string, action: RequestAction): Promise<Response> {
    const observation = await this.beginObservation(request);
    let response: Response | undefined;
    let status = 500;

    try {
      response = await action(request);
      status = response.status;
      return withCorrelationId(response, observation.correlationId);
    } finally {
      this.completeObservation(request, operation, observation, response?.status ?? status);
    }
  }

  private async beginObservation(request: Request): Promise<Observation> {
    return {
      correlationId: request.headers.get("x-correlation-id") ?? randomUUID(),
      startedAt: performance.now(),
      parameters: await requestParameters(request),
    };
  }

  private completeObservation(
    request: Request,
    operation: string,
    observation: Observation,
    status: number,
  ): void {
    const durationMs = Math.max(0, performance.now() - observation.startedAt);

    this.audit.record({
      timestamp: new Date().toISOString(),
      user: authenticatedUser(request),
      method: request.method,
      operation,
      parameters: observation.parameters,
      status,
      durationMs,
      correlationId: observation.correlationId,
    });

    if (operation !== "/api/metrics") {
      this.metrics.record({ method: request.method, operation, status, durationMs });
    }
  }
}

export const requestObservation = new RequestObservation();
