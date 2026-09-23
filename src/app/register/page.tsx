'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthCard, { CardTitleSpan } from '@/components/AuthCard';
import AuthFields from '@/components/AuthFields';
import ActionButton from '@/components/ActionButton';
import { registerSchema, type RegisterInput } from '@/schemas/auth.schema';
import { registerApi } from '@/services/client/auth.service';
import { useAuthForm } from '@/hooks/useAuthForm';
import styles from '@/components/AuthFields.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const authForm = useAuthForm<RegisterInput>({
    initialData: { name: '', email: '', password: '' },
    schema: registerSchema,
    submit: async (data) => {
      await registerApi(data);
      setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...');
    },
    getSubmissionError: (error) => {
      const message = error instanceof Error ? error.message : '';
      return message.includes('already registered')
        ? 'El correo electrónico ya se encuentra registrado.'
        : message || 'Ocurrió un error inesperado al registrarse.';
    },
  });

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => router.push('/login'), 1500);
    return () => window.clearTimeout(timeout);
  }, [router, successMessage]);

  return (
    <AuthCard
      title={<>¡Crea tu <CardTitleSpan>cuenta!</CardTitleSpan></>}
      description="Regístrate para comenzar a explorar el mercado de valoración de jugadores."
      error={authForm.error}
      successMessage={successMessage}
      form={(
        <form className={styles.form} onSubmit={authForm.handleSubmit} noValidate>
          <div className={styles.fields}>
            <AuthFields<RegisterInput>
              fields={[
                {
                  id: 'name',
                  label: 'Nombre completo',
                  value: authForm.formData.name,
                  error: authForm.fieldErrors.name,
                },
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
          </div>
          <ActionButton text="Registrarse" isLoading={authForm.isLoading} />
        </form>
      )}
      footer={<>¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></>}
    />
  );
}
