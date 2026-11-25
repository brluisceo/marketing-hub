# Decisões

| Nº | Data | Decisão |
|---|---|---|
| D1 | 09/11/2026 | Escopo: Contador CEO. Mesmo produto, dois times: **Black Belt** (Funil Closer, PipeRun 101027) e **Outliers** (Funil Elite, PipeRun 108929, 108931, 108930). Times comparados por taxa, não por custo. |
| D2 | 09/11/2026 | Campanha entra com `NNCEOAAAA` no nome (inclusive `[ALC]`, `[WCC]`, `[IPE]`), `CCX-` ou `[CONTADORCEO]`. Sem código fica de fora. |
| D3 | 09/11/2026 | CPL e ranking só com campanhas de lead. Leads pelo campo `lead` do Meta. |
| D4 | 09/11/2026 | **Lead** = só nome, telefone e e-mail. **MQL** = dono ou sócio + faturamento no critério. |
| D5 | 09/11/2026 | Mai/2024 a mar/2025 (Meta sem lead registrado) fica fora de comparações. |
| D6 | 09/11/2026 | Queda de investimento em out e nov/2026 foi planejada: sem alerta. |
| D7 | 09/11/2026 | Custo por reunião e CAC usam o investimento de todo o escopo. CAC e retorno sempre em 30 dias. |
| D8 | 25/11/2026 | Stack: Meta v25 → n8n → Postgres da Optimus → telas no Marketing Hub (Cloudflare + Cloudflare Access). Sem Supabase, sem Vercel, sem D1. |
| D9 | 09/11/2026 | Velocímetro de leads: vermelho < 40%, amarelo 40–65%, verde ≥ 65% da meta. |
| D10 | 09/11/2026 | Visual: fundo branco, azul #1F5FD1, marinho #021528, cartões de vidro, Manrope + Libre Baskerville itálico. |
| D11 | 10/11/2026 | Live G4 e CONT - Summit **não** contam como contato do marketing. |
| D12 | 10/11/2026 | Venda "Sem origem" no PipeRun com origem CCX na planilha comercial conta como CCX. |
| D13 | 25/11/2026 | Desenvolvimento em `hbceo/Tr-fego-Pago---HUB-MARKETING-`; depois a pasta `trafego-pago/` vai para `brluisceo/marketing-hub`. |
| D14 | 25/11/2026 | **Primeira versão roda no n8n**, no padrão dos painéis do Monitor: coleta do Meta (6 h), coleta do PipeRun (30 min) e painel com login Google, dados em tabelas do n8n. Construída no repositório e importada pelo Luís. O Postgres (`db/`) fica para depois. |
| D15 | 25/11/2026 | Acesso ao painel, por enquanto: Henrique e Luís. |
| D16 | 25/11/2026 | MQL pela resposta de perfil (dono ou sócio) do formulário do Meta Lead Ads, lida no histórico do card do PipeRun. |

## Pendentes
- Meta diária de leads (exemplo: 110) e meta de custo por reunião (exemplo: R$ 600).
- Faixa de faturamento do MQL e se existe "MQL quente".
- Como os leads são divididos entre Black Belt e Outliers.
- Significado dos prefixos ALC, WCC, IPE. Nomes dos códigos 03, 07, 14, 19 e 21CEO2026.
- Origem do 4Forms para o banco (API, webhook ou n8n).
- Instalar o app do GitHub na conta brluisceo para levar o módulo ao marketing-hub.
