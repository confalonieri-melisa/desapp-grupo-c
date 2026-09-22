import { UnauthorizedError } from "@/errors/http.error";
import { verifyToken, type AuthTokenPayload } from "@/utils/jwt";

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
