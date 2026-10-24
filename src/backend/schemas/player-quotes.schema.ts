import { z } from "zod";

export const playerQuotesParamsSchema = z.object({
  id: z.uuid(),
});

const calendarDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  }, "Date must be a valid calendar date");

export const playerQuotesQuerySchema = z.object({
  date: calendarDateSchema.optional(),
});
