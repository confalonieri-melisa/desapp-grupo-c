import type { ZodError } from 'zod';

export function getFieldErrors<T extends object>(
  error: ZodError<T>,
): Partial<Record<keyof T, string>> {
  return error.issues.reduce<Partial<Record<keyof T, string>>>((errors, issue) => {
    const field = issue.path[0];

    if (typeof field === 'string' && !errors[field as keyof T]) {
      errors[field as keyof T] = issue.message;
    }

    return errors;
  }, {});
}
