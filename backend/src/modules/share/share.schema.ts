import { z } from 'zod';

export const generateShareLinkSchema = z.object({
  studentId: z.string().uuid('ID do aluno inválido'),
  expiresInDays: z.number().int().min(1).max(365).default(30),
});

export const tokenParamSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
});

export type GenerateShareLinkInput = z.infer<typeof generateShareLinkSchema>;
export type TokenParam = z.infer<typeof tokenParamSchema>;
