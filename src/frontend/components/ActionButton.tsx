import type { ButtonHTMLAttributes } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import styles from './ActionBtn.module.scss';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    text?: string;
    isLoading?: boolean;
};

export default function ActionButton({
    text = "Iniciar sesión",
    isLoading = false,
    disabled,
    type = "submit",
    ...props
}: ActionButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={styles['action-btn']}
            {...props}
        >
            {isLoading ? (
                <>
                    Procesando... <Loader2 className={styles.spinner} />
                </>
            ) : (
                <>
                    {text} <ArrowRight />
                </>
            )}
        </button>
    );
}
