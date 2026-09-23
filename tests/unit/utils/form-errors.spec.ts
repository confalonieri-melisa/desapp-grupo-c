import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loginSchema } from '@/schemas/auth.schema';
import { getFieldErrors } from '@/utils/form-errors';

describe('getFieldErrors', () => {
  it('maps the first issue for each named field', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: '' });

    if (result.success) {
      throw new Error('Expected invalid login input');
    }

    expect(getFieldErrors(result.error)).toEqual({
      email: 'Ingresa un correo electrónico válido',
      password: 'La contraseña es obligatoria',
    });
  });

  it('ignores issues without a string field path', () => {
    const schema = z.object({}).superRefine((_, context) => {
      context.addIssue({ code: 'custom', message: 'Form is invalid' });
    });
    const error = schema.safeParse({});

    if (error.success) {
      throw new Error('Expected invalid form input');
    }

    expect(getFieldErrors(error.error)).toEqual({});
  });
});
