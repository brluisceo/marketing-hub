// Confere o código dos nós dos fluxos [CEO PAGO] e simula os nós do painel com um "$" falso do n8n.
// Antes de rodar: python3 n8n/gerar.py (gera os JSON). Rodar: node --test test/nos.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const fluxos = ['1-coleta-meta', '2-coleta-piperun', '3-painel'].map(n => JSON.parse(fs.readFileSync(__dirname + '/../n8n/' + n + '.json', 'utf8')));
const cod = (f, nome) => f.nodes.find(n => n.name === nome).parameters.jsCode;
const rodar = (js, dados) => { const $ = n => ({ all: () => (dados[n] || []).map(json => ({ json })), first: () => ({ json: (dados[n] || [{}])[0] }), get isExecuted() { return !!dados[n]; } });
  return new Function('$', '$input', js)($, { all: () => (dados.$input || []).map(json => ({ json })), first: () => ({ json: (dados.$input || [{}])[0] }) }); };

test('todo nó de código compila', () => {
  fluxos.forEach(f => f.nodes.filter(n => n.type === 'n8n-nodes-base.code').forEach(n => {
    assert.doesNotThrow(() => new Function('$', '$input', n.parameters.jsCode), n.name);
  }));
});
test('toda conexão aponta para nó existente', () => {
  fluxos.forEach(f => { const nomes = new Set(f.nodes.map(n => n.name));
    Object.entries(f.connections).forEach(([de, c]) => { assert.ok(nomes.has(de), de); c.main.flat().forEach(x => assert.ok(nomes.has(x.node), x.node)); }); });
});
test('nenhum nó escreve no Meta ou no PipeRun', () => {
  fluxos.forEach(f => f.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest' || n.type === 'n8n-nodes-base.facebookGraphApi').forEach(n => {
    assert.ok(!n.parameters.method || n.parameters.method === 'GET', n.name);
    assert.ok(!n.parameters.httpRequestMethod || n.parameters.httpRequestMethod === 'GET', n.name);
  }));
});
test('período da coleta do Meta: 11 dias, um por consulta', () => {
  const r = rodar(cod(fluxos[0], 'Período'), {});
  assert.strictEqual(r.length, 11);
  assert.strictEqual(JSON.parse(r[0].json.time_range).since, JSON.parse(r[0].json.time_range).until);
});
test('montar linhas do Meta: leads pela ordem do Monitor', () => {
  const r = rodar(cod(fluxos[0], 'Montar linhas'), { 'Insights por anúncio': [{ data: [{ date_start: '2026-11-25', ad_id: '9', campaign_name: 'X', spend: '10.5',
    actions: [{ action_type: 'onsite_conversion.lead_grouped', value: '3' }, { action_type: 'lead', value: '4' }] }] }], 'Ler gasto atual': [] });
  assert.strictEqual(r[0].json.leads_meta, 4);
  assert.strictEqual(r[0].json.spend, 10.5);
});
test('montar cards: campanha, perfil e reunião vêm do histórico', () => {
  const meta = { completo: true, meta: { origens: { 5: { n: 'Meta Lead Ads', g: 36348 } }, motivos: {}, usuarios: { 1: 'Pedro' }, etapas: { 10: { n: 'Reunião Agendada' }, 11: { n: 'Reunião Realizada' } } } };
  const r = rodar(cod(fluxos[1], 'Montar cards'), {
    'Meta': [meta], 'Fila de cards': [{ deal_id: 7 }],
    'Card': [{ data: { id: 7, pipeline_id: 101027, stage_id: 11, status: 0, origin_id: 5, owner_id: 1, created_at: '2026-11-20 10:00:00', customFields: [] } }],
    'Etapas do card': [{ data: [{ in_stage_id: 10, in_date: '2026-11-21 10:00:00' }, { in_stage_id: 11, in_date: '2026-11-22 10:00:00' }] }],
    'Histórico do card': [{ data: [{ type_key: 'json_integrator', metadata: { leads: [{ notes: ['<b>Nome da campanha:</b> [08CEO2026]-[LEADS]-[RAIOX] <b>Você é dono ou sócio?:</b> Sim'] }] } }] }]
  });
  const c = r[0].json;
  assert.strictEqual(c.time, 'black_belt'); assert.strictEqual(c.origem_grupo, 'pago');
  assert.strictEqual(c.campanha, '[08CEO2026]-[LEADS]-[RAIOX]'); assert.strictEqual(c.perfil, 'Sim');
  assert.strictEqual(c.agendada_em, '2026-11-21 10:00:00'); assert.strictEqual(c.realizada_em, '2026-11-22 10:00:00');
});
test('painel: sem sessão vai para o login; fora da lista vê acesso restrito; na lista vê a página', () => {
  const js = cod(fluxos[2], 'Sessão página');
  const cfg = [{ chave: 'allow_emails', valor: 'henrique.bononi@absgroup.com.br' }, { chave: 'login_url', valor: 'https://login' }, { chave: 'api_url', valor: 'https://api' }];
  const sess = [{ token: 'abc123', email: 'Henrique.Bononi@absgroup.com.br' }, { token: 'zzz999', email: 'outra@absgroup.com.br' }];
  const pag = c => rodar(js, { 'Página': [{ headers: { cookie: c } }], 'Ler config': cfg, 'Ler sessões': sess })[0].json;
  assert.strictEqual(pag('').motivo, 'sem_sessao');
  assert.strictEqual(pag('ag_sess=zzz999').motivo, 'restrito');
  const ok = pag('ag_sess=abc123');
  assert.strictEqual(ok.motivo, 'ok');
  assert.ok(ok.html.includes("var SESSAO = 'abc123'") && ok.html.includes('var API_URL = "https://api"'));
});
test('API: calcula com a sessão válida', () => {
  const sessao = rodar(cod(fluxos[2], 'Sessão API'), { 'API': [{ headers: {}, body: { s: 'abc123', periodo: '7d' } }],
    'Ler config (api)': [{ chave: 'allow_emails', valor: 'henrique.bononi@absgroup.com.br' }], 'Ler sessões (api)': [{ token: 'abc123', email: 'henrique.bononi@absgroup.com.br' }] })[0].json;
  assert.strictEqual(sessao.ok, true);
  const r = rodar(cod(fluxos[2], 'Calcular'), { 'Sessão API': [sessao], 'Ler config (api)': [], 'Ler meta': [], 'Ler cards': [] })[0].json;
  const d = JSON.parse(r.corpo);
  assert.strictEqual(d.ok, true); assert.strictEqual(d.periodo.nome, '7d');
});
