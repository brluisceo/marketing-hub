import type { Periodo } from "./tipos";

/** Data de hoje (AAAA-MM-DD) no fuso informado. */
export function hojeNoFuso(fuso: string, agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(agora);
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const t = Date.UTC(a, m - 1, d) + dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** "ontem" = último dia completo. "7d" e "30d" terminam ontem. */
export function periodoDe(nome: string, hoje: string): Periodo {
  const ontem = somarDias(hoje, -1);
  if (nome === "7d") return { inicio: somarDias(ontem, -6), fim: ontem };
  if (nome === "30d") return { inicio: somarDias(ontem, -29), fim: ontem };
  return { inicio: ontem, fim: ontem };
}

/** Período anterior de mesmo tamanho, para a variação. */
export function periodoAnterior(p: Periodo): Periodo {
  const [a, m, d] = p.inicio.split("-").map(Number) as [number, number, number];
  const [a2, m2, d2] = p.fim.split("-").map(Number) as [number, number, number];
  const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000) + 1;
  return { inicio: somarDias(p.inicio, -dias), fim: somarDias(p.inicio, -1) };
}

/** D5: sem lead registrado pelo Meta de mai/24 a mar/25. Fica fora de comparações. */
export function dentroDoPeriodoSemLead(p: Periodo): boolean {
  return p.inicio <= "2025-03-31" && p.fim >= "2024-05-01";
}
