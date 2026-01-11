export type OrcamentoRequestStatus = "pendente" | "em_contato" | "convertido" | "descartado";

export const STATUS_LABELS: Record<OrcamentoRequestStatus, string> = {
  pendente: "Pendente",
  em_contato: "Em Contato",
  convertido: "Convertido",
  descartado: "Descartado"
};

export const STATUS_COLORS: Record<OrcamentoRequestStatus, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  em_contato: "bg-blue-500/20 text-blue-300 border-blue-500/50",
  convertido: "bg-green-500/20 text-green-300 border-green-500/50",
  descartado: "bg-red-500/20 text-red-300 border-red-500/50"
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  estacas: "Estacas para fundação",
  fossa: "Fossa séptica",
  sumidouro: "Sumidouro / Poço",
  drenagem: "Drenagem pluvial",
  postes: "Postes / Cercas / Alambrados",
  outro: "Outro"
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  industrial: "Industrial",
  rural: "Rural"
};

export const SOIL_TYPE_LABELS: Record<string, string> = {
  terra_comum: "Terra comum",
  argiloso: "Argiloso",
  arenoso: "Arenoso",
  rochoso: "Rochoso",
  nao_sei: "Não sei informar"
};

export const ACCESS_LABELS: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil"
};

export const DEADLINE_LABELS: Record<string, string> = {
  urgente: "Urgente",
  "30_dias": "Até 30 dias",
  mais_30: "Mais de 30 dias"
};

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
};

