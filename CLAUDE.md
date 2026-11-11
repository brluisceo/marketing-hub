# Marketing HUB

**Hub interno do marketing do Grupo ABS**: um só lugar para o time de marketing, o comercial e quem mais acessar ver o que o marketing está fazendo. Módulos: Instagram **@rogerio.fameli** e calendário e aprovação (os já ligados), tráfego pago (Meta Ads e funil), sites no ar, entregáveis da equipe. A tela inicial (`/`) mostra todos os módulos; cada um ganha suas telas próprias conforme for ligado. Next.js 15.5 (App Router), React 19.1, TypeScript estrito, **sem nenhuma outra dependência** (exceto `pg`, ver migração). O site só lê os dados do Instagram (quem coleta é o n8n); grava apenas o que as pessoas fazem nele (login, usuários, calendário).

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
API da Meta (Graph v25) → n8n (coleta) → Postgres (Optimus Cloud) → lib/dados.ts → lib/hub.ts → páginas
(desde 09/11/2026 o n8n grava **só** no Postgres; as Data Tables HUB_* ficaram congeladas como arquivo. A API do hub no n8n continua no ar só por causa das miniaturas)
```

### n8n — https://n8n.absgroup.com.br, projeto "Marketing ABS Group"

| Fluxo | ID | O que faz |
|---|---|---|
| [HUB] Instagram — posts e métricas | `FWJQdOfb55MQIa9r` | A cada 5 min desde 09/11/2026 (posts dos últimos 14 dias; antes era 30 min); diário às 6h (90 dias, grava histórico em snapshots); carga inicial manual (365 dias) |
| [HUB] Instagram — conta diária | `WmeA57lkpnF2Rday` | 1x por dia grava seguidores, alcance, visualizações e visitas do **dia anterior** |
| [HUB] Instagram — stories | `YMWwbscNHSLv1GZ0` | A cada 5 min (desde 09/11/2026; antes 15 min) busca os Stories no ar (`/stories`) e grava métricas e navegação. A lista pede só `id,media_type,timestamp,permalink` com `limit=25`: desde 08/11/2026 a Meta recusa o pedido com campos de mídia (`media_url`/`thumbnail_url`) com o erro "Please reduce the amount of data" (o site busca a miniatura à parte pelo id, então `stories.thumbnail_url` fica vazio). A Meta só entrega Stories durante as 24 h no ar: sem histórico anterior a 05/11/2026 |
| [HUB] Avisos de erro | `cnJM9Py2NxmZdPWP` | Error workflow dos 3 fluxos de coleta (Settings > Error workflow). Avisa no Slack **#marketing-hub-aviso** (`C0CG6SWRCBT`, privado; credencial "[MARKETING] Slack", robô n8n-integration), no máximo 1 aviso por hora para o mesmo erro do mesmo fluxo (memória em static data). Botão "Testar aviso" manda uma mensagem de exemplo |
| [HUB] API do hub | `QwHEHvXcqUP3G3F2` | Webhook `GET /webhook/hub-api`, protegido por Header Auth (credencial "X-Hub-Key"). Fuso `America/Sao_Paulo` |

O MCP do n8n está disponível neste ambiente (`mcp__claude_ai_n8n__*`): use `get_workflow_details` para ler a lógica real antes de supor algo.

### Tabelas antigas (n8n Data Tables) — congeladas desde 09/11/2026

Ninguém grava mais nelas (os fluxos só gravam no Postgres). Os dados ficam como arquivo; podem ser apagadas quando o usuário quiser. As tabelas vivas estão no Postgres com os mesmos nomes sem `HUB_` (`posts`, `metricas_snapshots`, `contas_diario`, `stories`, `sync_log`), ver [db/schema.sql](db/schema.sql).

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

- **Os números são orgânicos.** A API de insights da Meta não inclui o que veio de impulsionamento/anúncio (a documentação diz isso explicitamente para `views`, `likes`, `comments` e `total_interactions`). Um Reel impulsionado pode mostrar 2 mil no hub e 261 mil no app. As métricas `total_views`, `total_likes` e `total_comments` (mesmo endpoint `/insights`) **incluem** o pago e funcionam com o token atual (testado em 09/11/2026); o hub ainda não as coleta. Alcance pago só pela Marketing API (`ads_read`, o token já tem).
- **Posts virais não foram impulsionados** (conferido em 09/11/2026 comparando `views` x `total_views` nos 12 posts com mais de 100 mil de alcance): o Reel de 28/02 (1,86 mi), o de 24/03 (1,6 mi) e os demais deram orgânico = total. Só dois carrosséis de janeiro (19/01 e 26/01) tiveram ~4% a mais no total, seja de anúncio pequeno ou de exibição no Facebook (a Meta descreve o total como "em todas as plataformas").
- **KPIs do mês = soma dos posts publicados naquele mês** (por `mes_ref`), com as visualizações acumuladas de cada post até hoje. O painel do Instagram soma tudo o que foi visto no período (inclui stories e posts antigos). Os dois números não batem, e isso é esperado.
- O total da conta por período (o que bate com o app) vem de HUB_CONTAS_DIARIO. Hoje aparece só na tela Conta.
- **Velocidade do site (11/11/2026):** o banco da Optimus fica a ~140 ms de cada consulta a partir do Mac (ping ~150 ms) e abrir uma conexão nova (TLS) custa ~1 s. Por isso: um só grupo de conexões para o site inteiro ([lib/db.ts](lib/db.ts) `banco()`, em `globalThis`, até 8 conexões, abertas 5 min sem uso; [lib/dados.ts](lib/dados.ts) usa o mesmo); consultas de uma tela vão juntas num `Promise.all` (nunca uma depois da outra); cada gravação do calendário é um comando só (CTE com o histórico junto). Assim o calendário responde em ~0,2 s por tela e ~0,6 s do clique à tela nova (modo dev). Antes eram 0,5–1,6 s por tela e 1 s a mais depois de 10 s parado.
- Atraso: coleta a cada 5 min no n8n + cache de 60 s no site (`revalidate` em [lib/hub.ts](lib/hub.ts)) + atraso próprio da Meta.

## Estrutura do código

- [lib/hub.ts](lib/hub.ts): único ponto de entrada dos dados. `hub.overview/posts/post/conta/stories` leem o Postgres via [lib/dados.ts](lib/dados.ts) (cache de 60 s com `unstable_cache`) quando há `DATABASE_URL`; `HUB_FONTE=n8n` volta para a API do hub, mas ela lê as Data Tables congeladas: **não serve mais como plano B** (mostraria dados parados em 09/11/2026). `hub.thumb` continua na API do n8n (precisa do token da Meta). `modoDemo` = `HUB_MOCK=1` ou sem banco e sem `HUB_API_URL`.
- [lib/dados.ts](lib/dados.ts): reproduz a lógica dos nós de código do fluxo [HUB] API do hub (mesmo formato de resposta, mesmas datas ISO). Validado em 06/11/2026 comparando as duas fontes (30 casos; diferenças só na ordem de empates, que agora desempatam pelo post mais recente). Se mudar um cálculo, mude aqui (e no fluxo, enquanto ele for plano B).
- [lib/mock.ts](lib/mock.ts): dados de exemplo (retrato de out/2026). `thumb` não existe no mock, então miniaturas não aparecem no modo demonstração.
- [lib/format.ts](lib/format.ts): **toda** formatação de número, %, data e mês (pt-BR, fuso `America/Sao_Paulo`): `num`, `compacto`, `pct`, `deltaPct`, `deltaPp`, `nomeMes`, `dataCurta`, `haQuanto`... Reuse; não formate na página.
- **Login só com Google, só contas @absgroup.com.br.** [lib/google.ts](lib/google.ts): OpenID Connect feito à mão (state + nonce + PKCE, `id_token` conferido com as chaves públicas do Google, exige `hd === 'absgroup.com.br'` **e** e-mail do domínio verificado). Rotas: `/api/auth/google` (início) e `/api/auth/callback` (retorno). [lib/session.ts](lib/session.ts): cookies assinados com HMAC (`mh_sessao` = sessão com e-mail, nome e foto do Google (`fotoSegura` só aceita `*.googleusercontent.com`), 7 dias; o layout logado passa esses dados ao perfil no rodapé do `Sidebar`, acima do botão Sair; `mh_oauth` = dados do fluxo, 10 min, path `/api/auth`) e `destinoSeguro` (anti open redirect). [middleware.ts](middleware.ts) bloqueia tudo, exceto `/login`, `/api/auth/*` e estáticos (inclui `manifest.webmanifest`, `apple-touch-icon` e `icons/` do app instalável). Não relaxe nenhuma dessas checagens.
- **Papéis, bloqueio e registros.** [lib/db.ts](lib/db.ts) (só servidor, usuário `hub_site`; grava só em `acessos`, `usuarios`, `usuarios_log` e nas tabelas do calendário). Papéis em [lib/session.ts](lib/session.ts): `owner > admin > editor > leitor`; quem não está em `usuarios` entra como `leitor`. [lib/acesso.ts](lib/acesso.ts) `usuarioAtual()` confere no banco **a cada página** (layout de `(app)` e tela inicial): bloqueado é mandado para `/api/auth/saida` (apaga a sessão, grava `bloqueado`, vai para `/login?erro=bloqueado`) e o papel vale na hora. Banco fora do ar: segue com o papel do cookie. Use `usuarioAtual()` + `pode(s.papel, 'admin')` para restringir; nunca confie só no cookie. `acessos.resultado`: `ok` (entrou), `saida` (botão Sair), `bloqueado` ou código de erro do login. Regras da tela Usuários ([app/(app)/admin/usuarios/acoes.ts](app/(app)/admin/usuarios/acoes.ts), Server Actions): só owner/admin; ninguém altera a si mesmo; só owner dá ou mexe em owner; não há exclusão (tirar acesso = bloquear). Cada mudança vai para `usuarios_log`. Hoje: owner `marketing@`, admin `luis.eduardo@`.
- `app/(hub)/page.tsx`: tela inicial do hub (`/`, para onde o login leva). Sem menu lateral, barra no topo com busca (vai para `/instagram/posts?busca=`) e menu da conta. Cartões de cada módulo; textos que ainda não vêm de coleta (sites, avisos, coletas) ficam em [lib/modulos.ts](lib/modulos.ts). Se a API falhar, a tela abre igual e só o cartão do Instagram mostra "Sem conexão".
- `app/(app)/`: telas com menu lateral (item "Início" volta ao hub). **Cada módulo tem sua pasta e todas as telas dele ficam dentro dela** (`/instagram/posts`, nunca `/posts`): assim cabem outras redes e módulos sem conflito de endereço (ex.: `/trafego/...`). `instagram/page.tsx` (Visão geral do Instagram), `instagram/posts/page.tsx` (lista + painel lateral via `?sel=`), `instagram/posts/[id]/page.tsx`, `instagram/stories/page.tsx` (lista + painel via `?sel=`), `instagram/conta/page.tsx`, `instagram/sobre/page.tsx` ("Sobre os dados": quando cada coisa atualiza, orgânico x app, glossário; **se mudar a frequência de uma coleta, atualize `ATUALIZACOES` ali e `COLETAS` em [lib/modulos.ts](lib/modulos.ts)**), `calendario/` (Calendário e aprovação, ver abaixo), `admin/usuarios/page.tsx` e `admin/acessos/page.tsx` (Administração, só owner/admin: a página confere o papel antes de consultar; o grupo "Administração" no menu lateral e o botão "Administração" no menu da conta do hub só aparecem para eles). Os endereços antigos (`/posts`, `/stories`, `/conta`, `/sobre`, `/usuarios`, `/acessos`) redirecionam para os novos em `redirects()` de [next.config.mjs](next.config.mjs). O `Sidebar` mostra só o grupo do módulo atual (primeiro trecho do endereço: `instagram`, `calendario`, `admin`), mais "Início"; ao criar um módulo novo, acrescente o grupo dele ali. No `Sidebar`, a visão geral de um módulo usa `exato` para não acender junto com as telas dele.
- **Calendário e aprovação** (`/calendario`, desde 11/11/2026). Tabelas `calendario_posts` (1 linha por post planejado: título, formato, dia, hora, legenda, link da arte no Google Drive, observações, `etapa`) e `calendario_historico` (cada ação e comentário, com autor). Lógica e regras em [lib/calendario.ts](lib/calendario.ts); botões são Server Actions em [app/(app)/calendario/acoes.ts](app/(app)/calendario/acoes.ts), que conferem a permissão de novo no banco (`acoesPermitidas`) e só gravam se a etapa não mudou desde a leitura (senão `msg=mudou`). Etapas: `rascunho → em_aprovacao → aprovado → publicado`, com `ajustes` (volta para quem criou, comentário obrigatório) e `cancelado` (= "Excluir": some da tela, histórico fica; não há DELETE). **Quem pode:** qualquer pessoa logada (até Leitor) cria, edita e envia o próprio post; só owner/admin aprovam, pedem ajustes e mexem em post já aprovado; autor ou owner/admin marcam como publicado; todos comentam. Telas: `?ver=` vazio = grade do mês (segunda a domingo; em bloco < 500 px vira lista só com os dias que têm post), `?ver=quadro` = kanban por etapa; `?sel=` abre o post no painel lateral (aprovar, pedir ajustes, histórico); `?novo=yyyy-mm-dd` e `?editar=id` abrem a **janela no estilo Notion** (pedido do usuário em 11/11/2026: `JanelaPost` em [partes.tsx](app/(app)/calendario/partes.tsx)), por cima de tudo com o fundo escurecido: título grande, propriedades em linhas (Data, Formato, Etapa, Arte, Observações, Criado por), Comentários (o que for escrito ali vai para o histórico ao salvar) e a legenda como corpo da página; botões Salvar rascunho / Enviar para aprovação no topo. Clicar fora não fecha (não há salvamento automático); no celular ocupa a tela toda. Sem post aberto, o painel mostra a fila de aprovação de todos os meses (só na grade; abaixo de 1280 px ele desce para baixo do calendário). Nomes das pessoas vêm do último login em `acessos`.
- **App instalável (PWA, desde 11/11/2026):** o site pode ir para a tela inicial do celular ou para o Dock e abre em janela própria, sempre com os dados do site (não há instalador nem loja). [app/manifest.ts](app/manifest.ts) (nome, cores, ícones), ícones em `public/icons/` e [public/apple-touch-icon.png](public/apple-touch-icon.png) (o "M" azul do login, gerados com o Chrome headless em 1024 px e reduzidos com `sips`), `appleWebApp` em [app/layout.tsx](app/layout.tsx) (sem ele o iPhone dá ao ícone o título da página). Na tela de login, só no celular (decidido no servidor pelo user-agent, para a tela não pular), aparece o convite `InstalarApp` (pedido do usuário em 11/11/2026): no iPhone, instruções (⋯/Compartilhar > Adicionar à Tela de Início); no Android, botão "Instalar" quando o Chrome libera (`beforeinstallprompt`), senão instruções do menu ⋮. Some dentro do app instalado. Sem service worker (não funciona offline). No iPhone o app tem cookies próprios: a pessoa entra com o Google uma vez dentro dele. Ainda não testado em aparelho de verdade (só simulado). Próximo passo possível: notificações (exigem service worker).
- [app/api/thumb/[id]/route.ts](app/api/thumb/[id]/route.ts): pede URL nova da miniatura e redireciona (302).
- `components/`: `Strip` (faixa de KPIs), `Bars` (barras), `Thumb` (client, com fallback), `MonthSelect`, `Sidebar` (client), `ErroApi`, `Atualizacao` (client: faixa "Dados atualizados há X min · próxima atualização em Y min" só no topo das telas do Instagram, via `app/(app)/instagram/layout.tsx` (pedido do usuário em 11/11/2026: não aparece no calendário, na administração nem na tela inicial); horário = `hub.ultimaColeta()`, último `sync_log` ok de posts/Stories, sem cache; próxima = última + 5 min; passou da hora, chama `router.refresh()`; >15 min sem coleta = ponto laranja "a coleta está atrasada"). `Aviso` (client: mensagem depois de uma ação, flutuando no topo sem empurrar a tela; some em 4 s (erro: 8 s, pausa com o mouse em cima), tem X e tira o `?msg=` do endereço para não voltar ao recarregar. Pedido do usuário em 11/11/2026; hoje só no calendário, a tela Usuários ainda usa a faixa `.notice`).
- [app/globals.css](app/globals.css): um único CSS global com tokens em `:root` (`--bg`, `--text`, `--accent`, `--up`, `--down`...). Sem CSS modules nem CSS-in-JS. Fonte do sistema (SF), base 13px, números com `.num` (tabular).
- **Responsivo** (bloco "Telas menores" no fim do [globals.css](app/globals.css)): ≥ 1000 px menu lateral fixo; < 1000 px barra no topo com botão "Menu" que abre o `Sidebar` como gaveta; < 760 px o painel lateral (`.aside`) vai para baixo e, em Posts/Stories (`.aside-sel`), só abre por cima da lista quando há `?sel=` na URL (com botão "Fechar"). Tabelas e gráficos usam container queries (largura do próprio bloco): colunas com `so-largo`/`so-medio` somem quando falta espaço, `table-cartoes` vira cartões com `data-rotulo` em cada `td`, e `Bars` com valores deita as barras. Em tela de toque, campos com 16 px (o iPhone não dá zoom). Ao criar tela nova, confira em 390, 768, 1024 e 1440 px.

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
- **Campos de formulário nunca se chamam `id`, `action`, `method`, `name`, `target`, `elements`, `submit` ou `reset`**: o navegador troca a propriedade do `<form>` pelo campo e o React deixa de mandar qual botão foi clicado (bug real em 11/11/2026: "Enviar para aprovação" virava rascunho). Use nomes como `post`.
- `'use client'` só quando há interação (hoje: `Sidebar`, `Thumb`, `MonthSelect`, `Atualizacao`, `Aviso`, `InstalarApp`).
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
| `HUB_FONTE` | Vazio = Postgres (padrão, único com dados atuais). `n8n` = lê pela API do hub, que usa as Data Tables congeladas em 09/11/2026: não usar |
| `DATABASE_URL` | Postgres **oficial** da Optimus Cloud: `production-postgresql.cl25.absgroup.com.br`, **porta 5490** (a 5432 cai em outro serviço, com certificado de `cl1.joinsy.com.br`), database `marketing_hub`, `sslmode=verify-full` (TLS 1.3). Usuário `hub_site`: lê tudo, grava só em `acessos`, `usuarios`, `usuarios_log`, `calendario_posts` e `calendario_historico` (sem DELETE). É a única do banco que vai para o servidor do site |
| `DATABASE_URL_COLETA` | Usuário `hub_coleta` na Optimus: lê/grava/apaga nas 5 tabelas da coleta (sem acesso a `usuarios`/`usuarios_log`/`acessos`). É o da credencial Postgres do n8n |
| `DATABASE_URL_ADMIN` | `hub_admin` na Optimus, dono das tabelas (privilégio total). Só local, para criar/alterar tabelas. Nunca no servidor do site |
| `DATABASE_URL_NEON*` | Banco antigo (Neon, plano grátis), mantido como reserva desde 09/11/2026: `_NEON` (hub_site), `_NEON_ADMIN` (neondb_owner), `_NEON_COLETA`. Parou de receber dados; pode ser apagado depois de alguns dias sem problema. Cópia do `.env.local` antes da troca: `.env.local.bak-neon` |

## Migração para Postgres (em andamento, desde 06/11/2026)

Motivo: as Data Tables do n8n têm limite de espaço (~50 MB no total por padrão) e o projeto vai crescer. Começou no Neon (teste); desde 09/11/2026 o oficial é o da Optimus Cloud. Estrutura em [db/schema.sql](db/schema.sql) (idempotente; tabelas `posts`, `metricas_snapshots`, `contas_diario`, `stories`, `sync_log`, `acessos`). `pg` foi adicionado como dependência com aprovação do usuário.

Credencial n8n: "Postgres Marketing HUB" (`Soe3OA7UtlouR8TO`, usuário `hub_coleta`). Fluxo de cópia: [HUB] Migração para Postgres (`IYF1Qo55V25KmadM`, manual, pode rodar de novo sem duplicar).

**09/11/2026: banco oficial passou a ser o da Optimus Cloud.** Eles criaram as tabelas e os usuários `hub_admin`/`hub_site`/`hub_coleta` (estrutura conferida: idêntica ao Neon). Dados copiados do Neon com um script idempotente (`jsonb_populate_recordset` + `ON CONFLICT`, só sobrescreve quando o dado de origem é mais novo); totais e somas conferidos. A credencial do n8n "Postgres Marketing HUB" agora aponta para a Optimus (porta 5490, `hub_coleta`), testada com uma coleta de posts. O site publicado em marketinghub.contadorceo.com.br já usava esse banco desde 06/11. Mesmo dia: **Data Tables desligadas** (etapa 5): nos 3 fluxos de coleta foram removidos os nós de Data Table (e os nós de resumo/IF que só serviam a eles); "Gravar no Postgres" é a única gravação, com `onError=stopWorkflow` e até 3 tentativas (falha aparece como erro no n8n). Pendências: apagar o Neon depois de alguns dias, NTP do servidor do n8n (~8 min atrasado).

Etapas: 1) estrutura e usuários ✅ 2) copiar dados das Data Tables ✅ (06/11/2026) 3) fluxos gravam nos dois lugares ✅ (06/11/2026): nó "Gravar no Postgres" (executeOnce) depois de "Montar linha(s)" faz upsert + histórico + sync_log numa única query (JSON em base64 → `jsonb_to_recordset`) 4) site lê do Postgres ✅ (publicado pela Optimus) 5) desligar as Data Tables ✅ (09/11/2026).

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

- **Tráfego pago (outra pessoa implementa, desde 09/11/2026):** trabalho na branch `trafego-pago`, que entra na `main` só por Pull Request revisado. Guia para quem implementa: [docs/trafego-pago.md](docs/trafego-pago.md) (atualize junto se mudar algo que ele cita: arquivos, fluxos, variáveis). O repositório é de conta pessoal no plano gratuito, então a `main` não tem proteção automática: a regra é combinada.
- **Impulsionamentos:** integrar a Marketing API (anúncios ligados ao post por `creative.effective_instagram_media_id`, métricas por `insights?level=ad`) numa tabela nova (ex.: HUB_ANUNCIOS) e mostrar orgânico + pago. A credencial atual "Meta Insights Hub." é Facebook Graph API e o token tem `ads_read`. Caminho mais simples para começar: acrescentar `total_views,total_likes,total_comments` ao nó "Métricas do post" (só views/curtidas/comentários; alcance pago continua exigindo a Marketing API).
- **Quase tempo real:** feito em 09/11/2026: posts (14 dias) e Stories a cada 5 min, cache do site 60 s. Uso da cota da Meta medido antes (cabeçalho `X-Business-Use-Case-Usage`, ~140 chamadas/h): 1%; estimativa depois: ~5–7% (~660–950 chamadas/h). Snapshots continuam só 1x/dia (6h). Webhook `story_insights` (números finais do Story ao expirar) ficou pendente: o app da Meta "MARKETING HUB" está em modo desenvolvimento e a página Básico do painel não abria; o token não tem `pages_manage_metadata`.
- **Visualizações do perfil por período** (bate com o app), a partir de HUB_CONTAS_DIARIO. Precisa de histórico; avaliar preencher dias passados via API.
- **Calendário e aprovação, próximos passos** (fora da 1ª entrega a pedido do usuário, 11/11/2026): avisos no Slack (foi para aprovação, aprovado, ajustes), lembrete na hora de publicar, ligar o post planejado ao post publicado (para ver as métricas dele) e publicação automática (exige `instagram_content_publish` no app da Meta e a arte num link público). O cartão do hub ainda diz "receber o aviso para publicar pelo app", que não existe ainda.
- **Miniatura de Stories antigos:** testada só com Story no ar. Depois das 24 h a Meta pode não devolver a imagem; nesse caso a tela mostra o quadro vazio (fallback do `Thumb`).
