import { z } from "zod";

export const marketOperationRequestSchema = z.object({
  playerId: z.uuid(),
  quantity: z.number().int().positive(),
}).strict();

export type MarketOperationRequest = z.infer<typeof marketOperationRequestSchema>;

export const marketOperationHistoryParamsSchema = z.object({
  id: z.uuid(),
});

export const marketOperationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

export type MarketOperationHistoryQuery = z.infer<typeof marketOperationHistoryQuerySchema>;
