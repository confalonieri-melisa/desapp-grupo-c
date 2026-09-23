import type {LoginInput, RegisterInput} from "@/schemas/auth.schema";
import type {AuthenticatedSession} from "@/services/auth.service";
import {AuthService} from "@/services/auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    return this.authService.register(input);
  }

  async login(input: LoginInput): Promise<AuthenticatedSession> {
    return this.authService.login(input);
  }
}
