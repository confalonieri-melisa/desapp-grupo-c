import { z } from "zod";

/** HTTP input for a holding read/import boundary. */
export const tokenHoldingSchema = z.object({
  userId: z.uuid(),
  playerId: z.uuid(),
  quantity: z.number().int().nonnegative().default(0),
  averagePurchasePrice: z.number().nonnegative().default(1),
});

export type TokenHoldingDto = z.infer<typeof tokenHoldingSchema>;
