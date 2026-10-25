import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { appEnvironment, env, firebaseBackupEnabled } from "@/lib/env";
import { getLeadBackupDatabase } from "@/lib/leads/firebase-admin";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/store.ts — persistência de leads (Issue 12).
 * Fonte: ESPECIFICACAO v3.md, seção 51 ("DB = verdade"; "backup de
 * leads") e seção 44.2 (deduplicação por `hash(telefone_e164 + ramo)`
 * em janela 24h) e 44.3 ("nunca perder lead").
 *
 * `DATABASE_URL` (seção 45) está marcada `A_CONFIRMAR — BLOQUEANTE` no
 * `.env.example` (destino/infra de banco ainda não provisionado/decidido
 * — nenhuma credencial real existe para conectar a um Postgres real
 * nesta sessão). Em vez de inventar uma conexão real ou travar a issue
 * até isso ser resolvido, o armazenamento é feito por uma interface
 * (`LeadStore`) com uma implementação padrão em arquivo local
 * (`.data/leads.json`, git-ignored) — funcional para desenvolvimento e
 * suficiente para satisfazer "lead nunca perdido" nesta fase. Quando o
 * Postgres real for provisionado, uma implementação `PostgresLeadStore`
 * substitui `fileLeadStore` sem mudar `route.ts` (só a peça que decide
 * qual implementação usar, abaixo).
 *
 * Nota de produção / correção 2026-07-12 (diagnóstico de "Não foi
 * possível enviar agora" no site de teste): o filesystem do runtime
 * serverless da Vercel é **somente leitura**, exceto `/tmp` — escrever
 * em `.data/leads.json` (caminho relativo a `process.cwd()`) lançava uma
 * exceção não tratada em `writeFile()`, que subia sem `try/catch` por
 * `save()`/`update()`/`saveIdempotentResponse()` até `app/api/lead/route.ts`,
 * resultando em 500 mesmo com o lead já entregue a EspoCRM/Octadesk.
 * Correção aplicada (aprovada pelo cliente como solução imediata,
 * enquanto um banco real não é provisionado):
 * 1. `DATA_DIR` usa `os.tmpdir()` (`/tmp` na Vercel) quando
 *    `process.env.VERCEL` está definido — o único diretório gravável.
 * 2. `writeFile()` nunca lança — falha de gravação é só um aviso no log.
 * Isso torna o store local **best-effort** (aceitável, já que desde
 * 2026-07-12 todo lead também é gravado no Firebase Realtime Database
 * — `lib/leads/firebase-backup.ts` — como backup real e persistente,
 * independente deste arquivo). Continua **não sendo** a solução
 * definitiva: `/tmp` na Vercel é efêmero (não sobrevive a cold starts
 * novos nem é compartilhado entre instâncias) — dedupe/idempotência
 * usando este store ficam menos confiáveis em produção até o Postgres
 * real ser provisionado.
 *
 * Deduplicação durável (projeto funil v2, 2026-10-25): com o Firebase
 * configurado, `leadStore` passa a ser o `RtdbLeadStore` — `findById` lê
 * `leads_backup/{id}` (o mesmo registro que a Cloud Function processa) e
 * `findRecentByDedupeKey` lê o índice `lead_dedupe/{env}/{dedupeKey}`,
 * compartilhado por todas as instâncias. O arquivo local continua como
 * reserva quando o RTDB falha e para a idempotência.
 */
export interface LeadStore {
  /** Busca um lead não-duplicado pela chave de dedupe, dentro da janela informada. */
  findRecentByDedupeKey(dedupeKey: string, windowMs: number): Promise<LeadRecord | null>;
  /**
   * Busca um lead pelo `id` (projeto 2026-07-13, captura em 2 fases) —
   * usado para localizar o registro `stage: "initial"` (contato inicial,
   * só telefone) na hora da atualização final com os dados completos.
   * Sujeito à mesma limitação de "best-effort" do resto deste store
   * (`/tmp` na Vercel não é compartilhado entre instâncias) — se não
   * encontrar, o chamador deve degradar graciosamente (tratar como um
   * envio novo), nunca falhar.
   */
  findById(id: string): Promise<LeadRecord | null>;
  save(record: LeadRecord): Promise<void>;
  update(id: string, patch: Partial<LeadRecord>): Promise<void>;
  /** Idempotência via `X-Idempotency-Key` (seção 51) — resposta já enviada para a mesma chave. */
  getIdempotentResponse(key: string): Promise<{ status: number; body: unknown } | null>;
  saveIdempotentResponse(key: string, status: number, body: unknown): Promise<void>;
}

type FileShape = {
  leads: LeadRecord[];
  idempotency: Record<string, { status: number; body: unknown; createdAt: string }>;
};

/** `/tmp` é o único diretório gravável no runtime serverless da Vercel (`process.env.VERCEL` é definido automaticamente lá). */
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "imediato-leads") : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
/** Janela de dedupe por telefone+ramo (seção 44.2). */
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function buildDedupeKey(phoneE164: string, ramo: string): string {
  return createHash("sha256").update(`${phoneE164}:${ramo}`).digest("hex");
}

class FileLeadStore implements LeadStore {
  private async readFile(): Promise<FileShape> {
    try {
      const raw = await readFile(DATA_FILE, "utf-8");
      return JSON.parse(raw) as FileShape;
    } catch {
      return { leads: [], idempotency: {} };
    }
  }

  /**
   * Nunca lança — uma falha de gravação (ex.: filesystem somente
   * leitura) fica só como aviso no log. `/api/lead` não deve retornar
   * 500 por causa deste store local best-effort (ver nota de produção
   * no topo do arquivo); o backup real está no Firebase.
   */
  private async writeFile(data: FileShape): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.warn(
        `[lib/leads/store] Falha ao gravar ${DATA_FILE} (não bloqueante — o lead já foi/será enviado a EspoCRM/Octadesk/Firebase independente deste store local):`,
        error
      );
    }
  }

  async findRecentByDedupeKey(dedupeKey: string, windowMs: number): Promise<LeadRecord | null> {
    const data = await this.readFile();
    const cutoff = Date.now() - windowMs;
    const match = data.leads.find((lead) => lead.dedupeKey === dedupeKey && new Date(lead.createdAt).getTime() >= cutoff);
    return match ?? null;
  }

  async findById(id: string): Promise<LeadRecord | null> {
    const data = await this.readFile();
    return data.leads.find((lead) => lead.id === id) ?? null;
  }

  async save(record: LeadRecord): Promise<void> {
    const data = await this.readFile();
    data.leads.push(record);
    await this.writeFile(data);
  }

  async update(id: string, patch: Partial<LeadRecord>): Promise<void> {
    const data = await this.readFile();
    const index = data.leads.findIndex((lead) => lead.id === id);
    if (index === -1) return;
    data.leads[index] = { ...data.leads[index], ...patch, updatedAt: new Date().toISOString() };
    await this.writeFile(data);
  }

  async getIdempotentResponse(key: string): Promise<{ status: number; body: unknown } | null> {
    const data = await this.readFile();
    const entry = data.idempotency[key];
    if (!entry) return null;
    if (Date.now() - new Date(entry.createdAt).getTime() > IDEMPOTENCY_TTL_MS) return null;
    return { status: entry.status, body: entry.body };
  }

  async saveIdempotentResponse(key: string, status: number, body: unknown): Promise<void> {
    const data = await this.readFile();
    data.idempotency[key] = { status, body, createdAt: new Date().toISOString() };
    await this.writeFile(data);
  }
}

type RtdbLeadData = Partial<Omit<LeadRecord, "id" | "status" | "dedupeKey" | "createdAt" | "updatedAt">>;

type RtdbLeadRecord = {
  timestamp?: string;
  environment?: string;
  data?: RtdbLeadData;
  espocrm_sent?: boolean;
  octadesk_sent?: boolean;
  espocrm_attempts?: number;
  octadesk_attempts?: number;
  espocrmLeadId?: string;
  espocrmOpportunityId?: string;
};

type DedupeIndexEntry = { leadId: string; at: string };

/** Converte `leads_backup/{id}` no `LeadRecord` que `/api/lead` mescla com os dados novos. */
export function leadFromBackup(id: string, record: RtdbLeadRecord | null): LeadRecord | null {
  const data = record?.data;
  if (!data?.phoneE164 || record?.environment !== appEnvironment) return null;
  const ramo = data.ramo ?? "";
  const createdAt = record.timestamp ?? new Date().toISOString();
  return {
    ...data,
    id,
    stage: data.stage ?? "complete",
    ramo,
    phoneE164: data.phoneE164,
    status: "received",
    dedupeKey: buildDedupeKey(data.phoneE164, ramo),
    createdAt,
    updatedAt: createdAt,
    espocrmStatus: record.espocrm_sent ? "sent" : "pending",
    espocrmAttempts: record.espocrm_attempts ?? 0,
    octadeskStatus: record.octadesk_sent ? "sent" : "pending",
    octadeskAttempts: record.octadesk_attempts ?? 0,
    espocrmLeadId: record.espocrmLeadId,
    espocrmOpportunityId: record.espocrmOpportunityId,
  };
}

/**
 * Leads no Firebase RTDB (projeto funil v2). O registro em si é gravado
 * por `saveLeadBackupToFirebase`; aqui só se lê esse registro e se mantém
 * o índice de dedupe. `save` cria o índice por `transaction()`: se outra
 * instância já gravou um lead para o mesmo telefone+ramo dentro da
 * janela, o índice existente é mantido. Qualquer falha do RTDB cai para
 * o arquivo local — o envio do lead nunca depende deste índice.
 */
class RtdbLeadStore implements LeadStore {
  constructor(private readonly fallback: LeadStore) {}

  private dedupeRef(dedupeKey: string) {
    const database = getLeadBackupDatabase();
    return database ? database.ref(`lead_dedupe/${appEnvironment}/${dedupeKey}`) : null;
  }

  async findRecentByDedupeKey(dedupeKey: string, windowMs: number): Promise<LeadRecord | null> {
    try {
      const ref = this.dedupeRef(dedupeKey);
      if (!ref) return this.fallback.findRecentByDedupeKey(dedupeKey, windowMs);
      const entry = (await ref.get()).val() as DedupeIndexEntry | null;
      if (!entry?.leadId || Date.now() - Date.parse(entry.at) > windowMs) return null;
      return await this.findById(entry.leadId);
    } catch (error) {
      console.warn("[lib/leads/store] Falha ao ler lead_dedupe no RTDB — usando o arquivo local:", error);
      return this.fallback.findRecentByDedupeKey(dedupeKey, windowMs);
    }
  }

  async findById(id: string): Promise<LeadRecord | null> {
    try {
      const database = getLeadBackupDatabase();
      if (!database) return this.fallback.findById(id);
      const record = (await database.ref(`leads_backup/${id}`).get()).val() as RtdbLeadRecord | null;
      return leadFromBackup(id, record) ?? (await this.fallback.findById(id));
    } catch (error) {
      console.warn(`[lib/leads/store] Falha ao ler leads_backup/${id} no RTDB — usando o arquivo local:`, error);
      return this.fallback.findById(id);
    }
  }

  async save(record: LeadRecord): Promise<void> {
    await this.fallback.save(record);
    try {
      const ref = this.dedupeRef(record.dedupeKey);
      if (!ref) return;
      const result = await ref.transaction((current: DedupeIndexEntry | null) => {
        if (current?.leadId && current.leadId !== record.id && Date.now() - Date.parse(current.at) <= DEDUPE_WINDOW_MS) {
          return undefined;
        }
        return { leadId: record.id, at: record.createdAt };
      });
      if (!result.committed) {
        console.warn(`[lib/leads/store] lead_dedupe já apontava para outro lead dentro da janela — ${record.id} não substituiu o índice.`);
      }
    } catch (error) {
      console.warn(`[lib/leads/store] Falha ao gravar lead_dedupe para ${record.id} (não bloqueante):`, error);
    }
  }

  update(id: string, patch: Partial<LeadRecord>): Promise<void> {
    return this.fallback.update(id, patch);
  }

  getIdempotentResponse(key: string): Promise<{ status: number; body: unknown } | null> {
    return this.fallback.getIdempotentResponse(key);
  }

  saveIdempotentResponse(key: string, status: number, body: unknown): Promise<void> {
    return this.fallback.saveIdempotentResponse(key, status, body);
  }
}

/**
 * `env.databaseUrl` continua sendo o valor placeholder do `.env.example`
 * (`postgres://usuario:senha@host:5432/banco_placeholder`) até um banco
 * real ser provisionado — nesse caso, usar o store em arquivo. Uma URL
 * real e diferente do placeholder é o sinal para (no futuro) trocar pela
 * implementação Postgres real.
 */
const PLACEHOLDER_DATABASE_URL = "postgres://usuario:senha@host:5432/banco_placeholder";
export const isUsingRealDatabase = Boolean(env.databaseUrl) && env.databaseUrl !== PLACEHOLDER_DATABASE_URL;

if (!isUsingRealDatabase && !firebaseBackupEnabled && typeof window === "undefined") {
  console.warn(
    `[lib/leads/store] DATABASE_URL não configurada (ou é o placeholder) — usando armazenamento em arquivo local best-effort (${DATA_FILE}). Ver nota de produção em lib/leads/store.ts.`
  );
}

// TODO(Issue 24 ou dedicada de infra): quando houver Postgres real,
// substituir por `new PostgresLeadStore(env.databaseUrl)` aqui.
export const leadStore: LeadStore = new RtdbLeadStore(new FileLeadStore());

export function generateLeadId(): string {
  return `ld_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
