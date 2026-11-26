export interface P2POffer {
  id: string;
  sellerId: string;
  playerId: string;
  quantity: number;
  unitPrice: number;
  status: "OPEN";
  createdAt: string;
}
export function isOffer(v: unknown): v is P2POffer {
  if (!v || typeof v !== "object") return false;
  const o = v as P2POffer;
  return (
    [o.id, o.sellerId, o.playerId, o.createdAt].every(
      (x) => typeof x === "string" && x.length > 0,
    ) &&
    o.status === "OPEN" &&
    Number.isInteger(o.quantity) &&
    o.quantity > 0 &&
    Number.isFinite(o.unitPrice) &&
    o.unitPrice > 0
  );
}
export async function p2pRequest(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  const body: unknown =
    response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok)
    throw Object.assign(
      new Error(
        typeof (body as { error?: unknown })?.error === "string"
          ? (body as { error: string }).error
          : "No se pudo completar la solicitud",
      ),
      { status: response.status },
    );
  return { status: response.status, body };
}
export async function getP2POffers(
  token: string,
  playerId: string,
  signal?: AbortSignal,
): Promise<P2POffer[]> {
  const { status, body } = await p2pRequest(
    token,
    `/api/p2p/offers?playerId=${encodeURIComponent(playerId)}`,
    { method: "GET", signal },
  );
  if (
    status !== 200 ||
    !Array.isArray(body) ||
    !body.every((o) => isOffer(o) && o.playerId === playerId)
  )
    throw Object.assign(new Error("Respuesta de ofertas inv?lida"), { status });
  return body;
}

export interface P2PReceipt {
  operation: {
    id: string;
    buyerId: string;
    sellerId: string;
    offerId: string;
    playerId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    createdAt: string;
  };
  account: { creditBalance: number };
  holding: { quantity: number; averagePurchasePrice: number };
}
export async function acceptP2POffer(token: string, id: string, key: string): Promise<P2PReceipt> {
  const { status, body } = await p2pRequest(
    token,
    `/api/p2p/offers/${encodeURIComponent(id)}/accept`,
    { method: "POST", headers: { "Idempotency-Key": key } },
  );
  const r = body as P2PReceipt | undefined;
  const o = r?.operation;
  if (
    status !== 201 ||
    !o ||
    o.offerId !== id ||
    ![o.id, o.buyerId, o.sellerId, o.playerId, o.createdAt].every(
      (x) => typeof x === "string" && x.length > 0,
    ) ||
    ![
      o.quantity,
      o.unitPrice,
      o.total,
      r?.account?.creditBalance,
      r?.holding?.quantity,
      r?.holding?.averagePurchasePrice,
    ].every(Number.isFinite)
  )
    throw Object.assign(new Error("Comprobante no verificable"), { status });
  return r!;
}

export async function publishP2POffer(
  token: string,
  input: { playerId: string; quantity: number; unitPrice: number },
): Promise<P2POffer> {
  const { status, body } = await p2pRequest(token, "/api/p2p/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: input.playerId,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    }),
  });
  if (status !== 201 || !isOffer(body) || body.playerId !== input.playerId)
    throw Object.assign(new Error("Publicaci?n no verificable"), { status });
  return body;
}

export async function cancelP2POffer(token: string, id: string): Promise<void> {
  const { status } = await p2pRequest(token, `/api/p2p/offers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (status !== 204) throw Object.assign(new Error("Cancelacion no verificable"), { status });
}
