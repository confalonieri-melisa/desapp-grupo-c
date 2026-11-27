import type { P2POffer } from "@/frontend/services/client/p2p-offers.service";
export const offerTotal = (o: Pick<P2POffer, "quantity" | "unitPrice">) =>
  Math.round(o.quantity * Math.round(o.unitPrice * 100)) / 100;
export const sellerLabel = (o: P2POffer) => `Vendedor ${o.sellerId.slice(0, 8)}...`;
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
    error: e.message ?? "Resultado incierto. Actualizá los datos antes de decidir otro intento.",
  };
}

export function validatePublish(quantityText: string, priceText: string, holding: number | null) {
  const quantity = Number(quantityText),
    unitPrice = Number(priceText);
  let quantityError: string | null = null,
    priceError: string | null = null;
  if (
    !/^\d+$/.test(quantityText) ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > 2147483647
  )
    quantityError = "Ingresá una cantidad entera positiva hasta 2.147.483.647";
  else if (holding === null || quantity > holding)
    quantityError = "Tenencia no disponible o insuficiente";
  if (
    !/^\d+(\.\d{1,2})?$/.test(priceText) ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    unitPrice > 99999999.99
  )
    priceError = "Ingresá un precio positivo de hasta dos decimales y 99.999.999,99";
  const total = offerTotal({ quantity, unitPrice });
  if (!quantityError && !priceError && total > 9999999999.99)
    priceError = "El total supera 9.999.999.999,99";
  return {
    quantity,
    unitPrice,
    total,
    quantityError,
    priceError,
    error: quantityError ?? priceError,
  };
}

export const formatP2PCredits = (value: number) =>
  `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} cr\u00e9ditos`;
