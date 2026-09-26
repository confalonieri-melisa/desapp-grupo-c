import { UnauthorizedError } from "@/backend/errors/http.error";
import { verifyToken, type AuthTokenPayload } from "@/backend/utils/jwt";

export function requireAuth(request: Request): AuthTokenPayload {
  try {
    const token =
        request.headers
            .get("authorization")
            ?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";

    return verifyToken(token);
  } catch {
    throw new UnauthorizedError();
  }
}
