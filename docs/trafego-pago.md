# Módulo de tráfego pago: guia para quem vai implementar

O Marketing HUB é o painel interno do marketing do Grupo ABS. Hoje só o módulo do Instagram está ligado. O seu trabalho é o módulo **Tráfego pago**: o investimento no Meta Ads e o que ele virou no funil (leads, reuniões, vendas e retorno). Na tela inicial ele já aparece como um cartão "Em implantação".

**Leia primeiro o [CLAUDE.md](../CLAUDE.md).** Ele é o documento principal do projeto: arquitetura, regras e o significado de cada número. Se você usa o Claude Code, ele lê esse arquivo sozinho e segue as regras.

## Como trabalhar no repositório

- Trabalhe na branch **`trafego-pago`**. **Nunca grave direto na `main`**: ela é o que vai para o servidor do site.
- Quando uma parte estiver pronta, abra um **Pull Request** de `trafego-pago` para `main`. O responsável pelo hub revisa e junta. Prefira vários PRs pequenos a um grande no final.
- Traga para a sua branch o que mudou na `main` pelo menos uma vez por semana. Assim os conflitos ficam pequenos:
  ```bash
  git fetch origin && git merge origin/main
  ```
- Antes de cada PR, rode `npm run build`. É a checagem de tipos e lint do projeto (não há testes automatizados).
- Nunca envie arquivos `.env*` para o git. O `.gitignore` já bloqueia, mas confira com `git diff --cached --name-only` antes de cada commit.

## Rodar no computador

Precisa do Node 22.6 ou mais novo.

```bash
git clone https://github.com/brluisceo/marketing-hub.git
cd marketing-hub
git checkout trafego-pago
npm ci
cp .env.example .env.local
```

No `.env.local`, preencha pelo menos a `AUTH_SECRET` com um valor seu (`openssl rand -hex 32`). Depois rode `npm run dev` e abra http://localhost:3000.

### Login

O site inteiro exige login. Há duas formas de entrar no seu computador:

1. **Com o Google**, se você tem uma conta @absgroup.com.br: peça ao responsável o `GOOGLE_CLIENT_ID` e o `GOOGLE_CLIENT_SECRET`. Funciona só na porta 3000, a única cadastrada no Google.
2. **Sem o Google:** gere um cookie de sessão assinado com a **sua** `AUTH_SECRET`. Ele só vale no seu computador.
   ```bash
   node --experimental-strip-types --no-warnings --input-type=module -e '
   import env from "@next/env"; env.loadEnvConfig(process.cwd());
   const { criarSessao } = await import("./lib/session.ts");
   console.log((await criarSessao("dev@absgroup.com.br", "Dev")).valor);'
   ```
   No navegador, abra http://localhost:3000/login e depois as ferramentas de desenvolvedor (Application > Cookies > localhost). Crie um cookie `mh_sessao` com o valor impresso e recarregue a página. O e-mail precisa terminar em `@absgroup.com.br`, mas não precisa existir.

### Dados

- **Sem banco (`HUB_MOCK=1`, padrão do `.env.example`):** as telas do Instagram abrem com dados de exemplo ([lib/mock.ts](../lib/mock.ts)). Comece por aqui. O módulo novo também deve funcionar nesse modo, com os dados de exemplo dele.
- **Com o banco real:** peça ao responsável uma `DATABASE_URL` de leitura e troque para `HUB_MOCK=0`.

## Como o módulo deve ser montado

O caminho dos dados é o mesmo do Instagram. O site **só lê**: quem coleta tudo é o n8n.

```
API da Meta (Marketing API) ─┐
CRM / funil (a definir)     ─┴→ n8n (coleta) → Postgres → lib/ → páginas
```

### 1. Antes de começar

Peça ao responsável o **kit de implantação do tráfego pago**. Ele tem as perguntas que a gestão precisa responder antes de ligar a coleta: de onde vêm leads, reuniões e vendas, quais metas acompanhar e o que conta como "retorno".

### 2. Coleta no n8n

- Fica em https://n8n.absgroup.com.br, no projeto "Marketing ABS Group". O responsável te dá o acesso.
- Crie fluxos novos com nomes no padrão `[HUB] Meta Ads — ...`. **Não altere os fluxos do Instagram** nem os outros fluxos `[HUB]`. O n8n é produção: combine com o responsável antes de ativar qualquer fluxo.
- Em cada fluxo novo, configure **Settings > Error workflow = "[HUB] Avisos de erro"**. Assim as falhas avisam no Slack.
- A Meta não inclui os anúncios nas métricas orgânicas que o hub já coleta. Para eles é preciso a Marketing API, com um token com a permissão `ads_read`: confira se o token atual tem essa permissão. O anúncio se liga ao post do Instagram por `creative.effective_instagram_media_id`, e as métricas vêm de `insights?level=ad`.
- Grave no Postgres como os fluxos atuais fazem (nó "Gravar no Postgres": upsert + `sync_log` numa query só). Use o fluxo `[HUB] Instagram — stories` como modelo.

### 3. Banco

- Escreva as tabelas novas no fim de [db/schema.sql](../db/schema.sql), sempre com `CREATE TABLE IF NOT EXISTS` (o arquivo pode ser rodado de novo sem estragar nada). Use nomes em português e sem o prefixo `HUB_` (por exemplo `anuncios`, `anuncios_diario`).
- Você não cria as tabelas no banco oficial: abra o PR com o `schema.sql` e o responsável aplica. Inclua as permissões no mesmo arquivo: `SELECT` para `hub_site` (o site) e `SELECT, INSERT, UPDATE, DELETE` para `hub_coleta` (o n8n).

### 4. Site

Para não brigar com o trabalho que segue em paralelo na `main`, coloque o máximo possível em **arquivos novos**:

| O quê | Onde |
|---|---|
| Telas | `app/(app)/trafego/` (o menu lateral e o login vêm de graça pelo layout). Use [app/(app)/stories/page.tsx](../app/(app)/stories/page.tsx) como modelo |
| Consultas ao banco | arquivo novo, ex.: `lib/trafego.ts`, no mesmo estilo de [lib/dados.ts](../lib/dados.ts) |
| Tipos das respostas | no fim de [lib/types.ts](../lib/types.ts) |
| Dados de exemplo | em [lib/mock.ts](../lib/mock.ts) ou num arquivo novo |
| Entrada única dos dados | acrescente `hub.trafego...` em [lib/hub.ts](../lib/hub.ts), com o mesmo cache de 120 s (`doBanco`) e o mesmo desvio para o mock |
| Números, %, datas | só pelas funções de [lib/format.ts](../lib/format.ts) |
| Estilos | reaproveite as classes de [app/globals.css](../app/globals.css). Classes novas vão num bloco `/* Tráfego pago */` no fim do arquivo |
| Gráficos | CSS/SVG feitos à mão, como [components/Bars.tsx](../components/Bars.tsx) e [components/Strip.tsx](../components/Strip.tsx) |

Estes arquivos são de todos. Mexa neles só no fim e combine antes, porque mudam o que todo mundo vê:

- [components/Sidebar.tsx](../components/Sidebar.tsx): o grupo "Tráfego pago" no menu.
- [app/(hub)/page.tsx](../app/(hub)/page.tsx): o cartão "Tráfego pago" da tela inicial (ligar o link e trocar o status).
- [lib/modulos.ts](../lib/modulos.ts): a linha "Meta Ads e funil" nas coletas e o aviso de pendências.

## Regras que não podem ser quebradas

Este é um resumo. A versão completa está no CLAUDE.md.

1. **Visual:** o estilo é claro e minimalista, inspirado em apps de Mac. Layout, cores, componentes novos e textos de rótulo: mostre a proposta e espere o ok.
2. **Sem dependências novas** (Tailwind, bibliotecas de gráfico, UI kits, ORMs...) sem combinar antes.
3. **Segredos:** nunca no código, no git ou em mensagens. O token da Meta fica só no n8n. Nada de `NEXT_PUBLIC_` com chave ou endereço de banco, e nenhum componente `'use client'` busca dados.
4. **Páginas** são Server Components `async`. Os filtros ficam na URL (query string), e os parâmetros são validados antes de usar. Siga o padrão de carga com `try/catch` e `<ErroApi>`.
5. **Nomes em português**: variáveis, funções, rótulos e comentários.
6. **Login e permissões:** não relaxe nenhuma checagem de [lib/google.ts](../lib/google.ts), [lib/session.ts](../lib/session.ts) ou [middleware.ts](../middleware.ts).

## Publicação

Só a `main` vai para o servidor (marketinghub.contadorceo.com.br), e quem publica é a equipe de hospedagem. Depois que o PR for juntado, o responsável pede a publicação. Se o módulo precisar de uma variável de ambiente nova, diga no PR e acrescente a variável no [.env.example](../.env.example), sem o valor.
