import { User } from "@/models/User";
import { UserRole } from "@/models/enums";
import type { UserRepository } from "@/repositories/user.repository";
import {
  ConflictError,
  UnauthorizedError,
} from "@/errors/http.error";
import type { LoginInput, RegisterInput } from "@/schemas/auth.schema";
import { verifyPassword } from "@/utils/password";
import { issueToken } from "@/utils/jwt";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  creditBalance: number;
}

export interface AuthenticatedSession {
  token: string;
  user: AuthenticatedUser;
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError("User email is already registered");
    }

    const user = await this.userRepository.save(
      new User({
        name: input.name,
        email: input.email,
        password: input.password,
        role: UserRole.INVESTOR,
      }),
    );

    return createAuthenticatedSession(user);
  }

  async login(input: LoginInput): Promise<AuthenticatedSession> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.password)) {
      throw new UnauthorizedError("Invalid credentials");
    }

    return createAuthenticatedSession(user);
  }
}

function createAuthenticatedSession(user: User): AuthenticatedSession {
  return {
    token: issueToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
    user: toAuthenticatedUser(user),
  };
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    creditBalance: user.creditBalance,
  };
}
