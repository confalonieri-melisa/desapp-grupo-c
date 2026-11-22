import { HealthController } from "@/backend/controllers/health.controller";
import { NextResponse } from "next/server";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new HealthController();

export function GET(request: Request) {
  return requestObservation.observe(request, "/api/health", () =>
    NextResponse.json(controller.getHealth(), { status: 200 }),
  );
}
