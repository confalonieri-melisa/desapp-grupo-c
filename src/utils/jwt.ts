import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "@/config/env";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
}

const TOKEN_EXPIRATION = "24h";

export function issueToken(payload: Omit<AuthTokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

export function verifyToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("Invalid authentication token");
  }

  return payload as AuthTokenPayload;
}
