import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
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
 * Nota de produção: armazenamento em arquivo local **não sobrevive** a
 * ambientes serverless com filesystem efêmero (ex.: Vercel). Isso é
 * aceitável apenas como placeholder de desenvolvimento — é uma
 * simplificação explícita, não uma escolha de arquitetura final.
 */
export interface LeadStore {
  /** Busca um lead não-duplicado pela chave de dedupe, dentro da janela informada. */
  findRecentByDedupeKey(dedupeKey: string, windowMs: number): Promise<LeadRecord | null>;
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

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

class FileLeadStore implements LeadStore {
  private async readFile(): Promise<FileShape> {
    try {
      const raw = await readFile(DATA_FILE, "utf-8");
      return JSON.parse(raw) as FileShape;
    } catch {
      return { leads: [], idempotency: {} };
    }
  }

  private async writeFile(data: FileShape): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  async findRecentByDedupeKey(dedupeKey: string, windowMs: number): Promise<LeadRecord | null> {
    const data = await this.readFile();
    const cutoff = Date.now() - windowMs;
    const match = data.leads.find((lead) => lead.dedupeKey === dedupeKey && new Date(lead.createdAt).getTime() >= cutoff);
    return match ?? null;
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

/**
 * `env.databaseUrl` continua sendo o valor placeholder do `.env.example`
 * (`postgres://usuario:senha@host:5432/banco_placeholder`) até um banco
 * real ser provisionado — nesse caso, usar o store em arquivo. Uma URL
 * real e diferente do placeholder é o sinal para (no futuro) trocar pela
 * implementação Postgres real.
 */
const PLACEHOLDER_DATABASE_URL = "postgres://usuario:senha@host:5432/banco_placeholder";
export const isUsingRealDatabase = Boolean(env.databaseUrl) && env.databaseUrl !== PLACEHOLDER_DATABASE_URL;

if (!isUsingRealDatabase && typeof window === "undefined") {
  console.warn(
    "[lib/leads/store] DATABASE_URL não configurada (ou é o placeholder) — usando armazenamento em arquivo local (.data/leads.json), apenas para desenvolvimento. Ver nota de produção em lib/leads/store.ts."
  );
}

// TODO(Issue 24 ou dedicada de infra): quando houver Postgres real,
// substituir por `new PostgresLeadStore(env.databaseUrl)` aqui.
export const leadStore: LeadStore = new FileLeadStore();

export function generateLeadId(): string {
  return `ld_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
