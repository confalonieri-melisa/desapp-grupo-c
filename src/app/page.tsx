'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import ActionButton from '@/components/ActionButton';
import Card, {CardTitle, CardTitleSpan} from '@/components/Card';
import PageContainer from '@/components/PageContainer';

export default function Home() {
    const router = useRouter();
    const {user, isAuthenticated, isHydrated, logout} = useAuth();

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated || !isAuthenticated || !user) {
        return null;
    }

    return (
        <PageContainer>
            <Card>

                <CardTitle>
                    ¡Bienvenida, <CardTitleSpan>{user.name}</CardTitleSpan>!
                </CardTitle>
                <ActionButton
                    text="Cerrar sesión"
                    type="button"
                    onClick={() => {
                        logout();
                        router.replace('/login');
                    }}
                />
            </Card>
        </PageContainer>
    );
}
