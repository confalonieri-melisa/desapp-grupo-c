import { ZodError } from "zod";
import { HttpError } from "@/backend/errors/http.error";
import {
  AuthorizationError,
  BusinessConflictError,
  IdempotencyConflictError,
  TransientTransactionError,
} from "@/backend/errors/application.error";

export function toHttpResponse(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return Response.json({ error: "Invalid request data" }, { status: 400 });
  }

  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof IdempotencyConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof BusinessConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof TransientTransactionError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  throw error;
}
