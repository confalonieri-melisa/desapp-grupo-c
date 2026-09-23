import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { useStateMock } = vi.hoisted(() => ({
  useStateMock: vi.fn(),
}));

vi.mock('react', () => ({
  useState: useStateMock,
}));

import { useAuthForm } from '@/hooks/useAuthForm';

type FormData = {
  email: string;
  password: string;
};

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

function useTestHook(initialData: FormData, submit: (data: FormData) => Promise<void>) {
  const state = [initialData, null, {}, false] as [
    FormData,
    string | null,
    Partial<Record<keyof FormData, string>>,
    boolean,
  ];

  useStateMock
    .mockImplementationOnce(() => [state[0], (value: FormData | ((current: FormData) => FormData)) => {
      state[0] = typeof value === 'function' ? value(state[0]) : value;
    }])
    .mockImplementationOnce(() => [state[1], (value: string | null) => { state[1] = value; }])
    .mockImplementationOnce(() => [state[2], (
      value: Partial<Record<keyof FormData, string>>
        | ((current: Partial<Record<keyof FormData, string>>) => Partial<Record<keyof FormData, string>>),
    ) => {
      state[2] = typeof value === 'function' ? value(state[2]) : value;
    }])
    .mockImplementationOnce(() => [state[3], (value: boolean) => { state[3] = value; }]);

  return { hook: useAuthForm({ initialData, schema, submit }), state };
}

describe('useAuthForm', () => {
  beforeEach(() => {
    useStateMock.mockReset();
  });

  it('updates a field and clears its previous error', () => {
    const { hook, state } = useTestHook(
      { email: 'old@example.com', password: 'secret' },
      vi.fn(async () => undefined),
    );
    state[1] = 'Previous error';
    state[2] = { email: 'Invalid email' };

    hook.handleChange('email', 'new@example.com');

    expect(state[0]).toEqual({ email: 'new@example.com', password: 'secret' });
    expect(state[1]).toBeNull();
    expect(state[2]).toEqual({ email: undefined });
  });

  it('does not submit invalid data and stores field errors', async () => {
    const submit = vi.fn(async () => undefined);
    const { hook, state } = useTestHook({ email: 'invalid', password: '' }, submit);
    const preventDefault = vi.fn();

    hook.handleSubmit({ preventDefault } as never);
    await Promise.resolve();

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    expect(state[2]).toEqual({
      email: 'Invalid email',
      password: 'Password is required',
    });
  });

  it('submits valid data and clears loading when it succeeds', async () => {
    const submit = vi.fn(async () => undefined);
    const { hook, state } = useTestHook(
      { email: 'alice@example.com', password: 'secret' },
      submit,
    );

    hook.handleSubmit({ preventDefault: vi.fn() } as never);
    await Promise.resolve();
    await Promise.resolve();

    expect(submit).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'secret' });
    expect(state[3]).toBe(false);
  });

  it('maps submission errors and clears loading', async () => {
    const submit = vi.fn(async () => {
      throw new Error('Request failed');
    });
    const { hook, state } = useTestHook(
      { email: 'alice@example.com', password: 'secret' },
      submit,
    );

    hook.handleSubmit({ preventDefault: vi.fn() } as never);
    await Promise.resolve();
    await Promise.resolve();

    expect(state[1]).toBe('Request failed');
    expect(state[3]).toBe(false);
  });

  it('uses the fallback message for non-Error failures', async () => {
    const submit = vi.fn(async () => {
      throw 'failure';
    });
    const { hook, state } = useTestHook(
      { email: 'alice@example.com', password: 'secret' },
      submit,
    );

    hook.handleSubmit({ preventDefault: vi.fn() } as never);
    await Promise.resolve();
    await Promise.resolve();

    expect(state[1]).toBe('Ocurrió un error inesperado.');
  });
});
