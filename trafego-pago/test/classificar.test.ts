import { describe, expect, it } from "vitest";
import { classificar } from "../lib/classificar";

// Nomes reais do arquivo top 50 do Meta (nov/2026).
describe("D2: escopo pelo código CEO", () => {
  it.each([
    ["[08CEO2026]-[LEADS]-[DIAGNOSTICO]", "08CEO2026", null, "lead"],
    ["[ALC]-[04CEO2026]-[LEADS]-[03]-[BRASILIA]", "04CEO2026", "ALC", "lead"],
    ["[WCC]-[02CEO2026]-[LEADS]-[02]-[CAMPINAS]", "02CEO2026", "WCC", "lead"],
    ["[IPE]-[03CEO2026]-[VENDAS]-[01]", "03CEO2026", "IPE", "venda"],
    ["CCX-Vendas-02", "CCX", null, "venda"],
    ["[20CEO2026]-[ENGAJAMENTO]-[WHATSAPP] - Belo Horizonte v2", "20CEO2026", null, "whatsapp"],
    ["[01CEO2026]-[TRAFEGO]-[01]", "01CEO2026", null, "perfil"],
    ["[CONTADORCEO][TRAFEGO] CAMPANHA PERFIL", "CONTADORCEO", null, "perfil"],
  ])("%s entra", (nome, codigo, prefixo, objetivo) => {
    expect(classificar(nome)).toEqual({ codigo, prefixo, objetivo });
  });

  it.each([
    "[JC100K] CAPTACAO",
    "[ABSCON24] CAMPANHA DE VENDAS",
    "[wcc][v][bh][10102025] 22092025-01",
    "[icc][l] 03072025-3",
    "[IPE][VENDAS][QUENTE] 22/11/2024",
    "IMPE-Leads-01 [VIDEOS]",
    "[GROWTH][FUNDO][INSTA][CADASTROS]",
  ])("%s fica de fora", (nome) => {
    expect(classificar(nome).codigo).toBeNull();
  });

  it("usa o objetivo do Meta quando o nome não diz", () => {
    expect(classificar("[09CEO2026]-[TESTE]", "OUTCOME_LEADS").objetivo).toBe("lead");
  });
});
