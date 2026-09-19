import { describe, expect, it } from "vitest";
import { User, INVESTOR_INITIAL_CREDITS } from "@/models/User";
import { UserRole } from "@/models/enums";
import { DomainValidationError } from "@/models/errors";

describe("User", () => {
  const validUser = () =>
    new User({
      name: "Alice Investor",
      email: "Alice@example.com",
      password: "secret",
    });

  it("creates an investor with the initial credit balance", () => {
    const user = validUser();

    expect(user.role).toBe(UserRole.INVESTOR);
    expect(user.creditBalance).toBe(INVESTOR_INITIAL_CREDITS);
    expect(user.email).toBe("Alice@example.com");
  });

  it("rejects an invalid role", () => {
    expect(
      () =>
        new User({
          name: "Alice",
          email: "alice@example.com",
          password: "secret",
          role: "ADMIN" as UserRole,
        }),
    ).toThrow(DomainValidationError);
  });

  it("rejects negative balances", () => {
    expect(
      () =>
        new User({
          name: "Alice",
          email: "alice@example.com",
          password: "secret",
          creditBalance: -1,
        }),
    ).toThrow(DomainValidationError);
  });

  it("debits and credits the balance according to the balance rules", () => {
    const user = validUser();

    user.debit(250);
    expect(user.creditBalance).toBe(750);
    expect(user.hasSufficientBalance(750)).toBe(true);
    expect(user.hasSufficientBalance(751)).toBe(false);

    user.credit(100);
    expect(user.creditBalance).toBe(850);
  });

  it("rejects insufficient or non-positive balance operations", () => {
    const user = validUser();

    expect(() => user.debit(1001)).toThrow(DomainValidationError);
    expect(() => user.debit(0)).toThrow(DomainValidationError);
    expect(() => user.credit(-1)).toThrow(DomainValidationError);
    expect(() => user.hasSufficientBalance(0)).toThrow(DomainValidationError);
  });
});
