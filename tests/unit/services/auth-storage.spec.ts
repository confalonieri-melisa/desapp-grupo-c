import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '@/models/enums';
import {
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
} from '@/services/client/auth-storage';

const storedUser = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  role: UserRole.INVESTOR,
  creditBalance: 1000,
};

function createLocalStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

describe('auth storage', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock();
  });

  it('returns the stored authentication data', () => {
    saveStoredAuth('token', storedUser);

    expect(getStoredAuth()).toEqual({
      token: 'token',
      user: storedUser,
    });
  });

  it('returns null when stored authentication data is incomplete', () => {
    localStorage.setItem('auth_token', 'token');
    expect(getStoredAuth()).toBeNull();

    localStorage.removeItem('auth_token');
    localStorage.setItem('auth_user', JSON.stringify(storedUser));
    expect(getStoredAuth()).toBeNull();
  });

  it('clears invalid stored user data', () => {
    localStorage.setItem('auth_token', 'token');
    localStorage.setItem('auth_user', '{invalid-json');

    expect(getStoredAuth()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('saves and clears authentication data', () => {
    saveStoredAuth('token', storedUser);
    expect(localStorage.getItem('auth_token')).toBe('token');
    expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(storedUser));

    clearStoredAuth();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
