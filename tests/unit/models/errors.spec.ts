import { describe, it, expect } from "vitest";
import {
  DomainValidationError,
  InvalidLeagueError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  toHttpErrorResponse,
} from "@/models/errors";

describe("Domain Errors and HTTP Error Mapping (errors.ts)", () => {
  it("DomainValidationError should have statusCode 400", () => {
    const err = new DomainValidationError("Invalid value");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid value");
  });

  it("InvalidLeagueError should have statusCode 400 and formatted message", () => {
    const err = new InvalidLeagueError("MLS", ["PREMIER_LEAGUE", "LA_LIGA"]);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain("MLS");
    expect(err.details).toEqual({ league: "MLS", validLeagues: ["PREMIER_LEAGUE", "LA_LIGA"] });
  });

  it("UnauthorizedError should default to 401 status code", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Unauthorized access");
  });

  it("NotFoundError should format 404 response details", () => {
    const err = new NotFoundError("Player", "p123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("Player with id 'p123' was not found.");
  });

  it("ConflictError should have statusCode 409", () => {
    const err = new ConflictError("Email already registered");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Email already registered");
  });

  it("toHttpErrorResponse should map DomainError to correct status code and payload", () => {
    const domainErr = new NotFoundError("User", 42);
    const response = toHttpErrorResponse(domainErr);

    expect(response.statusCode).toBe(404);
    expect(response.payload).toEqual({
      error: "User with id '42' was not found.",
      statusCode: 404,
      details: { resource: "User", identifier: 42 },
    });
  });

  it("toHttpErrorResponse should map standard unknown Error to 500 status code", () => {
    const genericErr = new Error("Database connection dropped");
    const response = toHttpErrorResponse(genericErr);

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({
      error: "Database connection dropped",
      statusCode: 500,
    });
  });
});
