import { getHealth } from "@/controllers/health.controller";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(getHealth(), { status: 200 });
}
