import type { ReactNode } from 'react';
import Card, { CardFooter, CardHeader, CardText, CardTitle } from '@/components/ui/Card/Card';
import PageContainer from '@/components/ui/PageContainer/PageContainer';
import styles from './AuthCard.module.scss';

interface AuthCardProps {
  title: ReactNode;
  description: string;
  form: ReactNode;
  footer: ReactNode;
  error?: string | null;
  successMessage?: string | null;
}

export default function AuthCard({
  title,
  description,
  form,
  footer,
  error,
  successMessage,
}: AuthCardProps) {
  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardText>{description}</CardText>
        </CardHeader>

        {error && <div className={styles.alert} role="alert">{error}</div>}
        {successMessage && <div className={styles.successAlert} role="status">{successMessage}</div>}
        {form}
        <CardFooter>{footer}</CardFooter>
      </Card>
    </PageContainer>
  );
}
