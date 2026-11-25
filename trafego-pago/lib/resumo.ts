export interface EnvClaude { ANTHROPIC_API_KEY?: string; CLAUDE_MODEL: string }

/*
 * Leitura do dia: o Claude recebe os números JÁ CALCULADOS e só redige.
 * Antes de salvar, conferirNumeros() verifica se todo número do texto existe nos
 * dados. Se o Claude inventar ou arredondar errado, o texto é descartado e entra
 * a leitura-modelo, montada só com os números calculados.
 */

export interface Leitura {
  resumo: [string, string, string];
  destaques: string[];
  alerta: string;
  proxima_acao: { acao: string; responsavel: string; data: string };
}

const SISTEMA = `Você escreve o relatório diário de tráfego pago do Contador CEO para o Rogério (CEO).
Regras:
- Use SOMENTE números que estão no JSON recebido. Nunca calcule, estime ou arredonde de outro jeito.
- Valores em reais no formato R$ 1.234,56. Percentuais com vírgula (52,3%).
- Português do Brasil, frases curtas, sem jargão. Diga "custo por lead" além de "CPL".
- Leads do Meta e do CRM são números diferentes: nunca some nem troque um pelo outro.
- Campanha em aprendizado: não sugerir mexer em orçamento, público ou criativo.
- Se um número vier null, ele ainda não existe: não comente.
Responda APENAS com JSON, sem markdown:
{"resumo":["linha 1","linha 2","linha 3"],"destaques":["...","...","..."],"alerta":"...","proxima_acao":{"acao":"...","responsavel":"Henrique","data":"DD/MM/AAAA"}}`;

/** Lista todos os números de um objeto (recursivo). */
export function numerosDoObjeto(o: unknown, out: number[] = []): number[] {
  if (typeof o === "number" && Number.isFinite(o)) out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => numerosDoObjeto(x, out));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => numerosDoObjeto(x, out));
  return out;
}

function lerNumeroBR(t: string): number {
  // "1.234,56" -> 1234.56 ; "52,3" -> 52.3 ; "1.234" -> 1234
  const limpo = t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Number(limpo);
}

/** true se todo número do texto bate com algum número dos dados (valor, %, ou arredondamento). */
export function conferirNumeros(texto: string, dados: unknown): { ok: boolean; estranhos: string[] } {
  const base = numerosDoObjeto(dados);
  const candidatos = new Set<number>();
  for (const n of base) {
    for (const v of [n, n * 100]) {
      candidatos.add(v);
      for (const casas of [0, 1, 2]) candidatos.add(Number(v.toFixed(casas)));
    }
  }
  const semDatas = texto.replace(/\b\d{2}\/\d{2}(\/\d{4})?\b/g, " ");
  const tokens = semDatas.match(/\d[\d.,]*\d|\d/g) ?? [];
  const estranhos: string[] = [];
  for (const t of tokens) {
    const v = lerNumeroBR(t);
    if (!Number.isFinite(v)) continue;
    if (Number.isInteger(v) && v <= 10) continue; // "3 destaques", "2 criativos"
    const bate = [...candidatos].some((c) => Math.abs(c - v) <= Math.max(0.005, Math.abs(c) * 0.0005));
    if (!bate) estranhos.push(t);
  }
  return { ok: estranhos.length === 0, estranhos };
}

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Leitura sem IA, só com números calculados. Usada quando o Claude falha ou é barrado. */
export function leituraModelo(d: {
  investimento: number;
  leads_meta: number;
  cpl: number | null;
  custo_por_reuniao: number | null;
  reunioes: number | null;
}, dataProximaAcao: string): Leitura {
  return {
    resumo: [
      `Investimento de ${brl(d.investimento)} e ${d.leads_meta} leads no Meta.`,
      `Custo por lead de ${brl(d.cpl)}.`,
      d.reunioes === null
        ? "Reuniões e contratos entram quando o PipeRun estiver ligado."
        : `${d.reunioes} reuniões do pago, a ${brl(d.custo_por_reuniao)} cada.`,
    ],
    destaques: [],
    alerta: "Leitura automática: texto do Claude indisponível ou barrado na conferência.",
    proxima_acao: { acao: "Revisar o relatório no sistema", responsavel: "Henrique", data: dataProximaAcao },
  };
}

export async function escreverLeitura(env: EnvClaude, dados: unknown): Promise<Leitura | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL,
      max_tokens: 1200,
      system: SISTEMA,
      messages: [{ role: "user", content: JSON.stringify(dados) }],
    }),
  });
  if (!r.ok) return null;
  const corpo = (await r.json()) as { content?: { type: string; text?: string }[] };
  const texto = (corpo.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  try {
    const l = JSON.parse(texto.replace(/```json|```/g, "").trim()) as Leitura;
    if (!Array.isArray(l.resumo) || l.resumo.length !== 3) return null;
    return l;
  } catch {
    return null;
  }
}
