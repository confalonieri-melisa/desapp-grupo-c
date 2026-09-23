'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthCard from '@/features/auth/components/AuthCard/AuthCard';
import { CardTitleSpan } from '@/components/ui/Card/Card';
import AuthFields from '@/features/auth/components/AuthFields/AuthFields';
import ActionButton from '@/components/ui/ActionButton/ActionButton';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginInput } from '@/schemas/auth.schema';
import { loginApi } from '@/services/client/auth.service';
import { useAuthForm } from '@/hooks/useAuthForm';
import styles from '@/features/auth/components/AuthFields/AuthFields.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const authForm = useAuthForm<LoginInput>({
    initialData: { email: '', password: '' },
    schema: loginSchema,
    submit: async (credentials) => {
      const response = await loginApi(credentials);
      login(response.token, response.user);
      router.push('/');
    },
    getSubmissionError: (error) => (
      error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado al iniciar sesión.'
    ),
  });

  return (
    <AuthCard
      title={<>¡Bienvenida <CardTitleSpan>de vuelta!</CardTitleSpan></>}
      description="Inicia sesión para continuar explorando el mercado de valoración de jugadores."
      error={authForm.error}
      form={(
        <form className={styles.form} onSubmit={authForm.handleSubmit} noValidate>
          <AuthFields<LoginInput>
            fields={[
              {
                id: 'email',
                type: 'email',
                label: 'Correo electrónico',
                value: authForm.formData.email,
                error: authForm.fieldErrors.email,
              },
              {
                id: 'password',
                type: 'password',
                label: 'Contraseña',
                value: authForm.formData.password,
                error: authForm.fieldErrors.password,
              },
            ]}
            disabled={authForm.isLoading}
            onChange={authForm.handleChange}
          />
          <ActionButton text="Iniciar sesión" isLoading={authForm.isLoading} />
        </form>
      )}
      footer={<>¿No tienes cuenta? <Link href="/register">Regístrate</Link></>}
    />
  );
}
