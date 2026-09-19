import {ArrowRight} from "lucide-react";
import styles from './ActionBtn.module.scss';

export default function ActionButton() {
    return <button type="submit" className={styles['action-btn']}>Iniciar sesión <ArrowRight/></button>
}