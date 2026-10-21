import { ForbiddenError, UnauthorizedError } from "@/backend/errors/http.error";
import { UserRole } from "@/backend/models/enums";
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

export function requireSuperuser(request: Request): AuthTokenPayload {
  const auth = requireAuth(request);
  if (auth.role !== UserRole.SUPERUSER) throw new ForbiddenError();
  return auth;
}
