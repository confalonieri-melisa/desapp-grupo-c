import { ReactNode, ComponentProps } from "react";
import styles from "./Card.module.scss";

type CardProps = ComponentProps<"form"> & {
  children: ReactNode;
};

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={styles.bg}>
      <form className={`${styles.card} ${className}`} {...props}>
        {children}
      </form>
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h1 className={styles['card-title']}>{children}</h1>;
}

export function CardTitleSpan({ children }: { children: ReactNode }) {
  return <span className={styles['card-title-span']}>{children}</span>;
}

export function CardText({ children }: { children: ReactNode }) {
  return <p className={styles['card-text']}>{children}</p>;
}

export function CardInputs({ children }: { children: ReactNode }) {
  return <div className={styles['card-inputs']}>{children}</div>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <p className={styles['card-footer']}>{children}</p>;
}
