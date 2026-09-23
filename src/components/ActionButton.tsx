import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import styles from './ActionBtn.module.scss';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    text?: string;
    isLoading?: boolean;
    icon?: ReactNode;
};

export default function ActionButton({
    text = "Iniciar sesión",
    isLoading = false,
    icon = <ArrowRight />,
    disabled,
    type = "submit",
    className,
    ...props
}: ActionButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={`${styles['action-btn']} ${className ?? ''}`.trim()}
            {...props}
        >
            {isLoading ? (
                <>
                    Procesando... <Loader2 className={styles.spinner} />
                </>
            ) : (
                <>
                    {text} {icon}
                </>
            )}
        </button>
    );
}
