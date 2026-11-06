# Marketing HUB

**Hub interno do marketing do Grupo ABS**: um só lugar para o time de marketing, o comercial e quem mais acessar ver o que o marketing está fazendo. Módulos: Instagram **@rogerio.fameli** (o único já ligado), tráfego pago (Meta Ads e funil), sites no ar, calendário e aprovação, entregáveis da equipe. A tela inicial (`/`) mostra todos os módulos; cada um ganha suas telas próprias conforme for ligado. Next.js 15.5 (App Router), React 19.1, TypeScript estrito, **sem nenhuma outra dependência** (exceto `pg`, ver migração). O site só lê dados: quem coleta tudo é o n8n.

O usuário é da equipe de marketing, não é desenvolvedor. **Responda sempre em português do Brasil**, em linguagem simples, e explique o "porquê" das coisas sem jargão.

## Regras que não podem ser quebradas

1. **Não mude o visual sem pedido explícito.** O estilo é claro e minimalista, inspirado em apps de Mac. Mudança de layout, cor, espaçamento, componente novo na tela ou texto de rótulo: proponha e espere o "ok". Ajustes internos (cache, tipos, lógica) podem ser feitos.
2. **Nunca mostre segredos.** Não imprima `.env.local` nem valores de `HUB_API_KEY`, `AUTH_SECRET` ou tokens da Meta. Para conferir, mostre só o tamanho ou mascare: `sed -E 's/(KEY=|SECRET=).+/\1<oculto>/' .env.local`.
3. **A `HUB_API_KEY` só existe no servidor.** Nunca use `NEXT_PUBLIC_`, nunca chame a API do hub a partir de um componente `'use client'`.
4. **Não adicione dependências** (nada de Tailwind, libs de gráfico, UI kits ou ORMs) sem combinar antes. Gráficos são CSS/SVG feitos à mão.
5. **n8n em produção:** ler fluxos e tabelas pode ser feito livremente. Antes de **alterar, ativar, desativar ou executar** um fluxo, ou de gravar e apagar dados nas tabelas, peça confirmação.

## Comandos

```bash
npm run dev      # http://localhost:3000 (o login com Google só volta para portas cadastradas no Google Cloud; 3001 precisa estar cadastrada)
npm run build    # é a verificação de tipos/lint do projeto (não há testes automatizados)
npm start        # roda o build
```

Node 20+ (a máquina tem 22). Depois de mudar código, rode `npm run build` para validar.

## Como os dados chegam

```
API da Meta (Graph v25) → n8n (coleta) → Postgres (Neon) → lib/dados.ts → lib/hub.ts → páginas
(durante a migração o n8n ainda grava também nas Data Tables HUB_*; a API do hub no n8n segue no ar como plano B e para as miniaturas)
```

### n8n — https://n8n.absgroup.com.br, projeto "Marketing ABS Group"

| Fluxo | ID | O que faz |
|---|---|---|
| [HUB] Instagram — posts e métricas | `FWJQdOfb55MQIa9r` | A cada 30 min (posts dos últimos 14 dias); diário às 6h (90 dias, grava histórico em snapshots); carga inicial manual (365 dias) |
| [HUB] Instagram — conta diária | `WmeA57lkpnF2Rday` | 1x por dia grava seguidores, alcance, visualizações e visitas do **dia anterior** |
| [HUB] Instagram — stories | `YMWwbscNHSLv1GZ0` | A cada 15 min busca os Stories no ar (`/stories`) e grava métricas e navegação. A Meta só entrega Stories durante as 24 h no ar: sem histórico anterior a 05/11/2026 |
| [HUB] API do hub | `QwHEHvXcqUP3G3F2` | Webhook `GET /webhook/hub-api`, protegido por Header Auth (credencial "X-Hub-Key"). Fuso `America/Sao_Paulo` |

O MCP do n8n está disponível neste ambiente (`mcp__claude_ai_n8n__*`): use `get_workflow_details` para ler a lógica real antes de supor algo.

### Tabelas (n8n Data Tables)

| Tabela | ID | Conteúdo |
|---|---|---|
| HUB_POSTS | `7ab9T15pj7MxVJk7` | 1 linha por post, números mais recentes. `mes_ref` (yyyy-MM) = mês de publicação |
| HUB_METRICAS_SNAPSHOTS | `EDMmUpB4jR2e6iv2` | Histórico de métricas por post (`coletado_em`) |
| HUB_CONTAS_DIARIO | `bOFuHEIG6zYRbwE9` | 1 linha por dia da conta (`data`, `seguidores`, `alcance`, `visualizacoes`, `visitas_perfil`). Começou em 29/10/2026 |
| HUB_STORIES | `tWilJszXMAnfK0tW` | 1 linha por Story (`story_id`), último número lido enquanto estava no ar. Alcance, visualizações, respostas, visitas, navegação (`toques_avancar`, `saidas`...) |
| HUB_SYNC_LOG | `tRsza3vTpytU98uI` | Log de cada execução (`fluxo`, `status`, `posts_processados`, `erro`) |

### Contrato da API do hub

`GET {HUB_API_URL}?recurso=...` com header `X-Hub-Key`. Os tipos de resposta estão em [lib/types.ts](lib/types.ts) e precisam bater com os nós de código do fluxo.

| recurso | parâmetros | resposta |
|---|---|---|
| `overview` | `mes` (yyyy-MM, padrão mês atual) | `Overview`: KPIs do mês e do anterior, série de 12 meses, por formato, top 5, resumo da conta |
| `posts` | `mes`, `formato`, `ordem`, `dir`, `busca`, `pagina`, `por_pagina` (máx. 100) | `PostsResp` |
| `post` | `post_id` | `PostResp` com `historico` (ou `{ erro: 'post_nao_encontrado' }`) |
| `conta` | `dias` (1–365, padrão 30) | `ContaResp` |
| `stories` | `mes` | `StoriesResp`: KPIs do mês e do anterior, lista de Stories (`no_ar` = publicado há menos de 24 h), `coleta_desde` |
| `thumb` | `post_id` | `{ url }` buscado na hora na Meta (links do Instagram expiram) |

Engajamento = `interacoes / alcance` (uma casa decimal), calculado no n8n.

Se mudar o formato de uma resposta, atualize **três lugares juntos**: o nó de código no n8n, `lib/types.ts` e `lib/mock.ts`.

## O que os números significam (fonte de confusão frequente)

- **Os números são orgânicos.** A API de insights da Meta não inclui o que veio de impulsionamento/anúncio. Um Reel impulsionado pode mostrar 2 mil no hub e 261 mil no app. Para o total, é preciso a Marketing API (`ads_read`), que ainda não está integrada.
- **KPIs do mês = soma dos posts publicados naquele mês** (por `mes_ref`), com as visualizações acumuladas de cada post até hoje. O painel do Instagram soma tudo o que foi visto no período (inclui stories e posts antigos). Os dois números não batem, e isso é esperado.
- O total da conta por período (o que bate com o app) vem de HUB_CONTAS_DIARIO. Hoje aparece só na tela Conta.
- Atraso: coleta a cada 30 min no n8n + cache de 120 s no site (`revalidate` em [lib/hub.ts](lib/hub.ts)) + atraso próprio da Meta.

## Estrutura do código

- [lib/hub.ts](lib/hub.ts): único ponto de entrada dos dados. `hub.overview/posts/post/conta/stories` leem o Postgres via [lib/dados.ts](lib/dados.ts) (cache de 120 s com `unstable_cache`) quando há `DATABASE_URL`; com `HUB_FONTE=n8n` voltam para a API do hub (plano B). `hub.thumb` continua na API do n8n (precisa do token da Meta). `modoDemo` = `HUB_MOCK=1` ou sem banco e sem `HUB_API_URL`.
- [lib/dados.ts](lib/dados.ts): reproduz a lógica dos nós de código do fluxo [HUB] API do hub (mesmo formato de resposta, mesmas datas ISO). Validado em 06/11/2026 comparando as duas fontes (30 casos; diferenças só na ordem de empates, que agora desempatam pelo post mais recente). Se mudar um cálculo, mude aqui (e no fluxo, enquanto ele for plano B).
- [lib/mock.ts](lib/mock.ts): dados de exemplo (retrato de out/2026). `thumb` não existe no mock, então miniaturas não aparecem no modo demonstração.
- [lib/format.ts](lib/format.ts): **toda** formatação de número, %, data e mês (pt-BR, fuso `America/Sao_Paulo`): `num`, `compacto`, `pct`, `deltaPct`, `deltaPp`, `nomeMes`, `dataCurta`, `haQuanto`... Reuse; não formate na página.
- **Login só com Google, só contas @absgroup.com.br.** [lib/google.ts](lib/google.ts): OpenID Connect feito à mão (state + nonce + PKCE, `id_token` conferido com as chaves públicas do Google, exige `hd === 'absgroup.com.br'` **e** e-mail do domínio verificado). Rotas: `/api/auth/google` (início) e `/api/auth/callback` (retorno). [lib/session.ts](lib/session.ts): cookies assinados com HMAC (`mh_sessao` = sessão com e-mail, nome e foto do Google (`fotoSegura` só aceita `*.googleusercontent.com`), 7 dias; o layout logado passa esses dados ao perfil no rodapé do `Sidebar`, acima do botão Sair; `mh_oauth` = dados do fluxo, 10 min, path `/api/auth`) e `destinoSeguro` (anti open redirect). [middleware.ts](middleware.ts) bloqueia tudo, exceto `/login`, `/api/auth/*` e estáticos. Não relaxe nenhuma dessas checagens.
- **Papéis, bloqueio e registros.** [lib/db.ts](lib/db.ts) (só servidor, usuário `hub_site`; grava só em `acessos`, `usuarios` e `usuarios_log`). Papéis em [lib/session.ts](lib/session.ts): `owner > admin > editor > leitor`; quem não está em `usuarios` entra como `leitor`. [lib/acesso.ts](lib/acesso.ts) `usuarioAtual()` confere no banco **a cada página** (layout de `(app)` e tela inicial): bloqueado é mandado para `/api/auth/saida` (apaga a sessão, grava `bloqueado`, vai para `/login?erro=bloqueado`) e o papel vale na hora. Banco fora do ar: segue com o papel do cookie. Use `usuarioAtual()` + `pode(s.papel, 'admin')` para restringir; nunca confie só no cookie. `acessos.resultado`: `ok` (entrou), `saida` (botão Sair), `bloqueado` ou código de erro do login. Regras da tela Usuários ([app/(app)/usuarios/acoes.ts](app/(app)/usuarios/acoes.ts), Server Actions): só owner/admin; ninguém altera a si mesmo; só owner dá ou mexe em owner; não há exclusão (tirar acesso = bloquear). Cada mudança vai para `usuarios_log`. Hoje: owner `marketing@`, admin `luis.eduardo@`.
- `app/(hub)/page.tsx`: tela inicial do hub (`/`, para onde o login leva). Sem menu lateral, barra no topo com busca (vai para `/posts?busca=`) e menu da conta. Cartões de cada módulo; textos que ainda não vêm de coleta (sites, avisos, coletas) ficam em [lib/modulos.ts](lib/modulos.ts). Se a API falhar, a tela abre igual e só o cartão do Instagram mostra "Sem conexão".
- `app/(app)/`: telas com menu lateral (item "Início" volta ao hub). `instagram/page.tsx` (Visão geral do Instagram), `posts/page.tsx` (lista + painel lateral via `?sel=`), `posts/[id]/page.tsx`, `stories/page.tsx` (lista + painel via `?sel=`), `conta/page.tsx`, `calendario/page.tsx` (placeholder "em breve"), `usuarios/page.tsx` e `acessos/page.tsx` (Administração, só owner/admin: a página confere o papel antes de consultar; o grupo "Administração" no menu lateral e o botão "Administração" no menu da conta do hub só aparecem para eles).
- [app/api/thumb/[id]/route.ts](app/api/thumb/[id]/route.ts): pede URL nova da miniatura e redireciona (302).
- `components/`: `Strip` (faixa de KPIs), `Bars` (barras), `Thumb` (client, com fallback), `MonthSelect`, `Sidebar` (client), `ErroApi`.
- [app/globals.css](app/globals.css): um único CSS global com tokens em `:root` (`--bg`, `--text`, `--accent`, `--up`, `--down`...). Sem CSS modules nem CSS-in-JS. Fonte do sistema (SF), base 13px, números com `.num` (tabular).

## Convenções

- **Nomes em português** (variáveis, funções, rótulos, comentários): `rotulo`, `valor`, `mesAtual`, `ErroApi`. Siga isso.
- Páginas são **Server Components** `async`. `searchParams` é `Promise` (Next 15): `const sp = await searchParams`. Valide parâmetros de URL com regex ou lista permitida antes de usar.
- Padrão de carga em toda página:
  ```tsx
  let o: Overview;
  try { o = await hub.overview(mes); } catch (e) { return <ErroApi mensagem={(e as Error).message} />; }
  ```
- Cada página exporta `metadata = { title: 'Nome · Marketing HUB' }`.
- Filtros e estado da tela ficam na URL (query string), não em estado React.
- `'use client'` só quando há interação (hoje: `Sidebar`, `Thumb`, `MonthSelect`).
- Comentários são poucos e curtos, explicando o porquê.
- O site é privado: `noindex` e cabeçalhos de segurança em [next.config.mjs](next.config.mjs). Mantenha.

## Segurança das versões

Next 15.3.3 tinha falha crítica de execução remota (CVE-2025-66478). Mantenha `next` na última 15.x corrigida (hoje 15.5.29) e rode `npm audit --omit=dev` antes de publicar. Os alertas restantes do `postcss` embutido no Next só afetam o build.

## Variáveis de ambiente

| Variável | Observação |
|---|---|
| `HUB_API_URL` | `https://n8n.absgroup.com.br/webhook/hub-api` |
| `HUB_API_KEY` | Igual ao valor da credencial "X-Hub-Key" no n8n. **A chave atual contém um `"`**, por isso no `.env.local` está entre aspas simples (`HUB_API_KEY='...'`); sem elas o Next lê outro valor e a API responde 403. No servidor, se as variáveis ficarem num arquivo `.env`, mantenha as aspas simples; se forem cadastradas no painel/serviço (systemd, PM2, Docker), cole **sem** as aspas. O ideal é trocar por uma chave só alfanumérica (`openssl rand -hex 32`) nos dois lados |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Cliente OAuth "Aplicativo da Web" no Google Cloud (tela de consentimento **Interna**). URIs de retorno cadastradas: `http://localhost:3000/api/auth/callback` e `https://marketinghub.contadorceo.com.br/api/auth/callback`. Sem elas a tela de login avisa "não configurado". Passo a passo no README |
| `AUTH_SECRET` | Mínimo 32 caracteres (`openssl rand -hex 32`). Trocar desconecta todo mundo |
| `APP_URL` | Endereço público (`https://marketinghub.contadorceo.com.br`). Monta o endereço de retorno do Google e os redirecionamentos do login. Vazio = endereço do pedido (ok em `localhost`) |
| `HUB_MOCK` | `1` = dados de exemplo; `0` = dados reais (estado atual) |
| `HUB_FONTE` | Vazio = Postgres (padrão). `n8n` = volta a ler pela API do hub (plano B, sem mexer no código) |
| `DATABASE_URL` | Postgres (Neon, projeto `marketing-hub`, região São Paulo, database `neondb`), usuário `hub_site` via pooler: lê tudo, só grava em `acessos`. É a única do banco que vai para o servidor do site |
| `DATABASE_URL_COLETA` | Usuário `hub_coleta` (conexão direta, sem `-pooler`): lê/grava/apaga linhas. Usado na credencial Postgres do n8n |
| `DATABASE_URL_ADMIN` | Dono do banco (`neondb_owner`). Só local, para criar/alterar tabelas. Nunca no servidor do site |

## Migração para Postgres (em andamento, desde 06/11/2026)

Motivo: as Data Tables do n8n têm limite de espaço (~50 MB no total por padrão) e o projeto vai crescer. Banco de teste no Neon; o definitivo será criado pela equipe de hospedagem. Estrutura em [db/schema.sql](db/schema.sql) (idempotente; tabelas `posts`, `metricas_snapshots`, `contas_diario`, `stories`, `sync_log`, `acessos`). `pg` foi adicionado como dependência com aprovação do usuário.

Credencial n8n: "Postgres Marketing HUB" (`Soe3OA7UtlouR8TO`, usuário `hub_coleta`). Fluxo de cópia: [HUB] Migração para Postgres (`IYF1Qo55V25KmadM`, manual, pode rodar de novo sem duplicar).

Etapas: 1) estrutura e usuários ✅ 2) copiar dados das Data Tables ✅ (06/11/2026) 3) fluxos gravam nos dois lugares ✅ publicado em 06/11/2026: nos 3 fluxos de coleta, um nó "Gravar no Postgres" (executeOnce, onError=continuar) sai em paralelo do nó "Montar linha(s)" e faz upsert + histórico + sync_log numa única query (JSON em base64 → `jsonb_to_recordset`); os nós das Data Tables não mudaram 4) site lê do Postgres ✅ no código (06/11/2026; falta publicar no servidor próprio com `DATABASE_URL`) 5) desligar as Data Tables.

## Diagnóstico rápido

Testar a API sem expor a chave:

```bash
K="$(node -e 'require("@next/env").loadEnvConfig(process.cwd());process.stdout.write(process.env.HUB_API_KEY)')"
curl -s -w "\nHTTP %{http_code}\n" -H "X-Hub-Key: $K" "https://n8n.absgroup.com.br/webhook/hub-api?recurso=overview" | tail -c 400
```

- **404 "webhook not registered"**: o fluxo [HUB] API do hub está desativado.
- **403**: chave diferente entre o site e a credencial do n8n (ou o problema das aspas acima).
- **Dados velhos**: veja HUB_SYNC_LOG e as execuções do fluxo de posts.
- **Testar páginas logadas via curl**: não há mais senha. Gere um cookie de teste com a própria `AUTH_SECRET` (sem imprimi-la) usando `criarSessao` de `lib/session.ts` e mande em `-b "mh_sessao=..."`.
- **Login volta com `?erro=`**: `dominio` (conta fora do Workspace), `expirou` (state/nonce, cookie `mh_oauth` sumiu ou passou de 10 min), `cancelado`, `config` (faltam variáveis do Google), `falha` (veja o log do servidor: `[login] recusado (...)`; `invalid_client` = ID/segredo errados). Erro `redirect_uri_mismatch` na própria tela do Google = URI de retorno não cadastrada no cliente OAuth.

## Publicação

O destino é um **servidor próprio** (decisão de 06/11/2026; não é mais a Vercel), cuidado pela equipe de hospedagem contratada, com o domínio final `marketinghub.contadorceo.com.br` (o site fica nesse domínio, mas o login continua aceitando só e-mails @absgroup.com.br). Repositório git **privado**: https://github.com/brluisceo/marketing-hub (branch `main`, primeiro envio em 06/11/2026). O `.gitignore` exclui qualquer `.env*` (menos `.env.example`): confira com `git diff --cached --name-only` antes de cada commit. Passos no [README.md](README.md). Commit, push e deploy só quando o usuário pedir. O [README.md](README.md) ainda descreve a Vercel; reescrever a seção de publicação quando for publicar.

No servidor: Node 20+, `npm ci && npm run build && npm start` mantido por um gerenciador de processos (systemd ou PM2), atrás de um proxy reverso (nginx/Caddy) com HTTPS. O proxy precisa **sobrescrever** `X-Forwarded-For` com o IP real (o registro de `acessos` usa esse cabeçalho) e repassar o `Host`. `APP_URL` obrigatório. Como o servidor tem IP fixo, o banco definitivo pode aceitar conexões só desse IP e do n8n.

## Pendências conhecidas

- **Impulsionamentos:** integrar a Marketing API (anúncios ligados ao post por `creative.effective_instagram_media_id`, métricas por `insights?level=ad`) numa tabela nova (ex.: HUB_ANUNCIOS) e mostrar orgânico + pago. A credencial atual "Meta Insights Hub." é Facebook Graph API; verificar se o token tem `ads_read`.
- **Quase tempo real:** coleta de 1–5 min só para posts recentes e cache menor no site. Cuidado com o limite de chamadas da Meta e com o crescimento de HUB_METRICAS_SNAPSHOTS.
- **Visualizações do perfil por período** (bate com o app), a partir de HUB_CONTAS_DIARIO. Precisa de histórico; avaliar preencher dias passados via API.
- **Calendário e aprovação:** tela ainda é placeholder.
- **Miniatura de Stories antigos:** testada só com Story no ar. Depois das 24 h a Meta pode não devolver a imagem; nesse caso a tela mostra o quadro vazio (fallback do `Thumb`).
