'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card, { CardFooter, CardHeader, CardText, CardTitle, CardTitleSpan } from '@/components/Card';
import FormInput from '@/components/FormInput';
import ActionButton from '@/components/ActionButton';
import PageContainer from '@/components/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginInput } from '@/schemas/auth.schema';
import { loginApi } from '@/services/client/auth.service';
import styles from '@/components/AuthFields.module.scss';
import { getFieldErrors } from '@/utils/form-errors';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginInput>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof LoginInput, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setError(null);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submitForm = async (event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]): Promise<void> => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginApi(validation.data);
      login(response.token, response.user);
      router.push('/');
    } catch (submissionError) {
      setError(submissionError instanceof Error
        ? submissionError.message
        : 'Ocurrió un error inesperado al iniciar sesión.');
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
            ¡Bienvenida <CardTitleSpan>de vuelta!</CardTitleSpan>
          </CardTitle>
          <CardText>
            Inicia sesión para continuar explorando el mercado de valoración de jugadores.
          </CardText>
        </CardHeader>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.alert} role="alert">{error}</div>}

          <div className={styles.fields}>
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

          <ActionButton text="Iniciar sesión" isLoading={isLoading} />
        </form>

        <CardFooter>
          ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
        </CardFooter>
      </Card>
    </PageContainer>
  );
}
