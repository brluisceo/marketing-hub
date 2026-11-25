# AGENTS.md · Tráfego Pago

Leia antes de mexer no código. Continuação: veja `docs/rodadas.md`.

## Stack
Primeira versão (D14): Meta Ads API v25 e PipeRun → **n8n** (coleta e painel, tabelas do n8n). Depois (D8): Postgres da Optimus.

## Regras que não mudam
1. **Número só sai de código** (`painel/calculo.js`, `lib/calculos.ts`). O Claude só redige; `conferirNumeros` barra número inventado.
2. **Dado ausente é `null` e aparece "—"**. Nunca estimar.
3. **Escopo (D2):** só campanha com `NNCEOAAAA`, `CCX-` ou `[CONTADORCEO]` no nome.
4. **CPL e ranking (D3):** só campanhas de lead.
5. **Leads do Meta e do CRM são números diferentes.** Nunca somar nem trocar.
6. **Segredos** ficam nas credenciais do n8n / Optimus. Nunca no código, no chat ou em log.
7. **Nada de dado pessoal no código** (nomes, e-mails, telefones, valores de clientes).
8. **Fluxos só leem** o Meta e o PipeRun, e só gravam nas tabelas `CEO PAGO`. Nunca editar fluxos, tabelas ou credenciais existentes.
9. Toda decisão nova vai para `docs/decisoes.md` com número e data.

## Mapa
`painel/` página e cálculo do painel · `n8n/` gerador dos fluxos e guia · `docs/` decisões, visual, referência do Monitor ·
`lib/` e `db/` versão Postgres · `test/` testes
