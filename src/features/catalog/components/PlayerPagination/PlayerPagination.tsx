import styles from "./PlayerPagination.module.scss";
import {ChevronLeft, ChevronRight} from "lucide-react";

interface PlayerPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function PlayerPagination({
                                             page,
                                             totalPages,
                                             onPageChange,
                                         }: PlayerPaginationProps) {
    return (
        <nav className={styles.pagination} aria-label="Paginación de jugadores">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
            >
                <ChevronLeft/>
            </button>
            <span>Página {page} de {totalPages}</span>
            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
            >
                <ChevronRight/>
            </button>
        </nav>
    );
}
