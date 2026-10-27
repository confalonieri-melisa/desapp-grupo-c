import type { TransactionHistoryResponse } from '@/frontend/features/history/history';

export class HistoryHttpError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'HistoryHttpError';
  }
}

export async function getTransactionHistory(
  session: { userId: string; token: string },
  offset: number,
  signal?: AbortSignal,
): Promise<TransactionHistoryResponse> {
  const query = new URLSearchParams({ limit: '20', offset: String(offset) });
  const response = await fetch(
    `/api/users/${encodeURIComponent(session.userId)}/transactions?${query}`,
    { headers: { Authorization: `Bearer ${session.token}` }, signal },
  );

  if (!response.ok) {
    let message = 'No se pudieron cargar las operaciones';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // Preserve the fallback for a non-JSON response.
    }
    throw new HistoryHttpError(message, response.status);
  }

  return response.json() as Promise<TransactionHistoryResponse>;
}
