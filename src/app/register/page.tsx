'use client';

import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card, { CardFooter, CardHeader, CardText, CardTitle, CardTitleSpan } from '@/components/Card';
import FormInput from '@/components/FormInput';
import ActionButton from '@/components/ActionButton';
import PageContainer from '@/components/PageContainer';
import { registerSchema, type RegisterInput } from '@/schemas/auth.schema';
import { registerApi } from '@/services/client/auth.service';
import styles from '@/components/AuthFields.module.scss';
import { getFieldErrors } from '@/utils/form-errors';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterInput>({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => router.push('/login'), 1500);
    return () => window.clearTimeout(timeout);
  }, [router, successMessage]);

  const handleChange = (field: keyof RegisterInput, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submitForm = async (event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      return;
    }

    setIsLoading(true);
    try {
      await registerApi(validation.data);
      setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...');
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : '';
      setError(message.includes('already registered')
        ? 'El correo electrónico ya se encuentra registrado.'
        : message || 'Ocurrió un error inesperado al registrarse.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    void submitForm(event);
  };

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle>
            ¡Crea tu <CardTitleSpan>cuenta!</CardTitleSpan>
          </CardTitle>
          <CardText>
            Regístrate para comenzar a explorar el mercado de valoración de jugadores.
          </CardText>
        </CardHeader>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.alert} role="alert">{error}</div>}
          {successMessage && <div className={styles.successAlert} role="status">{successMessage}</div>}

          <div className={styles.fields}>
            <FormInput
              id="name"
              name="name"
              label="Nombre completo"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              error={fieldErrors.name}
              disabled={isLoading}
              required
            />
            <FormInput
              id="email"
              name="email"
              type="email"
              label="Correo electrónico"
              value={formData.email}
              onChange={(event) => handleChange('email', event.target.value)}
              error={fieldErrors.email}
              disabled={isLoading}
              required
            />
            <FormInput
              id="password"
              name="password"
              type="password"
              label="Contraseña"
              value={formData.password}
              onChange={(event) => handleChange('password', event.target.value)}
              error={fieldErrors.password}
              disabled={isLoading}
              required
            />
          </div>

          <ActionButton text="Registrarse" isLoading={isLoading} />
        </form>

        <CardFooter>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </CardFooter>
      </Card>
    </PageContainer>
  );
}
