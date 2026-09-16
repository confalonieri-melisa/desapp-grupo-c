import { z } from "zod";

/** HTTP input for user registration. Domain rules remain in User. */
export const userRegistrationSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});

export type UserRegistrationDto = z.infer<typeof userRegistrationSchema>;
