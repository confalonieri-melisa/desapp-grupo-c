import { describe, expect, it, vi } from "vitest";
import { User } from "@/models/User";
import { UserRole } from "@/models/enums";
import { ConflictError, UnauthorizedError } from "@/errors/http.error";
import type { UserRepository } from "@/repositories/user.repository";
import { AuthService } from "@/services/auth.service";
import { verifyToken } from "@/utils/jwt";

function repositoryMock(
  findByEmail: ReturnType<typeof vi.fn>,
  save: ReturnType<typeof vi.fn>,
): UserRepository {
  return { findById: vi.fn(), findByEmail, save } as unknown as UserRepository;
}

describe("AuthService", () => {
  it("registers an investor with 1,000 credits and the direct password", async () => {
    const save = vi.fn(async (user: User) => user);
    const service = new AuthService(
      repositoryMock(vi.fn(async () => null), save),
    );

    const result = await service.register({
      name: "Alice",
      email: "alice@example.com",
      password: "secret",
    });

    expect(result.creditBalance).toBe(1000);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        password: "secret",
        role: UserRole.INVESTOR,
      }),
    );
  });

  it("rejects duplicate registrations", async () => {
    const existing = new User({
      name: "Alice",
      email: "alice@example.com",
      password: "secret",
    });
    const service = new AuthService(
      repositoryMock(vi.fn(async () => existing), vi.fn()),
    );

    await expect(
      service.register({
        name: "Another Alice",
        email: "alice@example.com",
        password: "other",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("logs in and issues a token valid for the user", async () => {
    const user = new User({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Alice",
      email: "alice@example.com",
      password: "secret",
    });
    const service = new AuthService(
      repositoryMock(vi.fn(async () => user), vi.fn()),
    );

    const result = await service.login({
      email: "alice@example.com",
      password: "secret",
    });

    const payload = verifyToken(result.token);

    expect(payload).toMatchObject({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60);
  });

  it("rejects invalid credentials", async () => {
    const service = new AuthService(
      repositoryMock(vi.fn(async () => null), vi.fn()),
    );

    await expect(
      service.login({
        email: "missing@example.com",
        password: "secret",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
