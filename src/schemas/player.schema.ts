import { z } from "zod";
import { League, Position } from "@/models/enums";

/** HTTP input for creating or importing a player. */
export const playerSchema = z.object({
  name: z.string().trim().min(1),
  team: z.string().trim().min(1),
  league: z.enum(League),
  position: z.enum(Position),
  statistics: z
    .record(z.string().trim().min(1), z.number().nonnegative())
    .default({}),
});

export type PlayerDto = z.infer<typeof playerSchema>;
