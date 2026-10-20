import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "@/backend/errors/http.error";
import { toHttpResponse } from "@/backend/errors/to-http-response";

describe("toHttpResponse", () => {
  it.each([
    [new SyntaxError("malformed JSON"), 400],
    [z.object({ value: z.string() }).safeParse({ value: 1 }).error, 400],
  ])("maps invalid request errors to 400", async (error, expectedStatus) => {
    const response = toHttpResponse(error);

    expect(response.status).toBe(expectedStatus);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request data",
    });
  });

  it("maps an HttpError preserving its status and message", async () => {
    const response = toHttpResponse(new ConflictError("Already registered"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Already registered",
    });
  });

  it("maps unauthorized errors as HTTP 401", () => {
    expect(toHttpResponse(new UnauthorizedError()).status).toBe(401);
  });

  it.each([
    [new ForbiddenError(), 403, "Forbidden"],
    [new BadGatewayError(), 502, "External provider unavailable"],
  ])("maps new HTTP errors preserving their status and default message", async (
    error,
    expectedStatus,
    expectedMessage,
  ) => {
    const response = toHttpResponse(error);

    expect(response.status).toBe(expectedStatus);
    await expect(response.json()).resolves.toEqual({ error: expectedMessage });
  });

  it("rethrows unexpected errors", () => {
    const error = new Error("database unavailable");

    expect(() => toHttpResponse(error)).toThrow(error);
  });
});
