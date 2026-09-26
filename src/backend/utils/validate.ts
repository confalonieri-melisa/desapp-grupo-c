import { type ZodType } from "zod";

export function validate<T>(schema: ZodType<T>, input: unknown): T {
  return schema.parse(input);
}
