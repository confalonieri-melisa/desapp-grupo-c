import type { P2POffer } from "@/frontend/services/client/p2p-offers.service";
export const offerTotal = (o: Pick<P2POffer, "quantity" | "unitPrice">) =>
  Math.round(o.quantity * Math.round(o.unitPrice * 100)) / 100;
export const sellerLabel = (o: P2POffer) => `Vendedor ${o.sellerId.slice(0, 8)}?`;
export const canAccept = (o: P2POffer, userId: string, balance: number | null, current: boolean) =>
  current &&
  o.sellerId !== userId &&
  balance !== null &&
  Number.isFinite(balance) &&
  offerTotal(o) <= balance;
export function classifyP2PError(error: unknown) {
  const e = error as { status?: number; message?: string };
  return {
    status:
      e.status && e.status >= 400 && e.status < 500
        ? ("rejected" as const)
        : ("uncertain" as const),
    error: e.message ?? "Resultado incierto. Actualiz? los datos antes de decidir otro intento.",
  };
}
