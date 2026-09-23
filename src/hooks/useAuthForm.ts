import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { ZodType } from 'zod';
import { getFieldErrors } from '@/utils/form-errors';

type SubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];

interface UseAuthFormOptions<T extends object> {
  initialData: T;
  schema: ZodType<T>;
  submit: (data: T) => Promise<void>;
  getSubmissionError?: (error: unknown) => string;
}

export function useAuthForm<T extends object>({
  initialData,
  schema,
  submit,
  getSubmissionError = (error) => (
    error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
  ),
}: UseAuthFormOptions<T>) {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof T, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submitForm = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const validation = schema.safeParse(formData);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      return;
    }

    setIsLoading(true);
    try {
      await submit(validation.data);
    } catch (submissionError) {
      setError(getSubmissionError(submissionError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    void submitForm(event);
  };

  return {
    formData,
    error,
    fieldErrors,
    isLoading,
    handleChange,
    handleSubmit,
  };
}
