import type { CampanhaDia, CrmDia, FormsDia, Objetivo } from "./tipos";

/*
 * Todas as contas do relatório ficam aqui, em código. O Claude só redige (regra
 * "IA interpreta, não calcula"). Divisão por zero ou dado ausente vira null,
 * e a tela mostra "—".
 */

export const div = (a: number | null, b: number | null): number | null =>
  a === null || b === null || b === 0 ? null : a / b;

export const variacao = (atual: number | null, anterior: number | null): number | null =>
  atual === null || anterior === null || anterior === 0 ? null : (atual - anterior) / anterior;

const soma = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export interface Totais {
  investimento: number;          // todo o escopo (D2)
  investimento_lead: number;     // só campanhas de lead (D3)
  impressoes: number;
  cliques: number;
  leads_meta: number;            // campo "lead", só campanhas de lead
  ctr: number | null;
  cpm: number | null;
  cpl: number | null;            // D3: investimento_lead / leads_meta
  por_objetivo: Record<Objetivo, { investimento: number; resultados: number }>;
}

export function totaisMeta(linhas: CampanhaDia[]): Totais {
  const escopo = linhas.filter((l) => l.codigo !== null);
  const lead = escopo.filter((l) => l.objetivo === "lead");
  const investimento = soma(escopo, (l) => l.investimento);
  const impressoes = soma(escopo, (l) => l.impressoes);
  const cliques = soma(escopo, (l) => l.cliques);
  const investimento_lead = soma(lead, (l) => l.investimento);
  const leads_meta = soma(lead, (l) => l.leads);
  const por_objetivo = {} as Totais["por_objetivo"];
  for (const o of ["lead", "venda", "whatsapp", "perfil", "outro"] as Objetivo[]) {
    const g = escopo.filter((l) => l.objetivo === o);
    por_objetivo[o] = { investimento: soma(g, (l) => l.investimento), resultados: soma(g, (l) => l.resultados) };
  }
  return {
    investimento,
    investimento_lead,
    impressoes,
    cliques,
    leads_meta,
    ctr: div(cliques, impressoes),
    cpm: (() => { const v = div(investimento, impressoes); return v === null ? null : v * 1000; })(),
    cpl: div(investimento_lead, leads_meta),
    por_objetivo,
  };
}

export interface Comercial {
  leads_crm: number | null;
  mql: number | null;
  mql_pct: number | null;
  mql_quentes: number | null;
  reunioes: number | null;
  contratos: number | null;
  valor_contratos: number | null;
  por_time: Record<string, { leads: number; mql_quentes: number; reunioes: number; contratos: number; lead_reuniao: number | null }>;
}

export function totaisComercial(crm: CrmDia[] | null, forms: FormsDia[] | null): Comercial {
  const temCrm = crm !== null && crm.length > 0;
  const temForms = forms !== null && forms.length > 0;
  const por_time: Comercial["por_time"] = {};
  if (temCrm) {
    for (const t of ["black_belt", "outliers"]) {
      const g = crm!.filter((c) => c.time === t);
      const leads = soma(g, (c) => c.leads);
      const reunioes = soma(g, (c) => c.reunioes);
      por_time[t] = {
        leads,
        mql_quentes: soma(g, (c) => c.mql_quentes),
        reunioes,
        contratos: soma(g, (c) => c.contratos),
        lead_reuniao: div(reunioes, leads),
      };
    }
  }
  const mql = temForms ? soma(forms!, (f) => f.mql) : null;
  const leadsForms = temForms ? soma(forms!, (f) => f.leads) : null;
  return {
    leads_crm: temCrm ? soma(crm!, (c) => c.leads) : null,
    mql,
    mql_pct: div(mql, leadsForms),
    mql_quentes: temForms ? soma(forms!, (f) => f.mql_quentes) : null,
    reunioes: temCrm ? soma(crm!, (c) => c.reunioes) : null,
    contratos: temCrm ? soma(crm!, (c) => c.contratos) : null,
    valor_contratos: temCrm ? soma(crm!, (c) => c.valor_contratos) : null,
    por_time,
  };
}

/** Indicadores que cruzam Meta e comercial. CAC e retorno: sempre 30 dias (contrato demora). */
export function indicadores(meta: Totais, com: Comercial, meta30: Totais, com30: Comercial) {
  return {
    custo_por_reuniao: div(meta.investimento, com.reunioes),
    custo_por_mql: div(meta.investimento_lead, com.mql),
    mql_reuniao: div(com.reunioes, com.mql),
    cac_30d: div(meta30.investimento, com30.contratos),
    retorno_30d: div(com30.valor_contratos, meta30.investimento),
  };
}

/** Velocímetro: % da meta de leads. Faixas da imagem de referência. */
export function faixaVelocimetro(pct: number | null): "vermelho" | "amarelo" | "verde" | null {
  if (pct === null) return null;
  if (pct < 0.4) return "vermelho";
  if (pct < 0.65) return "amarelo";
  return "verde";
}

export interface LinhaCampanha {
  campanha_nome: string;
  codigo: string | null;
  objetivo: Objetivo;
  investimento: number;
  leads: number;
  resultados: number;
  cpl: number | null;
  ctr: number | null;
  cpm: number | null;
  frequencia: number | null;
  alerta_frequencia: boolean;
}

/** Agrega o período por campanha. Frequência: média ponderada por impressões (aproximação). */
export function porCampanha(linhas: CampanhaDia[]): LinhaCampanha[] {
  const mapa = new Map<string, CampanhaDia[]>();
  for (const l of linhas.filter((x) => x.codigo !== null)) {
    const g = mapa.get(l.campanha_id) ?? [];
    g.push(l);
    mapa.set(l.campanha_id, g);
  }
  const out: LinhaCampanha[] = [];
  for (const g of mapa.values()) {
    const ult = g[g.length - 1]!;
    const inv = soma(g, (l) => l.investimento);
    const imp = soma(g, (l) => l.impressoes);
    const cli = soma(g, (l) => l.cliques);
    const leads = soma(g, (l) => l.leads);
    const freqPond = soma(g, (l) => (l.frequencia ?? 0) * l.impressoes);
    const frequencia = imp > 0 && g.some((l) => l.frequencia !== null) ? freqPond / imp : null;
    out.push({
      campanha_nome: ult.campanha_nome,
      codigo: ult.codigo,
      objetivo: ult.objetivo,
      investimento: inv,
      leads,
      resultados: soma(g, (l) => l.resultados),
      cpl: ult.objetivo === "lead" ? div(inv, leads) : null,
      ctr: div(cli, imp),
      cpm: (() => { const v = div(inv, imp); return v === null ? null : v * 1000; })(),
      frequencia,
      alerta_frequencia: frequencia !== null && frequencia > 3,
    });
  }
  return out.sort((a, b) => b.investimento - a.investimento);
}

/** Ranking só entre campanhas de lead (D3), menor custo primeiro, mínimo de leads para não premiar acaso. */
export function rankingLead(campanhas: LinhaCampanha[], minimoLeads = 5): LinhaCampanha[] {
  return campanhas
    .filter((c) => c.objetivo === "lead" && c.leads >= minimoLeads && c.cpl !== null)
    .sort((a, b) => (a.cpl ?? Infinity) - (b.cpl ?? Infinity))
    .slice(0, 3);
}
