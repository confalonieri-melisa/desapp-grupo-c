import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().pipe(z.string().email("Ingresa un correo electrónico válido")),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.string().email("Ingresa un correo electrónico válido")),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
