'use client';

import Link from 'next/link';
import {LogOut} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import ActionButton from '@/components/ui/ActionButton/ActionButton';
import styles from './CatalogNav.module.scss';

export default function CatalogNav() {
    const router = useRouter();
    const {logout} = useAuth();

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    return (
        <nav className={styles.nav} aria-label="Navegación principal">
            <Link className={styles.brand} href="/players">
                Medio Campo
            </Link>
            <Link className={styles.activeLink} href="/players" aria-current="page">
                Jugadores
            </Link>
            <ActionButton
                className={styles.logoutButton}
                text="Cerrar sesión"
                type="button"
                icon={<LogOut aria-hidden="true" size={18}/>}
                onClick={handleLogout}
            />
        </nav>
    );
}
