import { describe, expect, it, vi } from "vitest";
import { AuthController } from "@/controllers/auth.controller";
import { User } from "@/models/User";
import { UserRole } from "@/models/enums";
import { UnauthorizedError } from "@/errors/http.error";
import type { UserRepository } from "@/repositories/user.repository";
import { AuthService } from "@/services/auth.service";

function repositoryMock(
  findByEmail: ReturnType<typeof vi.fn>,
  save: ReturnType<typeof vi.fn>,
): UserRepository {
  return { findById: vi.fn(), findByEmail, save } as unknown as UserRepository;
}

describe("authentication application flows", () => {
  it("returns 201 for a valid registration", async () => {
    const service = new AuthService(
      repositoryMock(vi.fn(async () => null), vi.fn(async (user: User) => user)),
    );
    const user = await new AuthController(service).register({
      name: "Alice",
      email: "alice@example.com",
      password: "secret",
    });

    expect(user).toMatchObject({
      email: "alice@example.com",
      role: UserRole.INVESTOR,
      creditBalance: 1000,
    });
  });

  it("returns 401 for invalid login credentials", async () => {
    const service = new AuthService(
      repositoryMock(vi.fn(async () => null), vi.fn()),
    );
    await expect(new AuthController(service).login({
      email: "alice@example.com",
      password: "wrong",
    })).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
