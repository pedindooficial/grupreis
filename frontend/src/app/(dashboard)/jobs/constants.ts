export type Status = "pendente" | "em_execucao" | "concluida" | "cancelada";

export const STATUS_LABEL: Record<Status, string> = {
  pendente: "Pendente",
  em_execucao: "Em execução",
  concluida: "Concluída",
  cancelada: "Cancelada"
};

export const STATUS_COLORS: Record<Status, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  em_execucao: "bg-blue-500/20 text-blue-300 border-blue-500/50",
  concluida: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
  cancelada: "bg-red-500/20 text-red-300 border-red-500/50"
};

export const SERVICES = [
  { group: "1. Construção civil e fundações", value: "1.1", label: "Perfuração de Estacas para Fundações Residenciais e Comerciais" },
  { group: "1. Construção civil e fundações", value: "1.3", label: "Abertura de Furos para Sapatas, Brocas e Pilares" },
  { group: "1. Construção civil e fundações", value: "1.4", label: "Perfuração para Estacas Profundas" },
  { group: "2. Saneamento e drenagem", value: "2.1", label: "Perfuração de Fossas Sépticas" },
  { group: "2. Saneamento e drenagem", value: "2.2", label: "Abertura de Sumidouros" },
  { group: "2. Saneamento e drenagem", value: "2.3", label: "Poços de Infiltração" },
  { group: "2. Saneamento e drenagem", value: "2.4", label: "Perfuração para Drenagem de Águas Pluviais" },
  { group: "2. Saneamento e drenagem", value: "2.5", label: "Ampliação e Recuperação de Sistemas Antigos" },
  { group: "3. Construção e estruturas", value: "3.1", label: "Abertura de Furos para Alambrados e Postes" },
  { group: "3. Construção e estruturas", value: "3.2", label: "Perfuração para Bases de Torres, Placas e Estruturas Metálicas" },
  { group: "3. Construção e estruturas", value: "3.3", label: "Abertura de Furos para Contenções, Ancoragens e Reforço Estrutural" },
  { group: "4. Serviços rurais e agro", value: "4.1", label: "Abertura de Buracos para Mourões e Cercas" },
  { group: "4. Serviços rurais e agro", value: "4.2", label: "Perfuração para Irrigação" },
  { group: "4. Serviços rurais e agro", value: "4.3", label: "Sondagem Leve do Solo (Avaliação Inicial)" }
];

export const LOCAL_TYPES = ["Residencial", "Comercial", "Industrial", "Rural"];
export const SOIL_TYPES = ["Terra comum", "Argiloso", "Arenoso", "Rochoso", "Não sei informar"];

export const CATALOG_DIAMETERS = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120];

export const ACCESS_TYPES = [
  "Acesso livre e desimpedido",
  "Algumas limitações",
  "Acesso restrito ou complicado"
];

export const CATEGORIES = [
  "Estacas para fundação",
  "Fossa séptica",
  "Sumidouro / Poço",
  "Drenagem pluvial",
  "Postes / Cercas / Alambrados",
  "Outro (especifique)"
];

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" }
];

export const SERVICE_DEFAULT_CATS: Record<string, string[]> = {
  "1.1": ["Estacas para fundação"],
  "1.3": ["Estacas para fundação"],
  "1.4": ["Estacas para fundação"],
  "2.1": ["Fossa séptica"],
  "2.2": ["Sumidouro / Poço"],
  "2.3": ["Drenagem pluvial"],
  "2.4": ["Drenagem pluvial"],
  "2.5": ["Drenagem pluvial"],
  "3.1": ["Postes / Cercas / Alambrados"],
  "3.2": ["Estacas para fundação"],
  "3.3": ["Estacas para fundação"],
  "4.1": ["Postes / Cercas / Alambrados"],
  "4.2": ["Outro (especifique)"],
  "4.3": ["Outro (especifique)"]
};

