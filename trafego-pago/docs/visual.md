# Visual · Tráfego Pago

Protótipos prontos em `design/` (abra no navegador):
- `design/relatorio-do-dia.html`: tela principal do Rogério
- `design/eventos-e-campanhas.html`: mapa de códigos e eventos

Os números dos protótipos são de exemplo, menos os blocos marcados **DADOS REAIS**.
Se o Marketing Hub já tiver design system próprio, use os componentes dele e siga só a ordem e as regras abaixo.

## Cores
| Token | Valor | Uso |
|---|---|---|
| fundo | `#FFFFFF` | Fundo da página |
| destaque | `#1F5FD1` | Botão ativo, ícones, links, "do dia" em itálico, número principal |
| marinho | `#021528` | Títulos e números |
| texto | `#0B1B2E` / `#3A4A5E` / `#55657A` | Texto principal / secundário / apoio |
| bom | `#067647` sobre `#ECFDF3` | Variação boa |
| ruim | `#B42318` sobre `#FFF1F0` | Variação ruim, alerta |
| atenção | `#8A5A0B` sobre `#FFF4DE` | Em aprendizado, a nomear |
| azul claro | `#60A5FA` | Segundo time (Outliers) e segunda série |
| laranja | `#E07B2A` | Linha de CPL ou custo por MQL |

## Tipografia
- Manrope (400–800) para tudo.
- Libre Baskerville itálico só no destaque do título ("do dia", "campanhas").
- Geist Mono para nomes de campanha e códigos.
- Números com `font-variant-numeric: tabular-nums`.

## Cartão de vidro
```css
background: linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,255,255,.62));
backdrop-filter: blur(24px) saturate(160%);
border: 1px solid rgba(255,255,255,.8);
box-shadow: inset 0 1px 0 rgba(255,255,255,.95), 0 0 0 1px rgba(2,21,40,.06), 0 18px 40px -24px rgba(2,21,40,.35);
border-radius: 24px;
```
Atrás dos cartões, 3 manchas desfocadas (azul, azul claro, lilás `#A5B4FC`, `filter: blur(110px)`, opacidade 0,18–0,30).
Sem suporte a blur: fundo branco sólido.

## Ordem da tela "Relatório do dia"
1. Cabeçalho: data, dados de ontem, seletor Ontem / 7 dias / 30 dias
2. Resumo do dia (3 linhas do Claude)
3. **Resultado**: custo por reunião (destaque, barra de meta), investimento, CAC 30 dias, retorno 30 dias
4. **Lead e MQL**: CPL, % MQL (anel), custo por MQL, MQL → reunião (anel)
5. **Termômetro de leads**: velocímetro (vermelho < 40%, amarelo 40–65%, verde ≥ 65%) + temperatura (MQL quente, morno, lead)
6. **Ranking**: top campanhas de lead (pódio) e top criativos
7. Funil do anúncio à reunião
8. Histórico mensal (investimento e CPL, sem eixo duplo)
9. **Times**: Black Belt × Outliers em barras
10. Campanhas (tabela com selo "Em aprendizado" e "Frequência alta")
11. Destaques, alerta e próxima ação
12. Rodapé com fontes e período

## Regras
- Variação sempre com seta **e** texto ("melhor" ou "pior"), nunca só cor. Em custo, cair é bom.
- Dado ausente aparece "—". Nunca número inventado.
- Botões e filtros com no mínimo 44 px de altura.
- Tabelas largas rolam dentro do próprio cartão; a página nunca rola para o lado.
