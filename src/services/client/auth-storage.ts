import type { AuthenticatedUser } from '@/services/auth.service';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface StoredAuth {
  token: string;
  user: AuthenticatedUser;
}

export function getStoredAuth(): StoredAuth | null {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedToken || !storedUser) {
    return null;
  }

  try {
    return {
      token: storedToken,
      user: JSON.parse(storedUser) as AuthenticatedUser,
    };
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function saveStoredAuth(token: string, user: AuthenticatedUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
