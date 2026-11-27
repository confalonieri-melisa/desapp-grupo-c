import { p2pRequest } from "./p2p-offers.service";
export interface PoolAvailability {
  playerId: string;
  availableQuantity: number;
}
export async function getPoolAvailability(
  token: string,
  playerId: string,
  signal?: AbortSignal,
): Promise<PoolAvailability> {
  const { status, body } = await p2pRequest(
    token,
    `/api/players/${encodeURIComponent(playerId)}/pool-availability`,
    { method: "GET", signal },
  );
  const b = body as PoolAvailability | undefined;
  if (
    status !== 200 ||
    b?.playerId !== playerId ||
    !Number.isSafeInteger(b?.availableQuantity) ||
    b!.availableQuantity < 0
  )
    throw Object.assign(new Error("Disponibilidad no verificable"), { status });
  return b!;
}
