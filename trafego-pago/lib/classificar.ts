import type { Objetivo } from "./tipos";

export interface Classificacao {
  codigo: string | null; // null = fora do relatório (D2)
  prefixo: string | null;
  objetivo: Objetivo;
}

/**
 * D2: a campanha é do Contador CEO quando tem o código NNCEOAAAA no nome
 * (inclusive com prefixo [ALC], [WCC], [IPE]). CCX e [CONTADORCEO] também entram.
 * Sem código (JC100K, ABSCON24, [wcc] minúsculo, IMPE, Growth...) fica de fora.
 */
export function extrairCodigo(nome: string): { codigo: string | null; prefixo: string | null } {
  const cod = nome.match(/(\d{2})CEO(20\d{2})/);
  if (cod) {
    const pre = nome.match(/^\[([A-Z]{2,5})\]-\[\d{2}CEO20\d{2}\]/);
    return { codigo: `${cod[1]}CEO${cod[2]}`, prefixo: pre?.[1] ?? null };
  }
  if (/^CCX[-\s]/.test(nome)) return { codigo: "CCX", prefixo: null };
  if (nome.startsWith("[CONTADORCEO]")) return { codigo: "CONTADORCEO", prefixo: null };
  return { codigo: null, prefixo: null };
}

/** D3: objetivo pelo nome; se o nome não diz, pelo objetivo da campanha no Meta. */
export function classificarObjetivo(nome: string, objetivoMeta?: string): Objetivo {
  const n = nome.toUpperCase();
  if (/\[(FB)?LEADS\]/.test(n)) return "lead";
  if (/\[VENDAS\]/.test(n) || /^CCX-VENDAS/.test(n)) return "venda";
  if (/\[ENGAJAMENTO\]|WHATSAPP/.test(n)) return "whatsapp";
  if (/\[TRAFEGO\]|\[SEGUIDORES\]/.test(n)) return "perfil";
  switch (objetivoMeta) {
    case "OUTCOME_LEADS":
    case "LEAD_GENERATION":
      return "lead";
    case "OUTCOME_SALES":
    case "CONVERSIONS":
      return "venda";
    case "OUTCOME_ENGAGEMENT":
    case "MESSAGES":
      return "whatsapp";
    case "OUTCOME_TRAFFIC":
    case "OUTCOME_AWARENESS":
      return "perfil";
    default:
      return "outro";
  }
}

export function classificar(nome: string, objetivoMeta?: string): Classificacao {
  return { ...extrairCodigo(nome), objetivo: classificarObjetivo(nome, objetivoMeta) };
}
