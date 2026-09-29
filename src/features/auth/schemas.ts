import { z } from 'zod';

/** Versão vigente dos Termos de Uso e da Política de Privacidade (registrada no aceite). */
export const TERMS_VERSION = '2026-09';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail.')
  .max(254, 'E-mail muito longo.')
  .pipe(z.email('Confira o e-mail: parece que falta algo.'));

export const passwordSchema = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres.')
  .max(72, 'Use no máximo 72 caracteres.')
  .regex(/[A-Za-zÀ-ÿ]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu nome ou apelido.')
  .max(40, 'Use no máximo 40 caracteres.');

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'O código tem 6 números.');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});

export const signUpSchema = z.object({
  name: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: z.literal(true, { error: 'Para continuar, aceite os termos e a política de privacidade.' }),
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não são iguais.' });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Informe sua senha atual.'),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não são iguais.' })
  .refine((v) => v.password !== v.current, {
    path: ['password'],
    message: 'Escolha uma senha diferente da atual.',
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
