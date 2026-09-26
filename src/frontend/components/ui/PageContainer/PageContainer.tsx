import type { ComponentProps, ReactNode } from 'react';
import styles from './PageContainer.module.scss';

type PageContainerProps = ComponentProps<'main'> & {
  children: ReactNode;
};

export default function PageContainer({
  children,
  className = '',
  ...props
}: PageContainerProps) {
  return (
    <main className={`${styles.container} ${className}`.trim()} {...props}>
      {children}
    </main>
  );
}
