# Marketing HUB

Central de métricas do Instagram @rogerio.fameli. Lê os dados coletados pelo n8n (tabelas HUB_) através do fluxo **[HUB] API do hub**.

Telas desta versão: Início (o hub, com todos os módulos do marketing), Instagram (Visão geral, Posts, Detalhe do post, Stories e Conta). Tráfego pago, Sites no ar, Calendário e aprovação e Entregáveis aparecem como "em breve" / "em implantação".

## Como funciona

```
Instagram (API da Meta) → n8n (coleta a cada 30 min e diária) → tabelas HUB_ no n8n
                                                                    ↓
                    Marketing HUB (este site) ← [HUB] API do hub (protegida por chave)
```

- O token da Meta fica só no n8n. O site nunca vê esse token.
- O site conversa com a API do hub pelo servidor, usando a chave `HUB_API_KEY`. Ela não aparece no navegador.
- O acesso ao site é só por **login com Google**, e só entram contas do Google Workspace **@absgroup.com.br**. A checagem do domínio é feita no servidor, não depende da tela do Google.
- As miniaturas dos posts são buscadas na hora pela rota `/api/thumb/[id]`, porque os links de imagem do Instagram expiram.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (para rodar no computador) ou cadastre na hospedagem:

| Variável | O que é |
|---|---|
| `HUB_API_URL` | Endereço de produção do webhook: `https://n8n.absgroup.com.br/webhook/hub-api` |
| `HUB_API_KEY` | A mesma senha cadastrada na credencial **Hub API Key** do n8n (header `X-Hub-Key`) |
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth criado no Google Cloud (veja "Configurar o login com Google") |
| `GOOGLE_CLIENT_SECRET` | Chave secreta desse mesmo cliente OAuth |
| `APP_URL` | Endereço público do site, ex.: `https://marketinghub.contadorceo.com.br`. Na Vercel, preencha. No computador, pode deixar vazio |
| `AUTH_SECRET` | Texto aleatório e longo (mínimo 32 caracteres) para assinar a sessão. Gere com `openssl rand -hex 32`. Trocar este valor desconecta todo mundo |
| `HUB_MOCK` | `1` para usar dados de exemplo sem conectar ao n8n |

## Rodar no computador

Requer Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev                  # abre em http://localhost:3000
```

Para ver o visual sem o n8n, use `HUB_MOCK=1` no `.env.local`.

## Publicar na Vercel (recomendado)

1. Suba esta pasta para um repositório privado no GitHub.
2. Em vercel.com, clique em **Add New > Project** e importe o repositório. A Vercel detecta o Next.js sozinha.
3. Em **Environment Variables**, cadastre `HUB_API_URL`, `HUB_API_KEY`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `APP_URL` (deixe `HUB_MOCK` vazio ou `0`).
4. Clique em **Deploy**.
5. Em **Settings > Domains**, adicione o domínio (ex.: `marketinghub.contadorceo.com.br`) e crie no DNS o registro CNAME que a Vercel indicar.

Também roda em qualquer servidor com Node.js: `npm run build` e depois `npm start`.

## Configurar o login com Google

Feito uma vez, por quem administra o Google Workspace da ABS Group.

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) com uma conta @absgroup.com.br e crie (ou escolha) um projeto, por exemplo "Marketing HUB".
2. Em **APIs e serviços > Tela de consentimento OAuth** (ou **Google Auth Platform > Público-alvo**), escolha o tipo **Interno**. Assim o próprio Google já recusa contas de fora da organização. O site confere o domínio de novo por conta própria.
3. Preencha nome do app ("Marketing HUB") e e-mail de suporte. Os escopos são os básicos: `openid`, `email` e `profile`.
4. Em **Credenciais > Criar credenciais > ID do cliente OAuth**, tipo **Aplicativo da Web**.
5. Em **URIs de redirecionamento autorizados**, adicione os endereços exatos (sem barra no final):
   - `http://localhost:3000/api/auth/callback` (para testar no computador; se usar outra porta, como 3001, cadastre também `http://localhost:3001/api/auth/callback`)
   - `https://marketinghub.contadorceo.com.br/api/auth/callback` (produção)
   - Com `APP_URL` preenchido, o login sempre volta para esse endereço. Acesse o site por ele (não pelo `...vercel.app`)
6. Copie o **ID do cliente** para `GOOGLE_CLIENT_ID` e a **Chave secreta do cliente** para `GOOGLE_CLIENT_SECRET` (no `.env.local` e na Vercel).

Como funciona por dentro: o site manda a pessoa para o Google com proteções contra falsificação (`state`, `nonce` e PKCE), recebe de volta um código, troca esse código por um token direto com o Google, confere a assinatura do token com as chaves públicas do Google e só cria a sessão se a conta for do Workspace `absgroup.com.br` (campo `hd`) **e** o e-mail terminar em `@absgroup.com.br` e estiver verificado. A sessão dura 7 dias. Quem sair da empresa perde o acesso em no máximo 7 dias, ou na hora se `AUTH_SECRET` for trocado.

## Antes de publicar: ativar a API no n8n

1. No n8n, crie a credencial **Header Auth** com nome `X-Hub-Key`, um valor longo e aleatório, e salve como **Hub API Key**.
2. No fluxo **[HUB] API do hub**, troque a credencial do nó Webhook para **Hub API Key** e ative (publique) o fluxo.
3. Use o mesmo valor em `HUB_API_KEY`.

## Estrutura

- `app/(hub)/` — tela inicial do hub (`/`)
- `app/(app)/` — telas com menu lateral (instagram, posts, detalhe, stories, conta, calendário)
- `lib/modulos.ts` — textos da tela inicial (sites, avisos, coletas)
- `app/login`, `app/api/auth/google`, `app/api/auth/callback`, `app/api/logout` — login com Google
- `lib/session.ts` (sessão assinada) e `lib/google.ts` (protocolo do Google)
- `app/api/thumb/[id]` — miniatura atualizada do post
- `lib/hub.ts` — chamadas à API do hub
- `lib/mock.ts` — dados de exemplo (retrato real de outubro/2026)
- `middleware.ts` — bloqueia as telas para quem não entrou com uma conta @absgroup.com.br
