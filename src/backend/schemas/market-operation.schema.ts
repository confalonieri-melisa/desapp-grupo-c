import { z } from "zod";

export const marketOperationRequestSchema = z.object({
  playerId: z.uuid(),
  quantity: z.number().int().positive(),
}).strict();

export type MarketOperationRequest = z.infer<typeof marketOperationRequestSchema>;
