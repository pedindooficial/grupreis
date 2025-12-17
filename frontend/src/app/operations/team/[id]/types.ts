export type Status = "pendente" | "em_execucao" | "concluida" | "cancelada";
export type PaymentMethod = "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro";
export type ViewTab = "disponiveis" | "execucao" | "concluidas";
export type MainView = "home" | "ops";
export type DateFilter = "all" | "today" | "tomorrow" | "week" | "month";

export interface Job {
  _id: string;
  title: string;
  status: Status;
  clientName?: string;
  site?: string;
  siteLatitude?: number;
  siteLongitude?: number;
  plannedDate?: string;
  startedAt?: string;
  finishedAt?: string;
  services?: any[];
  team?: string;
  notes?: string;
  received?: boolean;
  receivedAt?: Date;
  receipt?: string;
  receiptFileKey?: string;
  clientSignature?: string;
  clientSignedAt?: Date;
  finalValue?: number;
  value?: number;
}

export interface TeamData {
  team: {
    _id: string;
    name: string;
    operationPass?: string;
  };
  jobs: Job[];
}

