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
