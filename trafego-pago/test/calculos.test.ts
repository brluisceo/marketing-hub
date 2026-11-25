import { describe, expect, it } from "vitest";
import { faixaVelocimetro, porCampanha, rankingLead, totaisMeta } from "../lib/calculos";
import { periodoAnterior, periodoDe } from "../lib/datas";
import { conferirNumeros } from "../lib/resumo";
import type { CampanhaDia } from "../lib/tipos";

const linha = (p: Partial<CampanhaDia>): CampanhaDia => ({
  data: "2026-11-07", campanha_id: "1", campanha_nome: "x", codigo: "08CEO2026", prefixo: null, objetivo: "lead",
  investimento: 0, impressoes: 0, cliques: 0, leads: 0, resultados: 0, frequencia: null, ...p,
});

describe("D3: CPL só com campanhas de lead", () => {
  const linhas = [
    linha({ campanha_id: "a", investimento: 1000, impressoes: 50000, cliques: 1000, leads: 20 }),
    linha({ campanha_id: "b", objetivo: "venda", investimento: 3000, impressoes: 50000, cliques: 500, leads: 5 }),
    linha({ campanha_id: "c", codigo: null, investimento: 9999, leads: 999 }), // fora do escopo
  ];
  const t = totaisMeta(linhas);
  it("ignora campanha fora do escopo", () => expect(t.investimento).toBe(4000));
  it("CPL = investimento de lead / leads de lead", () => expect(t.cpl).toBe(50));
  it("CPM e CTR sobre o escopo todo", () => {
    expect(t.cpm).toBe(40);
    expect(t.ctr).toBe(0.015);
  });
  it("sem leads, CPL é null (tela mostra —)", () => expect(totaisMeta([]).cpl).toBeNull());
});

describe("ranking", () => {
  it("só lead, mínimo de leads, menor custo primeiro", () => {
    const c = porCampanha([
      linha({ campanha_id: "a", campanha_nome: "A", investimento: 400, leads: 10 }),
      linha({ campanha_id: "b", campanha_nome: "B", investimento: 300, leads: 10 }),
      linha({ campanha_id: "c", campanha_nome: "C", investimento: 10, leads: 2 }),
      linha({ campanha_id: "d", campanha_nome: "D", objetivo: "venda", investimento: 1, leads: 50 }),
    ]);
    expect(rankingLead(c).map((x) => x.campanha_nome)).toEqual(["B", "A"]);
  });
});

describe("velocímetro", () => {
  it.each([[0.2, "vermelho"], [0.5, "amarelo"], [0.87, "verde"], [null, null]] as const)("%s → %s", (p, f) =>
    expect(faixaVelocimetro(p)).toBe(f));
});

describe("períodos", () => {
  it("ontem e anterior", () => {
    const p = periodoDe("ontem", "2026-11-09");
    expect(p).toEqual({ inicio: "2026-11-08", fim: "2026-11-08" });
    expect(periodoAnterior(p)).toEqual({ inicio: "2026-11-07", fim: "2026-11-07" });
  });
  it("7 dias termina ontem", () => expect(periodoDe("7d", "2026-11-09")).toEqual({ inicio: "2026-11-02", fim: "2026-11-08" }));
});

describe("conferência dos números do Claude", () => {
  const dados = { investimento: 4820, cpl: 50.208333, mql_pct: 0.517, leads: 96 };
  it("aceita números que existem nos dados", () => {
    expect(conferirNumeros("Investimos R$ 4.820,00, com 96 leads a R$ 50,21. MQL de 51,7% em 09/11/2026.", dados).ok).toBe(true);
  });
  it("barra número inventado", () => {
    const r = conferirNumeros("Investimos R$ 5.100 e geramos 96 leads.", dados);
    expect(r.ok).toBe(false);
    expect(r.estranhos).toEqual(["5.100"]);
  });
});
