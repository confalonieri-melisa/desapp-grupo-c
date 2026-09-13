import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "@/config/env";

export interface UserJwtPayload {
  userId: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

const DEFAULT_EXPIRES_IN = "24h";

/**
 * Generates a signed JWT token for a user with a default 24-hour expiration.
 * @param payload Object containing user claims (userId, email, role, etc.)
 * @param expiresIn Token expiration duration (default: "24h")
 * @returns Signed JWT string
 */
export function generateToken(
  payload: UserJwtPayload,
  expiresIn: SignOptions["expiresIn"] = DEFAULT_EXPIRES_IN
): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

/**
 * Verifies and decodes a JWT token using the configured secret.
 * @param token JWT string to verify
 * @returns Decoded payload if valid, throws error if invalid or expired
 */
export function verifyToken(token: string): UserJwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  return decoded as UserJwtPayload;
}
