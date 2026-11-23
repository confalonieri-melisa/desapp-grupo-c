import { z } from "zod";
import { P2POffer } from "@/backend/models/P2POffer";

export const createP2POfferSchema = z
  .object({
    playerId: z.uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z
      .number()
      .positive()
      .refine(P2POffer.isValidUnitPrice, "unitPrice must have at most two decimals"),
  })
  .strict();

export const p2pOfferIdSchema = z.object({ id: z.uuid() });

export const p2pOfferQuerySchema = z.object({
  playerId: z.uuid().optional(),
});

export type CreateP2POfferRequest = z.infer<typeof createP2POfferSchema>;
export type P2POfferQuery = z.infer<typeof p2pOfferQuerySchema>;
