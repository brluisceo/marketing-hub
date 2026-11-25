# Instalação no n8n · [CEO PAGO]

Para o Luís (ou quem administra o n8n da empresa). São 3 fluxos novos e 5 tabelas novas.
**Nada existente é alterado**: os fluxos só leem o Meta e o PipeRun, usam credenciais que já existem e gravam só nas tabelas novas.

Os 3 arquivos de importação (`1-coleta-meta.json`, `2-coleta-piperun.json`, `3-painel.json`) são gerados por `python3 n8n/gerar.py`
a partir de `painel/calculo.js` e `painel/painel.html`. Também vão prontos no pacote `ceo-pago-n8n.zip`.

## 1. Criar as 5 tabelas (Data tables)

| Tabela | Colunas (nome: tipo) |
|---|---|
| **CEO PAGO Meta** | chave, dia, campaign_id, campaign_name, objective, adset_id, adset_name, ad_id, ad_name, atualizado_em: texto · spend, impressions, clicks, link_clicks, frequency, leads_meta, compras, conversas: número |
| **CEO PAGO Cards** | titulo, time, etapa_nome, criado_em, fechado_em, origem_nome, origem_grupo, campanha, conjunto, anuncio, utm_source, utm_medium, utm_campaign, dono, motivo_nome, perfil, faturamento, agendada_em, realizada_em, atualizado_em: texto · deal_id, funil_id, etapa_id, status, origem_id, motivo_id, valor_mrr, valor_setup: número |
| **CEO PAGO Estado** | chave, valor: texto |
| **CEO PAGO Config** | chave, valor: texto |
| **CEO PAGO Acessos** | quando: data · rota, resultado, email, ip, ua: texto |

## 2. Preencher a CEO PAGO Config

| chave | valor |
|---|---|
| allow_emails | henrique.bononi@absgroup.com.br,(e-mail do Luís) |
| login_url | endereço do login Google da empresa (ver passo 3.4) |
| api_url | https://n8n.absgroup.com.br/webhook/painel-pago-ceo-api |
| leads_dia | meta diária de leads (exemplo: 110) |
| custo_reuniao | meta de custo por reunião em R$ (exemplo: 600) |
| regra_valor | `ps` (só P&S) ou `ps_mais_mrr` (P&S + MRR): definir com o comercial |
| eventos_json | nomes dos códigos, ex.: `{"08CEO2026":{"nome":"Jornadas de leads","cidade":"Online"},"30CEO2026":{"nome":"Alavanca Contábil","cidade":"Uberlândia","data":"2026-11-12","status":"encerrado"}}` |

## 3. Importar os fluxos

1. Em cada arquivo `1-coleta-meta.json`, `2-coleta-piperun.json` e `3-painel.json`: **Import from file**.
2. Em todos os nós de tabela, trocar `TROCAR_ID_...` pela tabela certa (ou escolher na lista).
3. Conferir as credenciais: **Meta Insights Hub.** (coleta do Meta) e **[CS] PipeRun** (coleta do PipeRun). Só selecionar; não editar.
4. **Login do painel:** os nós `Ler sessões` e `Ler sessões (api)` leem a tabela de sessões do login Google que a empresa já usa
   (a que guarda `email` e `token` e grava o cookie `ag_sess`). Apontar para ela **só leitura** e colocar o endereço
   desse login em `login_url`. Henrique e Luís precisam estar cadastrados nesse login.
5. Se quiser, ligar o fluxo de aviso de erros da empresa em *Settings → Error workflow*.

## 4. Testar antes de ativar (nessa ordem)

1. **Coleta Meta:** rodar pelo gatilho **Carga inicial** (busca desde 01/11/2025, uma consulta por dia). Conferir na tabela o gasto de um dia contra o Gerenciador de Anúncios.
2. **Coleta PipeRun:** rodar **Rodar agora** algumas vezes (40 cards por rodada). Conferir alguns cards contra o PipeRun.
   Conferir também se `perfil` e `campanha` vieram preenchidos: dependem das notas da integração do Meta Lead Ads (rótulos "Nome da campanha", "dono ou sócio", "Faturamento").
3. **Painel:** ativar só o fluxo 3 e abrir `https://n8n.absgroup.com.br/webhook/painel-pago-ceo` logado com um e-mail da lista.
4. Estando tudo certo, ativar os fluxos 1 e 2.

## Cuidados

- A coleta do PipeRun roda em **:22 e :52, das 7h às 21h, dias úteis**, fora dos horários da coleta do Monitor (:07 e :37), com 1 chamada por vez e pausa de ~1 s. Não aumentar o lote sem olhar o uso da API pelo grupo.
- O painel só mostra dados a quem está em `allow_emails`. Cada acesso fica em **CEO PAGO Acessos** (sem token).
- Para desfazer: desativar os 3 fluxos. Nada mais da empresa depende deles.

## Para gerar os arquivos de novo

Depois de mudar `painel/calculo.js` ou `painel/painel.html`: `python3 n8n/gerar.py`. Testes: `node --test test/calculo.test.js test/nos.test.js`.
