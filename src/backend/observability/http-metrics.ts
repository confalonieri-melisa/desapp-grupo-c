export type HttpMetric = {
  method: string;
  operation: string;
  status: number;
  durationMs: number;
};

type MetricAggregate = {
  count: number;
  durationMs: number;
};

function metricKey(metric: Pick<HttpMetric, "method" | "operation" | "status">) {
  return JSON.stringify([metric.method, metric.operation, metric.status]);
}

function escapeLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
}

export class HttpMetrics {
  private readonly requests = new Map<string, MetricAggregate>();
  private readonly durations = new Map<string, MetricAggregate>();
  private readonly errors = new Map<string, number>();

  record(metric: HttpMetric): void {
    const requestKey = metricKey(metric);
    const request = this.requests.get(requestKey) ?? { count: 0, durationMs: 0 };
    request.count += 1;
    request.durationMs += metric.durationMs;
    this.requests.set(requestKey, request);

    const durationKey = JSON.stringify([metric.method, metric.operation]);
    const duration = this.durations.get(durationKey) ?? { count: 0, durationMs: 0 };
    duration.count += 1;
    duration.durationMs += metric.durationMs;
    this.durations.set(durationKey, duration);

    if (metric.status >= 400) {
      const statusClass = `${Math.floor(metric.status / 100)}xx`;
      this.errors.set(statusClass, (this.errors.get(statusClass) ?? 0) + 1);
    }
  }

  reset(): void {
    this.requests.clear();
    this.durations.clear();
    this.errors.clear();
  }

  toPrometheus(): string {
    const lines = [
      "# HELP http_requests_total Total HTTP requests.",
      "# TYPE http_requests_total counter",
    ];

    for (const [key, aggregate] of this.requests) {
      const [method, operation, status] = JSON.parse(key) as [string, string, number];
      lines.push(
        `http_requests_total{method="${escapeLabel(method)}",operation="${escapeLabel(operation)}",status="${status}"} ${aggregate.count}`,
      );
    }

    lines.push(
      "# HELP http_request_duration_ms_sum Total observed request duration in milliseconds.",
      "# TYPE http_request_duration_ms_sum counter",
      "# HELP http_request_duration_ms_count Number of observed request durations.",
      "# TYPE http_request_duration_ms_count counter",
    );

    for (const [key, aggregate] of this.durations) {
      const [method, operation] = JSON.parse(key) as [string, string];
      const labels = `method="${escapeLabel(method)}",operation="${escapeLabel(operation)}"`;
      lines.push(`http_request_duration_ms_sum{${labels}} ${aggregate.durationMs}`);
      lines.push(`http_request_duration_ms_count{${labels}} ${aggregate.count}`);
    }

    lines.push(
      "# HELP http_errors_total Total HTTP errors by status class.",
      "# TYPE http_errors_total counter",
    );
    for (const [statusClass, count] of this.errors) {
      lines.push(`http_errors_total{status_class="${statusClass}"} ${count}`);
    }

    return `${lines.join("\n")}\n`;
  }
}

export const httpMetrics = new HttpMetrics();
