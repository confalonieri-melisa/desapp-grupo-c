import type {LoginInput, RegisterInput} from '@/schemas/auth.schema';
import type {AuthenticatedUser} from '@/services/auth.service';

export interface AuthResponse {
    token: string;
    user: AuthenticatedUser;
}

export interface ApiErrorResponse {
    message?: string;
    error?: string;
    details?: unknown;
}

function getApiErrorMessage(data: unknown, fallback: string): string {
    if (typeof data !== 'object' || data === null) {
        return fallback;
    }

    const apiError = data as ApiErrorResponse;
    return apiError.message || apiError.error || fallback;
}

async function postAuthRequest<T>(
    endpoint: string,
    input: LoginInput | RegisterInput,
    fallbackError: string,
): Promise<T> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    let data: unknown;
    try {
        data = await response.json();
    } catch {
        data = undefined;
    }

    if (!response.ok) {
        throw new Error(getApiErrorMessage(data, fallbackError));
    }

    return data as T;
}

export function loginApi(credentials: LoginInput): Promise<AuthResponse> {
    return postAuthRequest<AuthResponse>('/api/auth/login', credentials, 'Error al iniciar sesión');
}

export function registerApi(dataInput: RegisterInput): Promise<AuthResponse> {
    return postAuthRequest<AuthResponse>('/api/auth/register', dataInput, 'Error al registrarse');
}
