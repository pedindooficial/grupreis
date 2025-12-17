export interface ClientAddress {
  _id?: string;
  label?: string; // Nome/etiqueta do endereço (ex: "Casa", "Escritório", "Obra 1")
  address?: string; // Endereço completo formatado
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  latitude?: number; // Latitude do endereço
  longitude?: number; // Longitude do endereço
}

export interface Client {
  name: string;
  personType?: "cpf" | "cnpj";
  docNumber?: string;
  contact?: string;
  phone?: string;
  email?: string;
  // Campos legados para compatibilidade
  address?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  // Novo campo: array de endereços
  addresses?: ClientAddress[];
  createdAt?: Date;
  updatedAt?: Date;
}
