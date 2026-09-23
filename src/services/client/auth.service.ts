import type {LoginInput, RegisterInput} from '@/schemas/auth.schema';
import type {AuthenticatedUser} from '@/services/auth.service';

export interface AuthResponse {
    token: string;
    user: AuthenticatedUser;
}

export interface RegisterResponse {
    user: AuthenticatedUser;
}

export interface ApiErrorResponse {
    message?: string;
    error?: string;
    details?: unknown;
}

export async function loginApi(credentials: LoginInput): Promise<AuthResponse> {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = (data as ApiErrorResponse).message || (data as ApiErrorResponse).error || 'Error al iniciar sesión';
        throw new Error(errorMsg);
    }

    return data as AuthResponse;
}

export async function registerApi(dataInput: RegisterInput): Promise<RegisterResponse> {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataInput),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = (data as ApiErrorResponse).message || (data as ApiErrorResponse).error || 'Error al registrarse';
        throw new Error(errorMsg);
    }

    return data as RegisterResponse;
}
