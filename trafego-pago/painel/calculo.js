/*
 * Cálculo do painel do pago do Contador CEO.
 * Roda dentro do nó "Calcular" do fluxo [CEO PAGO] Painel (n8n) e nos testes locais.
 * Entrada: linhas das tabelas CEO PAGO Meta e CEO PAGO Cards, config e período.
 * Regras: docs/decisoes.md (D1 a D16) e docs/referencia-monitor.md.
 * Número só sai daqui. Dado ausente = null (a página mostra "—").
 */
function CALC_PAGO(ctx) {
  const cfg = ctx.config || {};
  const hoje = ctx.hoje;                       // AAAA-MM-DD no fuso de Brasília
  const nomePer = ['ontem', '7d', '30d'].indexOf(ctx.periodo) >= 0 ? ctx.periodo : 'ontem';

  // ---------- datas ----------
  const somar = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const ontem = somar(hoje, -1);
  const per = nomePer === '7d' ? { de: somar(ontem, -6), ate: ontem } : nomePer === '30d' ? { de: somar(ontem, -29), ate: ontem } : { de: ontem, ate: ontem };
  const dias = Math.round((Date.parse(per.ate) - Date.parse(per.de)) / 864e5) + 1;
  const ant = { de: somar(per.de, -dias), ate: somar(per.de, -1) };
  const p30 = { de: somar(ontem, -29), ate: ontem };
  const dentro = (s, p) => !!s && String(s).slice(0, 10) >= p.de && String(s).slice(0, 10) <= p.ate;

  // ---------- D2 e D3: escopo e objetivo pela campanha ----------
  function codigo(nome) {
    const n = String(nome || '');
    const m = n.match(/(\d{2})CEO(20\d{2})/);
    if (m) { const pre = n.match(/^\[([A-Z]{2,5})\]-\[\d{2}CEO20\d{2}\]/); return { codigo: m[1] + 'CEO' + m[2], prefixo: pre ? pre[1] : null }; }
    if (/^CCX[-\s]/.test(n)) return { codigo: 'CCX', prefixo: null };
    if (n.indexOf('[CONTADORCEO]') === 0) return { codigo: 'CONTADORCEO', prefixo: null };
    return { codigo: null, prefixo: null };
  }
  function objetivo(nome, objMeta) {
    const n = String(nome || '').toUpperCase();
    if (/\[(FB)?LEADS\]/.test(n)) return 'lead';
    if (/\[VENDAS\]/.test(n) || /^CCX-VENDAS/.test(n)) return 'venda';
    if (/\[ENGAJAMENTO\]|WHATSAPP/.test(n)) return 'whatsapp';
    if (/\[TRAFEGO\]|\[SEGUIDORES\]/.test(n)) return 'perfil';
    const o = String(objMeta || '');
    if (o === 'OUTCOME_LEADS' || o === 'LEAD_GENERATION') return 'lead';
    if (o === 'OUTCOME_SALES' || o === 'CONVERSIONS') return 'venda';
    if (o === 'OUTCOME_ENGAGEMENT' || o === 'MESSAGES') return 'whatsapp';
    if (o === 'OUTCOME_TRAFFIC' || o === 'OUTCOME_AWARENESS') return 'perfil';
    return 'outro';
  }
  const div = (a, b) => (a == null || b == null || !b) ? null : a / b;
  const varia = (a, b) => (a == null || b == null || !b) ? null : (a - b) / b;
  const soma = (xs, f) => xs.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // ---------- linhas do Meta já classificadas ----------
  const meta = (ctx.meta || []).filter(r => r && r.dia).map(r => {
    const c = codigo(r.campaign_name);
    return Object.assign({}, r, { codigo: c.codigo, prefixo: c.prefixo, obj: objetivo(r.campaign_name, r.objective),
      spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, link_clicks: Number(r.link_clicks) || 0,
      leads_meta: Number(r.leads_meta) || 0, frequency: r.frequency == null || r.frequency === '' ? null : Number(r.frequency) });
  });
  const escopo = meta.filter(r => r.codigo);
  const foraEscopo = meta.filter(r => !r.codigo);

  function totais(p) {
    const e = escopo.filter(r => dentro(r.dia, p)), l = e.filter(r => r.obj === 'lead');
    const inv = soma(e, r => r.spend), imp = soma(e, r => r.impressions), cli = soma(e, r => r.link_clicks);
    const invL = soma(l, r => r.spend), leads = soma(l, r => r.leads_meta);
    return { investimento: inv, investimento_lead: invL, impressoes: imp, cliques: cli, leads_meta: leads,
      ctr: div(cli, imp), cpm: imp ? inv / imp * 1000 : null, cpl: div(invL, leads), tem: e.length > 0 };
  }

  // ---------- cards do PipeRun (D1: funis dos dois times) ----------
  const TIMES = { 101027: 'black_belt', 108929: 'outliers', 108930: 'outliers', 108931: 'outliers' };
  const UTM_ADS = /(facebook|instagram|\bfb\b|\big\b|meta|google|gads|tiktok|linkedin|youtube)/i;
  const cards = (ctx.cards || []).filter(c => c && c.deal_id && TIMES[Number(c.funil_id)]).map(c => Object.assign({}, c, { time: TIMES[Number(c.funil_id)] }));
  const ehPago = c => c.origem_grupo === 'pago' || (!!c.utm_campaign && UTM_ADS.test(String(c.utm_source || '') + ' ' + String(c.utm_medium || '')));
  const pagos = cards.filter(ehPago);
  const ganhou = c => Number(c.status) === 1;
  // D4: MQL = dono ou sócio + faturamento no critério (resposta "sim" de perfil no formulário)
  const ehMQL = c => /^s/i.test(String(c.perfil || ''));
  const temResposta = c => !!String(c.perfil || '').trim();
  const valorContrato = c => cfg.regra_valor === 'ps_mais_mrr' ? (Number(c.valor_setup) || 0) + (Number(c.valor_mrr) || 0) : (Number(c.valor_setup) || 0);

  function comercial(p) {
    const novos = pagos.filter(c => dentro(c.criado_em, p));
    const resp = novos.filter(temResposta);
    const reun = pagos.filter(c => dentro(c.realizada_em, p));
    const vend = pagos.filter(c => ganhou(c) && dentro(c.fechado_em, p));
    const por_time = {};
    ['black_belt', 'outliers'].forEach(t => {
      const n = novos.filter(c => c.time === t), r = reun.filter(c => c.time === t), v = vend.filter(c => c.time === t);
      por_time[t] = { leads: n.length, mql: n.filter(ehMQL).length, reunioes: r.length, contratos: v.length, lead_reuniao: div(r.length, n.length) };
    });
    return { leads_crm: cards.length ? novos.length : null, mql: resp.length ? resp.filter(ehMQL).length : null,
      mql_pct: resp.length ? resp.filter(ehMQL).length / resp.length : null, respostas: resp.length,
      reunioes: cards.length ? reun.length : null, contratos: cards.length ? vend.length : null,
      valor_contratos: cards.length ? soma(vend, valorContrato) : null, por_time };
  }

  const m = totais(per), mA = totais(ant), m30 = totais(p30);
  const c = comercial(per), cA = comercial(ant), c30 = comercial(p30);
  const ind = {
    custo_por_reuniao: div(m.investimento, c.reunioes), custo_por_mql: div(m.investimento_lead, c.mql),
    mql_reuniao: div(c.reunioes, c.mql), cac_30d: div(m30.investimento, c30.contratos), retorno_30d: div(c30.valor_contratos, m30.investimento)
  };
  const indA = { custo_por_reuniao: div(mA.investimento, cA.reunioes), custo_por_mql: div(mA.investimento_lead, cA.mql) };

  // ---------- campanhas do período (Meta + PipeRun pelo nome, como o Monitor) ----------
  const porCamp = {};
  escopo.filter(r => dentro(r.dia, per)).forEach(r => {
    const k = String(r.campaign_id || norm(r.campaign_name));
    const o = porCamp[k] || (porCamp[k] = { nome: r.campaign_name, codigo: r.codigo, obj: r.obj, investimento: 0, impressoes: 0, cliques: 0, leads: 0, fq: 0 });
    o.investimento += r.spend; o.impressoes += r.impressions; o.cliques += r.link_clicks; o.leads += r.leads_meta;
    if (r.frequency != null) o.fq += r.frequency * r.impressions;
  });
  const crmPorCamp = {};
  pagos.forEach(c => { const k = norm(c.campanha); if (!k) return; const o = crmPorCamp[k] || (crmPorCamp[k] = { leads: 0, mql: 0, reunioes: 0, vendas: 0 });
    if (dentro(c.criado_em, per)) { o.leads++; if (ehMQL(c)) o.mql++; } if (dentro(c.realizada_em, per)) o.reunioes++; if (ganhou(c) && dentro(c.fechado_em, per)) o.vendas++; });
  const campanhas = Object.values(porCamp).map(o => {
    const crm = crmPorCamp[norm(o.nome)] || null;
    const freq = o.impressoes ? o.fq / o.impressoes : null;
    return { nome: o.nome, codigo: o.codigo, objetivo: o.obj, investimento: o.investimento, leads: o.leads,
      cpl: o.obj === 'lead' ? div(o.investimento, o.leads) : null, ctr: div(o.cliques, o.impressoes), cpm: o.impressoes ? o.investimento / o.impressoes * 1000 : null,
      frequencia: freq || null, alerta_frequencia: !!freq && freq > 3,
      crm_leads: crm ? crm.leads : null, crm_mql: crm ? crm.mql : null, reunioes: crm ? crm.reunioes : null, vendas: crm ? crm.vendas : null,
      custo_mql: crm && crm.mql ? o.investimento / crm.mql : null };
  }).sort((a, b) => b.investimento - a.investimento);
  const ranking = campanhas.filter(x => x.objetivo === 'lead' && x.investimento > 0 && x.leads >= 5 && x.cpl != null).sort((a, b) => a.cpl - b.cpl).slice(0, 3);

  // ---------- série diária (14 dias) e histórico mensal (12 meses) ----------
  const serie = [];
  for (let i = 13; i >= 0; i--) { const d = somar(per.ate, -i), e = escopo.filter(r => r.dia === d), l = e.filter(r => r.obj === 'lead');
    serie.push({ dia: d, investimento: soma(e, r => r.spend), leads: soma(l, r => r.leads_meta), cpl: div(soma(l, r => r.spend), soma(l, r => r.leads_meta)) }); }
  const mensal = {};
  escopo.forEach(r => { const k = r.dia.slice(0, 7); const o = mensal[k] || (mensal[k] = { mes: k, investimento: 0, investimento_lead: 0, leads: 0 });
    o.investimento += r.spend; if (r.obj === 'lead') { o.investimento_lead += r.spend; o.leads += r.leads_meta; } });
  const limiteMes = somar(hoje, -365).slice(0, 7);
  const historico = Object.values(mensal).filter(o => o.mes >= limiteMes).sort((a, b) => a.mes.localeCompare(b.mes))
    .map(o => Object.assign(o, { cpl: div(o.investimento_lead, o.leads) }));

  // ---------- eventos e códigos ----------
  let nomes = {}; try { nomes = JSON.parse(cfg.eventos_json || '{}'); } catch (e) { nomes = {}; }
  const porCod = {};
  escopo.forEach(r => { const o = porCod[r.codigo] || (porCod[r.codigo] = { codigo: r.codigo, prefixo: r.prefixo, campanhas: {}, objetivos: {}, investimento: 0, ultimo_dia: '' });
    o.campanhas[r.campaign_id || r.campaign_name] = r.campaign_name; o.objetivos[r.obj] = 1; o.investimento += r.spend; if (r.dia > o.ultimo_dia) o.ultimo_dia = r.dia; });
  Object.keys(nomes).forEach(k => { if (!porCod[k]) porCod[k] = { codigo: k, prefixo: null, campanhas: {}, objetivos: {}, investimento: 0, ultimo_dia: '' }; });
  const eventos = Object.values(porCod).map(o => { const n = nomes[o.codigo] || {};
    return { codigo: o.codigo, prefixo: o.prefixo, nome: n.nome || null, cidade: n.cidade || null, data_evento: n.data || null, status: n.status || 'ativo',
      campanhas: Object.values(o.campanhas), objetivos: Object.keys(o.objetivos), investimento: o.investimento, ultimo_dia: o.ultimo_dia }; })
    .sort((a, b) => b.investimento - a.investimento);

  // ---------- velocímetro (D9) ----------
  const metaLeads = Number(cfg.leads_dia) > 0 ? Number(cfg.leads_dia) * dias : null;
  const pct = div(m.leads_meta, metaLeads);
  const faixa = pct == null ? null : pct < 0.4 ? 'vermelho' : pct < 0.65 ? 'amarelo' : 'verde';

  // ---------- leitura automática (sem IA): só números calculados ----------
  const brl = v => v == null ? '—' : 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const leitura = { resumo: [
    'Investimento de ' + brl(m.investimento) + ' e ' + m.leads_meta + ' leads no Meta.',
    'Custo por lead de ' + brl(m.cpl) + (c.mql != null ? '; ' + c.mql + ' MQL no CRM.' : '.'),
    c.reunioes == null ? 'Reuniões e contratos aparecem quando a coleta do PipeRun rodar.' : c.reunioes + (c.reunioes === 1 ? ' reunião' : ' reuniões') + ' do pago, a ' + brl(ind.custo_por_reuniao) + ' cada.'
  ], origem: 'modelo' };

  const ultimaMeta = meta.reduce((x, r) => String(r.atualizado_em || '') > x ? String(r.atualizado_em) : x, '');
  const ultimaCrm = cards.reduce((x, r) => String(r.atualizado_em || '') > x ? String(r.atualizado_em) : x, '');

  return {
    ok: true, periodo: Object.assign({ nome: nomePer }, per), anterior: ant, gerado: ctx.agora || '',
    meta: m, comercial: c, indicadores: ind,
    variacoes: { investimento: varia(m.investimento, mA.investimento), leads_meta: varia(m.leads_meta, mA.leads_meta), cpl: varia(m.cpl, mA.cpl),
      custo_por_reuniao: varia(ind.custo_por_reuniao, indA.custo_por_reuniao), custo_por_mql: varia(ind.custo_por_mql, indA.custo_por_mql),
      mql_pct_pontos: c.mql_pct != null && cA.mql_pct != null ? c.mql_pct - cA.mql_pct : null },
    metas: { leads_periodo: metaLeads, custo_reuniao: Number(cfg.custo_reuniao) > 0 ? Number(cfg.custo_reuniao) : null },
    velocimetro: { leads: m.leads_meta, meta: metaLeads, pct, faixa },
    campanhas, ranking, serie_14d: serie, historico_mensal: historico, eventos,
    fora_escopo: { campanhas: new Set(foraEscopo.map(r => r.campaign_id || r.campaign_name)).size, investimento: soma(foraEscopo.filter(r => dentro(r.dia, per)), r => r.spend) },
    leitura,
    fontes: { meta_atualizado: ultimaMeta || null, crm_atualizado: ultimaCrm || null, conta: '233916409249136' }
  };
}
if (typeof module !== 'undefined') module.exports = { CALC_PAGO };
