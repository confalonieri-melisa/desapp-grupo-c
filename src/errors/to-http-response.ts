import { ZodError } from "zod";
import { HttpError } from "@/errors/http.error";

export function toHttpResponse(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return Response.json({ error: "Invalid request data" }, { status: 400 });
  }

  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message },
      { status: error.status },
    );
  }

  throw error;
}
