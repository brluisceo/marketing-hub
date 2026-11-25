export type Objetivo = "lead" | "venda" | "whatsapp" | "perfil" | "outro";
export type Time = "black_belt" | "outliers";

export interface CampanhaDia {
  data: string;
  campanha_id: string;
  campanha_nome: string;
  codigo: string | null;
  prefixo: string | null;
  objetivo: Objetivo;
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  resultados: number;
  frequencia: number | null;
}

export interface CrmDia {
  data: string;
  time: Time;
  leads: number;
  mql_quentes: number;
  reunioes: number;
  contratos: number;
  valor_contratos: number;
}

export interface FormsDia {
  data: string;
  leads: number;
  mql: number;
  mql_quentes: number;
}

export interface Periodo {
  inicio: string; // AAAA-MM-DD, inclusivo
  fim: string;    // AAAA-MM-DD, inclusivo
}
