import styles from './FormInput.module.scss';

type FormInputProps = { type: string; label: string };

export default function FormInput({ type, label }: FormInputProps) {
    return (
        <div className={styles['input-wrapper']}>
            <input type={type} required />
            <label className={styles.placeholder}>
                {label}
            </label>
        </div>
    );
}
