import { z } from "zod";

/**
 * Payload do formulário da página `/contato`.
 * Destino do e-mail: `company.contact.formEmail` (adm@…).
 */
export const contactFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  assunto: z.string().trim().min(2, "Informe o assunto").max(160),
  mensagem: z.string().trim().min(10, "Mensagem muito curta").max(4000),
  /** Honeypot — humanos deixam vazio; preenchido = bot (tratado na rota). */
  website: z.string().max(200).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export type ContactMessageRecord = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  assunto: string;
  mensagem: string;
  createdAt: string;
  ipHash: string;
  emailSent: boolean;
};
