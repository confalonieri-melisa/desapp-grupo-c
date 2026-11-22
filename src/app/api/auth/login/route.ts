import { AuthController } from "@/backend/controllers/auth.controller";
import { UserRepository } from "@/backend/repositories/user.repository";
import { loginSchema } from "@/backend/schemas/auth.schema";
import { AuthService } from "@/backend/services/auth.service";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { validate } from "@/backend/utils/validate";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new AuthController(new AuthService(new UserRepository()));

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/auth/login", async () => {
    try {
      const input = validate(loginSchema, await request.json());
      return Response.json(await controller.login(input));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
