# CHANGELOG

## Finalidade
Histórico de mudanças do projeto (Conventional Commits).

## Origem
Derivado de `ESPECIFICACAO v3.md` (convenção das seções 23/58) e `PLANO_IMPLEMENTACAO.md` rev. 4.1 (seção 4).

## Status
ATIVO (preenchido a cada release)

---

## [0.2.0] — 2026-07-28

### Added
- E-mail admin na Cloud Function `deliverLead` (mesmo Cloud Run do legado), com dedupe por flags no RTDB (`firebase/functions/email-notification.js`).
- Recuperação de `espocrmLeadId` stale no EspoCRM (PUT 404/403 → find/create).
- Harness E2E EspoCRM (`e2e/testes-espocrm.spec.ts` + cases/resultados).
- Documento da nova fase: `docs/FASE_ESTABILIZACAO_E2E_LEADS.md` (erros E1–E5 a estabilizar).

### Fixed
- `cf_retry_count` consumido a cada estágio — agora sobe só em falha de entrega; reset no `stage: initial`.
- `ReferenceError` em `maybeSendAdminEmail` (destructuring `record` vs `workingRecord`).
- Rate limit de `/api/validate/*` compartilhado com leads — buckets separados `lead` vs `validate`.

### Changed
- Writes só de metadados na RTDB passam a ser ignorados pela CF (evita reentrada).
- Documentação de arquitetura de leads atualizada (e-mail admin + limites de retry).

### Known issues (próxima fase)
Ver `docs/FASE_ESTABILIZACAO_E2E_LEADS.md`: `rpa_desabilitado` intermitente, funil CRM incompleto na janela E2E, HTTP 409 por telefone reutilizado, cobertura parcial da bateria de 23 casos.

---

## [0.1.0] — baseline pré-release

Versão inicial do pacote (`package.json`). Histórico de commits anteriores permanece no Git sem tags semânticas formais até esta release.
