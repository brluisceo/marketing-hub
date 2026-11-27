# Tráfego pago: regras e decisões

Complementa o [guia de implantação](trafego-pago.md). Vale para o Contador CEO. Toda decisão nova entra aqui com data.

## O que o módulo responde

Em uma tela: quanto gastamos, quantos leads e vendas vieram, quanto custou cada etapa, quais campanhas e criativos funcionam,
o que está parado ou errado, e o que o comercial fez com os leads do pago (reuniões, vendas, por vendedor e ao vivo).

## Fontes

| Dado | Fonte | Coleta (n8n → Postgres) |
|---|---|---|
| Investimento, impressões, cliques, visitas, leads, checkouts, compras no pixel | Meta Ads, conta 233916409249136, credencial "Meta Insights Hub." (`ads_read`) | `[HUB] Meta Ads — anúncios`: de hora em hora, um dia por consulta, refaz 10 dias |
| Situação e orçamento das campanhas | Meta Ads | mesmo fluxo |
| Oportunidades, origem, campanha do lead, perfil, reuniões, vendas, vendedor | PipeRun | `[HUB] PipeRun — oportunidades`: a cada 30 min, dias úteis, 7h–21h (:22 e :52) |
| Movimentos ao vivo (agendada, realizada, no-show, venda) | PipeRun, automação de webhook por etapa | `[HUB] PipeRun — movimentos`: na hora, sem chamar a API |
| Vendas totais e líquido | Preenchido à mão no site | — |
| Vendas do Eduzz por página e criativo | Relatório colado no site | — (não é gravado) |

## Regras de leitura

| Nº | Data | Regra |
|---|---|---|
| D1 | 09/11/2026 | Dois times vendem o mesmo produto: **Black Belt** (Funil Closer, 101027) e **Outliers** (Funil Elite: 108929 SDR, 108931 BDR, 108930 Vendas). Comparar por taxa, não por custo. |
| D2 | 26/11/2026 | **Todas as campanhas da conta entram**, agrupadas por família: Plano Contábil/Black (`[BLACK2026]`, `[32CEO2026]`), Dourados (`DOURADOS`), Eventos regionais e outras (`NNCEOAAAA`, `CCX`, `[CONTADORCEO]`). O resto aparece como **Sem grupo**. Nunca filtrar por uma palavra só (já houve erro filtrando "BLACK"). As famílias ficam na configuração (`familias_json`). |
| D3 | 09/11/2026 | Custo por lead e ranking de leads só com campanhas de lead. |
| D4 | 09/11/2026 | **Lead** = nome, telefone e e-mail. **MQL** = respondeu "sim" para dono ou sócio (formulário do Meta Lead Ads, lido no histórico do card). |
| D5 | 09/11/2026 | Mai/2024 a mar/2025 (Meta sem lead registrado) fica fora de comparações. |
| D7 | 09/11/2026 | CAC e retorno sempre em 30 dias (o contrato demora a fechar). |
| D9 | 09/11/2026 | Meta de leads: vermelho abaixo de 40%, amarelo de 40% a 65%, verde a partir de 65%. |
| D11 | 10/11/2026 | Live G4 e CONT - Summit **não** contam como contato do marketing. |
| D12 | 10/11/2026 | Venda "Sem origem" no PipeRun com origem CCX na planilha comercial conta como CCX. |
| D16 | 25/11/2026 | **Lead pago** = origem no grupo Mídia Paga **ou** UTM vinda de rede de anúncio (padrão do Monitor). |
| D18 | 26/11/2026 | Tempo real pelo webhook do PipeRun; a tela ao vivo se atualiza a cada minuto. |
| D19 | 26/11/2026 | Vendedor = responsável pelo card no PipeRun. Comparecimento = realizadas ÷ (realizadas + no-show). |
| D20 | 26/11/2026 | Compras no pixel **não** são o total de vendas (vendas fechadas no WhatsApp podem não aparecer). Vendas do Eduzz com `utm_source` = `mark` ou `meta` contam como anúncio; o código da página (`32ceo2026-0X`) vem no fim do `utm_content`. O lead do pixel inclui o lead do checkout do Eduzz; o lead de formulário aparece separado. Eventos numéricos do pixel (ex.: 648811) são etapas do PipeRun e não entram. Mostrar dois CTRs: todos os cliques e do link. Dado ausente = "n/d", nunca número inventado. |

## Telas previstas (`/trafego`)

| Tela | Conteúdo |
|---|---|
| `/trafego` (visão geral) | Cartões do período com variação, funil da impressão à venda com passagem e custo por etapa, alertas, meta de leads |
| `/trafego/campanhas` | Por família: nome exato, situação, orçamento/dia, investido, leads, custo por lead, checkouts, compras, valor, ROAS do pixel |
| `/trafego/criativos` | Ranking de anúncios (3 melhores e 3 piores por custo por resultado; "amostra pequena" abaixo de 500 impressões) e bloco Dourados |
| `/trafego/funil` | Do lead à venda no PipeRun, Black Belt × Outliers, evolução |
| `/trafego/vendedores` | O que cada vendedor fez com os leads do pago |
| `/trafego/ao-vivo` | Movimentos do dia (agendadas, realizadas, no-show, vendas) |
| `/trafego/resultado` | Resultado geral preenchido à mão e relatório do Eduzz colado |

Visual: o do hub (claro e minimalista). Protótipo navegável com dados de exemplo: pedir o link ao Henrique.

## Pendências com a gestão

- Meta diária de leads e meta de custo por reunião.
- Valor do contrato: só P&S ou P&S + MRR (`regra_valor`).
- Faixa de faturamento do MQL e se existe "MQL quente".
- Campo do SDR no PipeRun (hoje o vendedor é o responsável pelo card).
- Nomes dos códigos 03, 07, 14, 19 e 21CEO2026 e dos prefixos ALC, WCC, IPE.
