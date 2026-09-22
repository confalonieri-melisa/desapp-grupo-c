import { AuthController } from "@/controllers/auth.controller";
import { UserRepository } from "@/repositories/user.repository";
import { loginSchema } from "@/schemas/auth.schema";
import { AuthService } from "@/services/auth.service";
import { toHttpResponse } from "@/errors/to-http-response";
import { validate } from "@/utils/validate";

const controller = new AuthController(new AuthService(new UserRepository()));

export async function POST(request: Request): Promise<Response> {
  try {
    const input = validate(loginSchema, await request.json());
    return Response.json(await controller.login(input));
  } catch (error) {
    return toHttpResponse(error);
  }
}
