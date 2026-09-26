export type HealthResponse = {
  status: "ok";
};

export function getHealth(): HealthResponse {
  return {
    status: "ok",
  };
}
