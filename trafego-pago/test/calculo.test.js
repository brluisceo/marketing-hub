// Testes do cálculo do painel. Rodar: node --test test/calculo.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { CALC_PAGO } = require('../painel/calculo.js');

const hoje = '2026-11-26'; // ontem = 25/11
const m = (dia, campanha, p = {}) => Object.assign({ dia, campaign_id: campanha, campaign_name: campanha, ad_id: campanha + '-ad', spend: 0, impressions: 0, link_clicks: 0, leads_meta: 0 }, p);
const card = (id, p = {}) => Object.assign({ deal_id: id, funil_id: 101027, status: 0, origem_grupo: 'pago', criado_em: '2026-11-25 10:00:00' }, p);

const base = {
  hoje, periodo: 'ontem', config: { leads_dia: 10, custo_reuniao: 600 },
  meta: [
    m('2026-11-25', '[08CEO2026]-[LEADS]-[DIAGNOSTICO]', { spend: 400, impressions: 20000, link_clicks: 300, leads_meta: 8, frequency: 1.5 }),
    m('2026-11-25', '[17CEO2026]-[VENDAS]-[DIRETO-CCX]', { spend: 600, impressions: 30000, link_clicks: 200, leads_meta: 2 }),
    m('2026-11-25', '[JC100K] CAPTACAO', { spend: 999, leads_meta: 50 }),          // fora do escopo (D2)
    m('2026-11-24', '[08CEO2026]-[LEADS]-[DIAGNOSTICO]', { spend: 500, leads_meta: 5 })
  ],
  cards: [
    card(1, { perfil: 'Sim', campanha: '[08CEO2026]-[LEADS]-[DIAGNOSTICO]' }),
    card(2, { perfil: 'Não', funil_id: 108930 }),
    card(3, { realizada_em: '2026-11-25 15:00:00', funil_id: 108930 }),
    card(4, { status: 1, fechado_em: '2026-11-20 10:00:00', criado_em: '2026-11-01 10:00:00', valor_setup: 30000 }),
    card(5, { origem_grupo: 'organico' }),                                         // não é pago
    card(6, { funil_id: 999 })                                                     // funil fora dos times
  ]
};

test('D2: campanha sem código fica fora', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.meta.investimento, 1000);
  assert.strictEqual(r.fora_escopo.investimento, 999);
});
test('D3: CPL só com campanhas de lead', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.meta.leads_meta, 8);
  assert.strictEqual(r.meta.cpl, 50);
});
test('variação contra o dia anterior', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.variacoes.investimento, 1);   // 1000 contra 500
});
test('D4: MQL pela resposta de perfil', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.comercial.leads_crm, 3);      // cards 1, 2, 3 (pagos, funis dos times, criados ontem)
  assert.strictEqual(r.comercial.mql, 1);
  assert.strictEqual(r.comercial.mql_pct, 0.5);
});
test('custo por reunião e times', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.comercial.reunioes, 1);
  assert.strictEqual(r.indicadores.custo_por_reuniao, 1000);
  assert.strictEqual(r.comercial.por_time.outliers.reunioes, 1);
  assert.strictEqual(r.comercial.por_time.black_belt.leads, 1);
});
test('D7: CAC e retorno em 30 dias', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.indicadores.cac_30d, 1500);   // 1500 investidos em 30 dias / 1 contrato
  assert.strictEqual(r.indicadores.retorno_30d, 20); // 30000 / 1500
});
test('D9: velocímetro', () => {
  const r = CALC_PAGO(base);
  assert.strictEqual(r.velocimetro.pct, 0.8);
  assert.strictEqual(r.velocimetro.faixa, 'verde');
});
test('campanha liga Meta e CRM pelo nome', () => {
  const r = CALC_PAGO(base);
  const c = r.campanhas.find(x => x.codigo === '08CEO2026');
  assert.strictEqual(c.crm_mql, 1);
  assert.strictEqual(c.custo_mql, 400);
});
test('sem dados, nada é inventado', () => {
  const r = CALC_PAGO({ hoje, periodo: 'ontem', config: {}, meta: [], cards: [] });
  assert.strictEqual(r.meta.cpl, null);
  assert.strictEqual(r.comercial.reunioes, null);
  assert.strictEqual(r.indicadores.cac_30d, null);
  assert.strictEqual(r.velocimetro.pct, null);
});
