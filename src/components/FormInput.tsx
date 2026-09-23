import type { InputHTMLAttributes } from 'react';
import styles from './FormInput.module.scss';

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
};

export default function FormInput({ type = 'text', label, error, ...props }: FormInputProps) {
    return (
        <div className={styles.container}>
            <div className={`${styles['input-wrapper']} ${error ? styles['has-error'] : ''}`}>
                <input type={type} placeholder=" " {...props} />
                <label className={styles.placeholder}>
                    {label}
                </label>
            </div>
            {error && (
                <span className={styles['error-text']}>
                    {error}
                </span>
            )}
        </div>
    );
}
