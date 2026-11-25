# Referência: painéis do Monitor no n8n

Estudo feito em 25/11/2026, **só leitura** (nada foi criado nem alterado no n8n).
O Monitor já resolveu, em produção, quase tudo o que o painel do pago do Contador CEO precisa.
A ideia é replicar o padrão em fluxos novos `[CEO PAGO]`, sem tocar nos fluxos do Monitor.

## Fluxos estudados

| Fluxo no n8n | O que faz | O que aproveitar |
|---|---|---|
| [MONITOR COMERCIAL] Meta Ads: coleta de gasto (6 h) | Gasto, impressões, cliques e leads por anúncio e por dia, gravados numa tabela do n8n | Toda a lógica de coleta |
| [MONITOR COMERCIAL] Funil: coleta 30 min | Cards do PipeRun: origem, campanha, etapas, reuniões, 1ª resposta, tentativas | Classificação de origem, campanha do lead, cuidado com a API |
| [MONITOR COMERCIAL] Funil: API e página de marketing | Painel de marketing completo (metas, custo de mídia, campanhas, safras, qualificação) | É o modelo do painel do pago |
| [MONITOR GESTÃO] Painel CEO: página e API | Página com login Google, lista de e-mails, registro de acesso, proteções | Modelo de segurança da página |
| [MKT UTIL] Leitura Meta Ads CEO/Elite | Utilitário só de leitura da conta 233916409249136 | Prova que a credencial "Meta Insights Hub." acessa a conta do Contador CEO |

## Coleta do Meta

- **Uma consulta por dia** (`since = until`), sem `time_increment=1`: a quebra diária do Meta devolve gasto e impressões incompletos.
- A cada 6 h, **refaz os últimos 10 dias** (o Meta corrige números para trás). Carga manual refaz desde o início do período.
- Nível **anúncio** (`level=ad`): campanha, conjunto e anúncio, com IDs e nomes.
- **Leads** = o primeiro disponível entre `lead`, `onsite_conversion.lead_grouped` (formulário instantâneo) e `offsite_conversion.fb_pixel_lead`.
- Linhas antigas de dias reprocessados que o Meta não devolve mais são **zeradas**, para não somar número errado.
- Paginação pela `paging.next`, lotes de 4 com pausa de 1 s, 3 tentativas em caso de erro.
- No Contador CEO: conta **233916409249136**, credencial **"Meta Insights Hub."** (só usar, nunca editar).

> Correção para o nosso `lib/`: hoje a coleta proposta usa `time_increment=1`. Trocar para uma consulta por dia.

## Coleta do PipeRun

- **A API é compartilhada pelo grupo inteiro.** Lotes de 1 chamada com ~1,1 s de pausa, 5 tentativas, cursor por data e fila do que sobrou para a próxima rodada. Abusar dela trava venda nova (Asaas/Conta Azul), agenda, telão e supermeta.
- Grupos de origem do PipeRun: **orgânico 36347, pago 36348, outbound 36349, relacionamento 36350, receptivo 36351, eventos 43897**.
- **Campanha, conjunto e anúncio** de cada lead vêm do histórico do card, gravados pela integração do Meta Lead Ads (`json_integrator`). Sem isso, das UTMs.
- **Perfil contábil e faturamento** vêm do formulário do Meta: base para o **MQL** sem depender só do 4Forms.
- UTM do site gravada deslocada: `utm_source` = posicionamento (ex.: Instagram_Reels), `utm_medium` = campanha, `utm_campaign` = conjunto, `utm_content` = anúncio.
- Confere a cada rodada os cards abertos no PipeRun para corrigir status e etapa (ganho/perda sem troca de etapa não gera histórico).

## Painel de marketing (o que replicar)

| Bloco | Conteúdo |
|---|---|
| Metas | Leads, investimento, agendamentos e vendas do tráfego contra a meta; previsto até hoje, projeção, falta por dia; CPL máximo para fechar a meta com a verba que sobra |
| Custo de mídia | Gasto do Meta ligado às campanhas e anúncios do PipeRun **pelo nome**: CPL, custo por agendamento, por reunião, CAC, retorno, payback |
| Campanhas e anúncios | Top 15 com leads, contatados, agendados, vendas, MRR, posicionamento |
| Resultado do marketing | Leads → perfil "sim" → agendaram → reunião → qualificados → vendas, pago e orgânico |
| Qualificação | Um status por lead, pelo motivo de perda: sem perfil = não qualificado; sem contato, no-show, sem interesse = sem definição |
| Formulário × resultado | Se a resposta de perfil prevê o lead bom |
| Safras | Por mês de entrada, quando virou venda (mesmo mês, seguinte, 2+), com CAC e payback |
| Operação | 1ª resposta em minutos úteis, fora do horário, tentativas, repetidos, perdas por etapa e motivo |

## Regras de negócio que eles usam

- **Lead pago** = origem no grupo Mídia Paga **ou** UTM de rede de anúncio.
- **Valores em R$** só para o acesso de marketing; telão de vendas vê só contagens.
- **Metas** numa aba de metas da planilha, nunca fixas no código.
- **Venda** conta pela data do ganho; safra pela data de entrada do lead.

## Segurança da página (Painel CEO)

- Login Google; e-mail precisa estar numa lista; sessão de 90 dias.
- Cada abertura de página e chamada de API vai para um registro de acesso (sem gravar token).
- A página roda isolada; a sessão vai no corpo do POST; política de conteúdo restrita (só fontes do Google e chamadas ao próprio n8n).
- Publicação do HTML só por fluxo manual, com cópia da versão anterior.

## O que muda para o Contador CEO

| Monitor | Contador CEO |
|---|---|
| Conta Meta do Monitor | 233916409249136 |
| Funis SDR, Vendas, BDR do Monitor | Black Belt (101027) e Outliers (108929, 108930, 108931) |
| Motivos de perda e etapas do Monitor | Os do Contador CEO (mapear antes) |
| Visual escuro do Monitor | Visual aprovado: branco, azul #1F5FD1, vidro (`docs/visual.md`) |
| Lista de e-mails do Matheus | Henrique e Luís |

## Riscos a evitar

Ver a conversa de 25/11/2026: não editar fluxos, tabelas ou credenciais existentes; não escrever no Meta nem no PipeRun;
caminhos de webhook próprios (`painel-pago-ceo`); testar em modo manual antes de ativar; página sempre com login.
