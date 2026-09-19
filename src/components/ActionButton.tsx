import { ArrowRight } from "lucide-react";
import styles from './ActionBtn.module.scss';

type ActionButtonProps = {
    text?: string;
};

export default function ActionButton({ text = "Iniciar sesión" }: ActionButtonProps) {
    return (
        <button type="submit" className={styles['action-btn']}>
            {text} <ArrowRight />
        </button>
    );
}
