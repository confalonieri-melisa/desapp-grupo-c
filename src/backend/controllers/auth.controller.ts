import type {LoginInput, RegisterInput} from "@/backend/schemas/auth.schema";
import type {AuthenticatedSession} from "@/backend/services/auth.service";
import {AuthService} from "@/backend/services/auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    return this.authService.register(input);
  }

  async login(input: LoginInput): Promise<AuthenticatedSession> {
    return this.authService.login(input);
  }
}
