'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ActionButton from '@/components/ActionButton';
import Card, { CardTitle, CardTitleSpan } from '@/components/Card';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Card>
        <CardTitle>
          ¡Bienvenida, <CardTitleSpan>{user.name}</CardTitleSpan>!
        </CardTitle>

      <ActionButton
        text="Cerrar sesión"
        type="button"
        onClick={() => {
          logout();
          router.push('/login');
        }}
      />
    </Card>
  );
}
