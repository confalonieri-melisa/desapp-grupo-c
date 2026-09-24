import type { InputHTMLAttributes } from 'react';
import styles from './FormInput.module.scss';

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
};

export default function FormInput({ id, type = 'text', label, error, ...props }: FormInputProps) {
    const errorId = error && id ? `${id}-error` : undefined;

    return (
        <div className={styles.container}>
            <div className={`${styles['input-wrapper']} ${error ? styles['has-error'] : ''}`}>
                <input
                    id={id}
                    type={type}
                    placeholder=" "
                    aria-invalid={Boolean(error)}
                    aria-describedby={errorId}
                    {...props}
                />
                <label className={styles.placeholder} htmlFor={id}>{label}</label>
            </div>
            {error && <span id={errorId} className={styles['error-text']}>{error}</span>}
        </div>
    );
}
