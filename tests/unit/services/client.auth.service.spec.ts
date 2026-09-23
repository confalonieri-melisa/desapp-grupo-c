import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginApi, registerApi } from '@/services/client/auth.service';

describe('client auth service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts login credentials and returns the authentication response', async () => {
    const response = {
      token: 'token',
      user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', role: 'INVESTOR', creditBalance: 1000 },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    await expect(loginApi({ email: 'alice@example.com', password: 'secret' })).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'secret' }),
    });
  });

  it('uses the API error message when login fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 }),
    );

    await expect(loginApi({ email: 'alice@example.com', password: 'wrong' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('uses the fallback error when registration returns invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not-json', { status: 500 }),
    );

    await expect(registerApi({ name: 'Alice', email: 'alice@example.com', password: 'secret' }))
      .rejects.toThrow('Error al registrarse');
  });
});
