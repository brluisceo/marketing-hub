# Tráfego Pago · Marketing Hub

Módulo do Marketing Hub com o painel do tráfego pago do Contador CEO para o Rogério.
Dono: Henrique Bononi (Marketing). Orgânico: Luís. Publicação: Optimus / n8n da empresa.

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `n8n/` | **Primeira versão (D14):** gerador dos 3 fluxos do n8n e o guia `LEIAME.md` |
| `painel/` | Página do painel (`painel.html`) e o cálculo (`calculo.js`) usados pelos fluxos |
| `docs/` | Decisões, PRD, arquitetura, visual, referência dos painéis do Monitor, plano de rodadas |
| `lib/`, `db/` | Versão para Postgres/Cloudflare (D8), para depois |
| `test/` | Testes do cálculo, dos fluxos do n8n e das regras |

## Testes

```bash
python3 n8n/gerar.py                                   # gera os 3 fluxos (JSON) a partir do painel
node --test test/calculo.test.js test/nos.test.js      # cálculo e fluxos
npm install && npm run testar                          # tudo, inclusive as regras em lib/
```

Comece pelo `n8n/LEIAME.md`.
