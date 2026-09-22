import type { LoginInput, RegisterInput } from "@/schemas/auth.schema";
import { AuthService } from "@/services/auth.service";
import type { AuthenticatedUser } from "@/services/auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    return this.authService.register(input);
  }

  async login(input: LoginInput): Promise<{ token: string; user: AuthenticatedUser }> {
    return this.authService.login(input);
  }
}
