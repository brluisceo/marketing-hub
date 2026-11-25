# Gera os 3 fluxos [CEO PAGO] em JSON de importação do n8n.
# Rodar: python3 n8n/gerar.py   (lê painel/calculo.js e painel/painel.html)
import json, uuid, os
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
U = lambda: str(uuid.uuid4())
# Tabelas do n8n: o Luís cria e troca estes marcadores pelos IDs (ver n8n/LEIAME.md)
T = {k: {"__rl": True, "mode": "id", "value": v} for k, v in {
    "meta": "TROCAR_ID_CEO_PAGO_META", "cards": "TROCAR_ID_CEO_PAGO_CARDS", "estado": "TROCAR_ID_CEO_PAGO_ESTADO",
    "config": "TROCAR_ID_CEO_PAGO_CONFIG", "acessos": "TROCAR_ID_CEO_PAGO_ACESSOS", "equipe": "TROCAR_ID_TABELA_DE_SESSOES_DO_LOGIN"}.items()}
CRED_META = {"facebookGraphApi": {"id": "VJ94K3eaUHyIJYhh", "name": "Meta Insights Hub."}}
CRED_PIPE = {"httpHeaderAuth": {"id": "TsJWIpFFGh9nVPt5", "name": "[CS] PipeRun"}}
CONTA = "act_233916409249136"

def no(nome, tipo, versao, pos, params, **extra):
    d = {"id": U(), "name": nome, "type": tipo, "typeVersion": versao, "position": pos, "parameters": params}
    d.update(extra); return d
def code(nome, pos, js, **extra): return no(nome, "n8n-nodes-base.code", 2, pos, {"mode": "runOnceForAllItems", "jsCode": js}, **extra)
def ler(nome, pos, tabela, filtros=None):
    p = {"resource": "row", "operation": "get", "dataTableId": T[tabela], "returnAll": True}
    if filtros: p.update({"matchType": "allConditions", "filters": {"conditions": filtros}})
    return no(nome, "n8n-nodes-base.dataTable", 1.1, pos, p, alwaysOutputData=True, executeOnce=True)
def upsert(nome, pos, tabela, chave):
    return no(nome, "n8n-nodes-base.dataTable", 1.1, pos, {"resource": "row", "operation": "upsert", "dataTableId": T[tabela],
        "matchType": "allConditions", "filters": {"conditions": [{"condition": "eq", "keyName": chave, "keyValue": "={{ $json." + chave + " }}"}]},
        "columns": {"mappingMode": "autoMapInputData", "value": None}})
def pipe(nome, pos, url, pag=False, lote=1100):
    o = {"timeout": 30000, "batching": {"batch": {"batchInterval": lote, "batchSize": 1}}}
    if pag:
        o = {"timeout": 30000, "pagination": {"pagination": {"paginationMode": "updateAParameterInEachRequest",
            "parameters": {"parameters": [{"name": "page", "type": "qs", "value": "={{ $pageCount + 1 }}"}]},
            "paginationCompleteWhen": "other", "completeExpression": "={{ !$response.body || !Array.isArray($response.body.data) || $response.body.data.length < 200 }}",
            "limitPagesFetched": True, "maxRequests": 20, "requestInterval": 1200}}}
    return no(nome, "n8n-nodes-base.httpRequest", 4.2, pos, {"method": "GET", "url": url, "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth", "options": o}, credentials=CRED_PIPE, onError="continueRegularOutput",
        alwaysOutputData=True, retryOnFail=True, maxTries=5, waitBetweenTries=5000)
def liga(*pares):
    c = {}
    for a, b in pares:
        c.setdefault(a, {"main": [[]]})["main"][0].append({"node": b, "type": "main", "index": 0})
    return c
def fluxo(nome, nos, conexoes, desc, extra_settings=None):
    s = {"executionOrder": "v1", "timezone": "America/Sao_Paulo", "availableInMCP": True}
    s.update(extra_settings or {})
    return {"name": nome, "nodes": nos, "connections": conexoes, "settings": s, "pinData": {}, "meta": {"descricao": desc}, "active": False}

# ======================= 1. COLETA META =======================
PERIODO = r"""// Uma consulta por dia (since = until): a quebra diária do Meta (time_increment=1) devolve gasto incompleto.
// Agendada: refaz os últimos 10 dias (o Meta corrige números para trás). Carga inicial: desde 01/11/2025.
const hojeMs = Date.now() - 3 * 3600e3;
const hoje = new Date(hojeMs).toISOString().slice(0, 10);
let manual = false; try { manual = $('Carga inicial').isExecuted; } catch (e) {}
const desde = manual ? '2025-11-01' : new Date(hojeMs - 10 * 864e5).toISOString().slice(0, 10);
const out = [];
for (let d = new Date(desde + 'T12:00:00Z'), g = 0; d.toISOString().slice(0, 10) <= hoje && g < 500; d.setUTCDate(d.getUTCDate() + 1), g++) {
  const dia = d.toISOString().slice(0, 10);
  out.push({ json: { dia, desde, time_range: JSON.stringify({ since: dia, until: dia }) } });
}
return out;"""
MONTAR_META = r"""// Uma linha por anúncio por dia (padrão da coleta do Monitor). Só leitura no Meta.
const agora = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
const acao = (arr, tipos) => { for (const t of tipos) { const a = (arr || []).find(x => x.action_type === t); if (a) return Number(a.value) || 0; } return 0; };
const out = [], vistos = {}, diasComDados = {};
$('Insights por anúncio').all().forEach(it => { ((it.json || {}).data || []).forEach(r => {
  if (!r || !r.ad_id || !r.date_start) return;
  const chave = r.date_start + '|' + r.ad_id; vistos[chave] = 1; diasComDados[r.date_start] = 1;
  out.push({ json: { chave, dia: r.date_start,
    campaign_id: String(r.campaign_id || ''), campaign_name: String(r.campaign_name || '').slice(0, 200), objective: String(r.objective || ''),
    adset_id: String(r.adset_id || ''), adset_name: String(r.adset_name || '').slice(0, 200), ad_id: String(r.ad_id), ad_name: String(r.ad_name || '').slice(0, 200),
    spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0, link_clicks: Number(r.inline_link_clicks) || 0,
    frequency: Number(r.frequency) || 0,
    leads_meta: acao(r.actions, ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead']),
    compras: acao(r.actions, ['purchase', 'offsite_conversion.fb_pixel_purchase']),
    conversas: acao(r.actions, ['onsite_conversion.messaging_conversation_started_7d']),
    atualizado_em: agora } });
}); });
// dia reprocessado em que o Meta não devolve mais um anúncio: zera a linha antiga, para não somar número errado
let existentes = []; try { existentes = $('Ler gasto atual').all().map(i => i.json).filter(x => x && x.chave); } catch (e) {}
existentes.forEach(x => {
  if (!diasComDados[x.dia] || vistos[x.chave] || !Number(x.spend)) return;
  out.push({ json: Object.assign({}, x, { spend: 0, impressions: 0, clicks: 0, link_clicks: 0, leads_meta: 0, compras: 0, conversas: 0, atualizado_em: agora }) });
});
return out;"""
m_nos = [
    no("A cada 6 horas", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 0], {"rule": {"interval": [{"field": "hours", "hoursInterval": 6}]}}),
    no("Carga inicial", "n8n-nodes-base.manualTrigger", 1, [0, 200], {}),
    code("Período", [220, 100], PERIODO),
    no("Insights por anúncio", "n8n-nodes-base.facebookGraphApi", 1, [440, 100], {"graphApiVersion": "v25.0", "node": CONTA, "edge": "insights",
        "options": {"queryParameters": {"parameter": [
            {"name": "level", "value": "ad"}, {"name": "time_range", "value": "={{ $json.time_range }}"},
            {"name": "fields", "value": "campaign_id,campaign_name,objective,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,inline_link_clicks,frequency,actions"},
            {"name": "limit", "value": "500"}]}}},
        credentials=CRED_META, onError="continueRegularOutput", retryOnFail=True, maxTries=3, waitBetweenTries=5000),
    ler("Ler gasto atual", [660, 260], "meta", [{"condition": "gte", "keyName": "dia", "keyValue": "={{ $('Período').first().json.desde }}"}]),
    code("Montar linhas", [880, 100], MONTAR_META),
    upsert("Gravar gasto", [1100, 100], "meta", "chave"),
]
m_con = liga(("A cada 6 horas", "Período"), ("Carga inicial", "Período"), ("Período", "Insights por anúncio"),
             ("Insights por anúncio", "Ler gasto atual"), ("Ler gasto atual", "Montar linhas"), ("Montar linhas", "Gravar gasto"))

# ======================= 2. COLETA PIPERUN =======================
FUNIS = [101027, 108929, 108930, 108931]
PEDIDOS = "return [['origens','/origins?show=200'],['motivos','/lostReasons?show=200'],['usuarios','/users?show=200']]" + \
    "".join(f".concat([['etapas','/stages?pipeline_id={f}&show=50']])" for f in FUNIS) + ".map(p => ({ json: { tipo: p[0], path: p[1] } }));"
META_PIPE = r"""// Metadados do PipeRun: origens (com grupo), motivos de perda, usuários e etapas dos funis do Contador CEO
const ped = $('Pedidos de metadados').all().map(i => i.json);
const meta = { origens: {}, motivos: {}, usuarios: {}, etapas: {} };
$input.all().map(i => i.json || {}).forEach((r, i) => {
  const t = (ped[i] || {}).tipo, arr = Array.isArray(r.data) ? r.data : [];
  if (t === 'origens') arr.forEach(o => { meta.origens[o.id] = { n: o.name, g: o.origin_group_id || 0 }; });
  if (t === 'motivos') arr.forEach(o => { meta.motivos[o.id] = o.name; });
  if (t === 'usuarios') arr.forEach(o => { meta.usuarios[o.id] = o.name; });
  if (t === 'etapas') arr.forEach(o => { meta.etapas[o.id] = { n: o.name, f: o.pipeline_id, o: o.order }; });
});
// se a API cortou alguma lista, completa com a última versão boa guardada
const est = {}; $('Ler estado').all().forEach(i => { const j = i.json || {}; if (j.chave) est[j.chave] = j.valor; });
let antigo = {}; try { antigo = JSON.parse(est.meta || '{}'); } catch (e) {}
const MIN = { origens: 10, motivos: 3, usuarios: 3, etapas: 8 };
Object.keys(MIN).forEach(k => { if (Object.keys(meta[k]).length < MIN[k]) meta[k] = Object.assign({}, antigo[k] || {}, meta[k]); });
const completo = Object.keys(MIN).every(k => Object.keys(meta[k]).length >= MIN[k]);
return [{ json: { meta, completo } }];"""
BUSCAS = r"""// Etapas movimentadas desde o último cursor (2 h de margem)
const est = {}; $('Ler estado').all().forEach(i => { const j = i.json || {}; if (j.chave) est[j.chave] = j.valor; });
const meta = $('Meta').first().json.meta;
const cursor = String(est.cursor || '2026-10-01 00:00:00');
const d = new Date(cursor.replace(' ', 'T') + 'Z'); d.setUTCHours(d.getUTCHours() - 2);
const desde = d.toISOString().slice(0, 19).replace('T', ' ');
return Object.keys(meta.etapas).map(id => ({ json: { path: '/stageHistories?in_stage_id=' + id + '&in_date_start=' + encodeURIComponent(desde) + '&show=200' } }));"""
FILA = r"""// Cards a processar: movimentados agora + abertos que fecharam (ganho/perda sem troca de etapa) + fila que sobrou
const est = {}; $('Ler estado').all().forEach(i => { const j = i.json || {}; if (j.chave) est[j.chave] = j.valor; });
const agoraL = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
let cursor = String(est.cursor || '2026-10-01 00:00:00');
const movidos = [];
const hist = $('Etapas no PipeRun').all();
hist.forEach(it => { const arr = (it.json || {}).data; if (!Array.isArray(arr)) return; arr.forEach(h => { if (!h || !h.deal_id || h.deleted_at) return; movidos.push(Number(h.deal_id)); if (h.in_date && h.in_date > cursor) cursor = h.in_date; }); });
if (cursor > agoraL) cursor = agoraL;
if (hist.some(it => it.json && it.json.error)) cursor = String(est.cursor || '2026-10-01 00:00:00'); // falhou: a próxima rodada busca de novo
const vivos = {}; let ok = true;
$('Abertos no PipeRun').all().forEach(it => { const j = it.json || {}; if (j.error || !Array.isArray(j.data)) { ok = false; return; } j.data.forEach(d => { if (d && d.id && Number(d.status || 0) === 0) vivos[Number(d.id)] = 1; }); });
const fechados = [];
if (ok) $('Ler abertos').all().forEach(i => { const id = Number((i.json || {}).deal_id || 0); if (id && !vivos[id]) fechados.push(id); });
const novosAbertos = ok ? Object.keys(vivos).map(Number).filter(id => !$('Ler abertos').all().some(i => Number((i.json || {}).deal_id) === id)) : [];
let fila = []; try { fila = JSON.parse(est.fila || '[]'); } catch (e) {}
const vistos = {}, todos = [];
fechados.concat(movidos).concat(novosAbertos).concat(fila).forEach(id => { if (id && !vistos[id]) { vistos[id] = 1; todos.push(id); } });
// lote pequeno: a API do PipeRun é compartilhada pelo grupo inteiro
const LIM = 40, agora = todos.slice(0, LIM), resto = todos.slice(LIM);
const estado = { cursor, fila: JSON.stringify(resto.slice(0, 5000)), movidos: movidos.length, resto: resto.length };
if (!agora.length) return [{ json: { deal_id: 0, _estado: estado } }];
return agora.map(id => ({ json: { deal_id: id, _estado: estado } }));"""
ABERTOS = "return " + json.dumps(FUNIS) + ".map(f => ({ json: { path: '/deals?pipeline_id=' + f + '&status=0&show=200' } }));"
MONTAR_CARDS = r"""// Uma linha por oportunidade dos funis Black Belt (101027) e Outliers (108929, 108930, 108931)
const m = $('Meta').first().json; if (!m.completo) return [];
const meta = m.meta;
const fila = $('Fila de cards').all().map(i => i.json);
const cards = $('Card').all().map(i => ((i.json || {}).data) || {});
const hists = $('Etapas do card').all().map(i => ((i.json || {}).data) || []);
const tl = $('Histórico do card').all().map(i => ((i.json || {}).data) || []);
const falhou = i => ['Card', 'Etapas do card', 'Histórico do card'].some(n => { try { return !!($(n).all()[i].json || {}).error; } catch (e) { return true; } });
const FUNIS = { 101027: 'black_belt', 108929: 'outliers', 108930: 'outliers', 108931: 'outliers' };
const GRUPOS = { 36347: 'organico', 36348: 'pago', 36349: 'outbound', 36350: 'relacionamento', 36351: 'receptivo', 43897: 'eventos' };
const agoraL = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
// texto das notas da integração do Meta Lead Ads: "<b>Rótulo:</b> valor"
const nota = (txt, rot) => { const mm = String(txt || '').match(new RegExp(rot + '[^<]*:<\\/b>\\s*([^<]+)', 'i')); return mm ? mm[1].trim() : ''; };
const out = [];
fila.forEach((f, i) => {
  const d = cards[i] || {};
  if (!f.deal_id || falhou(i)) return;
  if (!d.id || Number(d.id) !== Number(f.deal_id)) return;
  if (!FUNIS[d.pipeline_id] || Number(d.deleted || 0) === 1) return;
  const og = meta.origens[d.origin_id] || null;
  const cf = {}; (d.customFields || []).forEach(c => { if (c && c.name) cf[String(c.name).toLowerCase().trim()] = Array.isArray(c.value) ? c.value.join(', ') : (c.value == null ? '' : String(c.value)); });
  let campanha = '', conjunto = '', anuncio = '', perfil = '', faturamento = '';
  (tl[i] || []).forEach(h => { if (h && h.type_key === 'json_integrator' && h.metadata && Array.isArray(h.metadata.leads)) h.metadata.leads.forEach(l => {
    const t = (l.notes || []).join(' ');
    campanha = campanha || nota(t, 'Nome da campanha'); conjunto = conjunto || nota(t, 'Nome do conjunto'); anuncio = anuncio || nota(t, 'Nome do anúncio');
    perfil = perfil || nota(t, '(?:Perfil|dono|sócio|socio)'); faturamento = faturamento || nota(t, 'Faturamento'); }); });
  if (!campanha) campanha = cf.utm_campaign || '';
  // reunião agendada/realizada pelo nome da etapa (ex.: "Reunião Agendada", "Reunião Realizada")
  const hs = (hists[i] || []).filter(h => h && !h.deleted_at).sort((a, b) => String(a.in_date).localeCompare(String(b.in_date)));
  const primeira = re => { const h = hs.find(x => re.test(String((meta.etapas[x.in_stage_id] || {}).n || ''))); return h ? h.in_date : ''; };
  out.push({ json: {
    deal_id: Number(d.id), titulo: String(d.title || '').slice(0, 120), funil_id: Number(d.pipeline_id), time: FUNIS[d.pipeline_id],
    etapa_id: Number(d.stage_id), etapa_nome: String((meta.etapas[d.stage_id] || {}).n || ''), status: Number(d.status),
    criado_em: d.created_at || '', fechado_em: d.closed_at || '',
    origem_id: Number(d.origin_id || 0), origem_nome: og ? og.n : '', origem_grupo: og ? (GRUPOS[og.g] || 'outro') : 'sem_origem',
    campanha: campanha.slice(0, 200), conjunto: conjunto.slice(0, 200), anuncio: anuncio.slice(0, 200),
    utm_source: (cf.utm_source || '').slice(0, 100), utm_medium: (cf.utm_medium || '').slice(0, 100), utm_campaign: (cf.utm_campaign || '').slice(0, 200),
    dono: String(meta.usuarios[d.owner_id] || ''), motivo_id: Number(d.lost_reason_id || 0), motivo_nome: String(meta.motivos[d.lost_reason_id] || ''),
    valor_mrr: Number(d.value_mrr || 0), valor_setup: Number(d.value || 0),
    perfil: perfil.slice(0, 60), faturamento: faturamento.slice(0, 80),
    agendada_em: primeira(/agendad/i), realizada_em: primeira(/realizad/i), atualizado_em: agoraL } });
});
return out;"""
ESTADO = r"""// Guarda cursor, fila e metadados para a próxima rodada
const e = $('Fila de cards').first().json._estado || {};
const m = $('Meta').first().json;
const fila = $('Fila de cards').all().map(i => i.json.deal_id).filter(Boolean);
const refazer = !m.completo ? fila : fila.filter((id, i) => ['Card', 'Etapas do card', 'Histórico do card'].some(n => { try { return !!($(n).all()[i].json || {}).error; } catch (x) { return true; } }));
let resto = []; try { resto = JSON.parse(e.fila || '[]'); } catch (x) {}
const filaNova = refazer.concat(resto.filter(id => refazer.indexOf(id) < 0));
const out = [{ json: { chave: 'cursor', valor: String(e.cursor || '') } }, { json: { chave: 'fila', valor: JSON.stringify(filaNova) } },
  { json: { chave: 'ultima_rodada', valor: new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19).replace('T', ' ') + ' | movidos ' + (e.movidos || 0) + ' | na fila ' + filaNova.length + ' | refazer ' + refazer.length } }];
if (m.completo) out.push({ json: { chave: 'meta', valor: JSON.stringify(m.meta) } });
return out;"""
p_nos = [
    no("A cada 30 min", "n8n-nodes-base.scheduleTrigger", 1.3, [0, 0], {"rule": {"interval": [{"field": "cronExpression", "expression": "22,52 7-21 * * 1-5"}]}}),
    no("Rodar agora", "n8n-nodes-base.manualTrigger", 1, [0, 200], {}),
    ler("Ler estado", [220, 100], "estado"),
    ler("Ler abertos", [440, 100], "cards", [{"condition": "eq", "keyName": "status", "keyValue": "0"}]),
    code("Pedidos de metadados", [660, 100], PEDIDOS),
    pipe("Metadados", [880, 100], "=https://api.pipe.run/v1{{ $json.path }}", lote=1500),
    code("Meta", [1100, 100], META_PIPE),
    code("Buscas de etapas", [1320, 100], BUSCAS),
    pipe("Etapas no PipeRun", [1540, 100], "=https://api.pipe.run/v1{{ $json.path }}", pag=True),
    code("Buscas de abertos", [1760, 100], ABERTOS),
    pipe("Abertos no PipeRun", [1980, 100], "=https://api.pipe.run/v1{{ $json.path }}", pag=True),
    code("Fila de cards", [2200, 100], FILA),
    pipe("Card", [2420, 100], "=https://api.pipe.run/v1/deals/{{ $json.deal_id }}?with=customFields"),
    pipe("Etapas do card", [2640, 100], "=https://api.pipe.run/v1/stageHistories?deal_id={{ $('Fila de cards').item.json.deal_id }}&show=200"),
    pipe("Histórico do card", [2860, 100], "=https://api.pipe.run/v1/deals/{{ $('Fila de cards').item.json.deal_id }}/histories?show=100"),
    code("Montar cards", [3080, 0], MONTAR_CARDS),
    upsert("Gravar cards", [3300, 0], "cards", "deal_id"),
    code("Estado novo", [3080, 220], ESTADO),
    upsert("Gravar estado", [3300, 220], "estado", "chave"),
]
p_con = liga(("A cada 30 min", "Ler estado"), ("Rodar agora", "Ler estado"), ("Ler estado", "Ler abertos"), ("Ler abertos", "Pedidos de metadados"),
             ("Pedidos de metadados", "Metadados"), ("Metadados", "Meta"), ("Meta", "Buscas de etapas"), ("Buscas de etapas", "Etapas no PipeRun"),
             ("Etapas no PipeRun", "Buscas de abertos"), ("Buscas de abertos", "Abertos no PipeRun"), ("Abertos no PipeRun", "Fila de cards"),
             ("Fila de cards", "Card"), ("Card", "Etapas do card"), ("Etapas do card", "Histórico do card"),
             ("Histórico do card", "Montar cards"), ("Histórico do card", "Estado novo"), ("Montar cards", "Gravar cards"), ("Estado novo", "Gravar estado"))

# ======================= 3. PAINEL: PÁGINA E API =======================
HTML = open(os.path.join(RAIZ, "painel", "painel.html"), encoding="utf-8").read()
CALC = open(os.path.join(RAIZ, "painel", "calculo.js"), encoding="utf-8").read().replace("if (typeof module !== 'undefined') module.exports = { CALC_PAGO };", "")
CFG = "const cfg = {}; $('Ler config').all().forEach(i => { const j = i.json || {}; if (j.chave) cfg[String(j.chave).trim()] = String(j.valor == null ? '' : j.valor).trim(); });\n"
COOKIE = "const cookies = {}; String((req.headers || {}).cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) cookies[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });\n"
QUEM = "const hd = req.headers || {};\nconst ip = (String(hd['x-forwarded-for'] || '').split(',')[0].trim() || String(hd['x-real-ip'] || '').trim()).slice(0, 64);\nconst ua = String(hd['user-agent'] || '').slice(0, 160);\n"
ALLOW = "const ALLOW = String(cfg.allow_emails || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);\n"
SESS_PAG = "// Página do painel: só para quem entrou com o Google e está na lista allow_emails (tabela CEO PAGO Config)\nconst req = $('Página').first().json;\n" + CFG + ALLOW + COOKIE + QUEM + \
  "const sess = String(cookies.ag_sess || '').replace(/[^a-zA-Z0-9]/g, '');\n" + \
  "const p = sess ? $('Ler sessões').all().map(i => i.json || {}).find(x => String(x.token || '') === sess && x.ativo !== false) : null;\n" + \
  "if (!p) return [{ json: { ok: false, location: cfg.login_url || '', email: '', motivo: 'sem_sessao', ip, ua } }];\n" + \
  "const email = String(p.email || '').toLowerCase();\n" + \
  "if (ALLOW.indexOf(email) < 0) return [{ json: { ok: true, html: '<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Tráfego pago</title></head><body style=\"margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#021528\"><div style=\"max-width:380px;padding:32px;text-align:center\"><h1 style=\"font-size:20px\">Acesso restrito</h1><p style=\"color:#55657A\">Este painel é exclusivo do time de marketing.</p></div></body></html>', email, motivo: 'restrito', ip, ua } }];\n" + \
  "const HTML = " + json.dumps(HTML, ensure_ascii=False) + ";\n" + \
  "// a página roda isolada (origem nula): a sessão vai dentro dela e segue no corpo do POST, como no Painel CEO\n" + \
  "const html = HTML.replace(\"'__SESSAO_PAINEL__'\", \"'\" + sess + \"'\").replace(\"'__API_URL__'\", JSON.stringify(cfg.api_url || ''));\n" + \
  "return [{ json: { ok: true, html, email, motivo: 'ok', ip, ua } }];"
SESS_API = "const req = $('API').first().json;\n" + CFG + ALLOW + COOKIE + QUEM + \
  "let body = req.body || {}; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }\n" + \
  "const sess = String(body.s || cookies.ag_sess || '').replace(/[^a-zA-Z0-9]/g, '');\n" + \
  "const p = sess ? $('Ler sessões (api)').all().map(i => i.json || {}).find(x => String(x.token || '') === sess && x.ativo !== false) : null;\n" + \
  "const email = p ? String(p.email || '').toLowerCase() : '';\nconst ok = !!p && ALLOW.indexOf(email) >= 0;\n" + \
  "return [{ json: { ok, email, periodo: String(body.periodo || 'ontem'), motivo: ok ? 'ok' : (p ? 'restrito' : 'sem_sessao'), ip, ua } }];"
CALCULAR = CALC + "\nconst lista = n => { try { return $(n).all().map(i => i.json).filter(x => x && Object.keys(x).length); } catch (e) { return []; } };\n" + \
  "const cfg = {}; lista('Ler config').forEach(j => { if (j.chave) cfg[String(j.chave).trim()] = String(j.valor == null ? '' : j.valor).trim(); });\n" + \
  "const agoraBR = new Date(Date.now() - 3 * 3600e3).toISOString();\n" + \
  "let r; try { r = CALC_PAGO({ hoje: agoraBR.slice(0, 10), agora: agoraBR.slice(0, 16).replace('T', ' '), periodo: $('Sessão API').first().json.periodo, config: cfg, meta: lista('Ler meta'), cards: lista('Ler cards') }); }\n" + \
  "catch (e) { r = { ok: false, erro: 'Falha no cálculo: ' + e.message }; }\nreturn [{ json: { corpo: JSON.stringify(r) } }];"
CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; base-uri 'none'; form-action 'none'"
SEG = [{"name": "Cache-Control", "value": "no-store"}, {"name": "X-Content-Type-Options", "value": "nosniff"}]
def acesso(nome, pos, rota):
    cols = ["quando", "rota", "resultado", "email", "ip", "ua"]
    return no(nome, "n8n-nodes-base.dataTable", 1.1, pos, {"resource": "row", "operation": "insert", "dataTableId": T["acessos"],
        "columns": {"mappingMode": "defineBelow", "value": {"quando": "={{ $now.toISO() }}", "rota": rota, "resultado": "={{ $json.motivo }}",
            "email": "={{ $json.email }}", "ip": "={{ $json.ip }}", "ua": "={{ $json.ua }}"},
            "schema": [{"id": c, "displayName": c, "type": "dateTime" if c == "quando" else "string", "required": False, "defaultMatch": False, "display": True, "canBeUsedToMatch": True} for c in cols]},
        "options": {}}, onError="continueRegularOutput", alwaysOutputData=True, notes="Uma linha por acesso. Nunca grava o token.")
def se(nome, pos, expr):
    return no(nome, "n8n-nodes-base.if", 2.2, pos, {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
        "conditions": [{"leftValue": expr, "operator": {"type": "boolean", "operation": "true", "singleValue": True}, "rightValue": ""}], "combinator": "and"}, "options": {}})
w_nos = [
    no("Página", "n8n-nodes-base.webhook", 2.1, [0, 100], {"httpMethod": "GET", "path": "painel-pago-ceo", "responseMode": "responseNode", "options": {}}, webhookId=U()),
    ler("Ler config", [220, 100], "config"),
    ler("Ler sessões", [440, 100], "equipe"),
    code("Sessão página", [660, 100], SESS_PAG),
    acesso("Registrar acesso (página)", [880, 100], "pagina"),
    se("Tem acesso?", [1100, 100], "={{ $('Sessão página').first().json.ok === true }}"),
    no("Responder página", "n8n-nodes-base.respondToWebhook", 1.5, [1320, 0], {"respondWith": "text",
        "responseBody": "={{ String($('Sessão página').first().json.html || '').replace('<head>', '<head>\\n<meta http-equiv=\"Content-Security-Policy\" content=\"" + CSP + "' + ($('Sessão página').first().json.motivo === 'ok' ? '; connect-src https://n8n.absgroup.com.br' : '') + '\">') }}",
        "options": {"responseHeaders": {"entries": [{"name": "Content-Type", "value": "text/html; charset=utf-8"}] + SEG + [{"name": "X-Robots-Tag", "value": "noindex"}, {"name": "Referrer-Policy", "value": "no-referrer"}, {"name": "X-Frame-Options", "value": "DENY"}]}}}),
    no("Ir para o login", "n8n-nodes-base.respondToWebhook", 1.5, [1320, 220], {"respondWith": "noData",
        "options": {"responseCode": 302, "responseHeaders": {"entries": [{"name": "Location", "value": "={{ $('Sessão página').first().json.location }}"}, {"name": "Cache-Control", "value": "no-store"}]}}}),
    no("API", "n8n-nodes-base.webhook", 2.1, [0, 500], {"httpMethod": "POST", "path": "painel-pago-ceo-api", "responseMode": "responseNode", "options": {"allowedOrigins": "null"}}, webhookId=U()),
    ler("Ler config (api)", [220, 500], "config"),
    ler("Ler sessões (api)", [440, 500], "equipe"),
    code("Sessão API", [660, 500], SESS_API.replace("$('Ler config')", "$('Ler config (api)')")),
    acesso("Registrar acesso (api)", [880, 500], "api"),
    se("Liberado?", [1100, 500], "={{ $('Sessão API').first().json.ok === true }}"),
    ler("Ler meta", [1320, 420], "meta"),
    ler("Ler cards", [1540, 420], "cards"),
    code("Calcular", [1760, 420], CALCULAR.replace("lista('Ler config')", "lista('Ler config (api)')")),
    no("Responder dados", "n8n-nodes-base.respondToWebhook", 1.5, [1980, 420], {"respondWith": "text", "responseBody": "={{ $json.corpo }}",
        "options": {"responseHeaders": {"entries": [{"name": "Content-Type", "value": "application/json; charset=utf-8"}] + SEG}}}),
    no("Negar dados", "n8n-nodes-base.respondToWebhook", 1.5, [1320, 620], {"respondWith": "json", "responseBody": "{\"ok\":false,\"erro\":\"sessao\"}",
        "options": {"responseCode": 401, "responseHeaders": {"entries": SEG}}}),
]
# Tem acesso? / Liberado?: saída 0 = sim, saída 1 = não
w_con = liga(("Página", "Ler config"), ("Ler config", "Ler sessões"), ("Ler sessões", "Sessão página"), ("Sessão página", "Registrar acesso (página)"),
             ("Registrar acesso (página)", "Tem acesso?"), ("API", "Ler config (api)"), ("Ler config (api)", "Ler sessões (api)"),
             ("Ler sessões (api)", "Sessão API"), ("Sessão API", "Registrar acesso (api)"), ("Registrar acesso (api)", "Liberado?"),
             ("Ler meta", "Ler cards"), ("Ler cards", "Calcular"), ("Calcular", "Responder dados"))
w_con["Tem acesso?"] = {"main": [[{"node": "Responder página", "type": "main", "index": 0}], [{"node": "Ir para o login", "type": "main", "index": 0}]]}
w_con["Liberado?"] = {"main": [[{"node": "Ler meta", "type": "main", "index": 0}], [{"node": "Negar dados", "type": "main", "index": 0}]]}

for arq, f in [("1-coleta-meta.json", fluxo("[CEO PAGO] Coleta Meta Ads (6 h)", m_nos, m_con, "Gasto, cliques e leads por anúncio e por dia da conta do Contador CEO, na tabela CEO PAGO Meta. Só leitura no Meta.")),
               ("2-coleta-piperun.json", fluxo("[CEO PAGO] Coleta PipeRun (30 min)", p_nos, p_con, "Oportunidades do Black Belt e do Outliers (origem, campanha, perfil, reunião, venda) na tabela CEO PAGO Cards. Só leitura no PipeRun.")),
               ("3-painel.json", fluxo("[CEO PAGO] Painel: página e API", w_nos, w_con, "Painel do tráfego pago do Contador CEO: página com login Google e lista de e-mails, API com os números calculados.", {"saveDataSuccessExecution": "none"}))]:
    open(os.path.join(AQUI, arq), "w", encoding="utf-8").write(json.dumps(f, ensure_ascii=False, indent=1))
    print(arq, len(f["nodes"]), "nós")
