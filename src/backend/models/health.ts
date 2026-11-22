export const HEALTH_STATUS = {
  OK: "ok",
  UNHEALTHY: "unhealthy",
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export const HEALTH_CHECK = {
  LIVE: "live",
  READY: "ready",
} as const;

export type HealthCheck = (typeof HEALTH_CHECK)[keyof typeof HEALTH_CHECK];

export type HealthResponse = {
  status: typeof HEALTH_STATUS.OK;
};

export type OperationalHealthResponse = {
  status: HealthStatus;
  check: HealthCheck;
  database?: HealthStatus;
};

export type DatabaseHealth = {
  dependency: "database";
  status: HealthStatus;
};
