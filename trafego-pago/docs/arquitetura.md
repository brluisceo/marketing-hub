# Arquitetura

```
Meta Ads API v25 ──┐
PipeRun API ───────┼─► n8n (coleta diária, 06:00) ─► Postgres Optimus (schema trafego_pago)
4Forms ────────────┘                                        │
                                                            ▼
                         Marketing Hub (Cloudflare) ─► lib/ calcula ─► Claude redige ─► conferência
                         Tela "Relatório do dia" e "Eventos e campanhas", atrás do Cloudflare Access
```

- **n8n grava, não calcula.** Uma linha por campanha por dia (`campanha_dia`), já classificada com
  `lib/classificar.ts` (mesma regra, copiada para um nó de código do n8n).
- **O Marketing Hub calcula** com `lib/calculos.ts` na hora de mostrar.
- **O Claude só redige** a leitura do dia, que passa por `conferirNumeros` antes de ir para `relatorio`.
- A coleta do Meta reaproveita o fluxo do Luís (mesma credencial no n8n), com outro filtro.
