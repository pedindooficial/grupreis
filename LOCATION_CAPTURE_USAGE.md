# 📍 Sistema de Captura de Localização

Sistema completo para capturar localizações via web usando Google Maps API.

## 🎯 Funcionalidades

### Frontend (`/location-capture/[token]`)
✅ **Obter localização atual via GPS**
- Usa `navigator.geolocation` para GPS do dispositivo
- Alta precisão (enableHighAccuracy)
- Timeout de 10 segundos

✅ **Seleção manual no mapa**
- Clique em qualquer lugar do mapa
- Arraste o marcador para ajustar
- Visualização em tempo real

✅ **Reverse Geocoding**
- Converte coordenadas em endereço legível
- Usa Google Geocoding API
- Atualização automática

✅ **Interface Responsiva**
- Mobile-first design
- Touch-friendly
- Funciona em qualquer dispositivo

### Backend (`/api/location-capture`)
✅ **Geração de Tokens**
- Tokens únicos e seguros (SHA-256)
- Configuração de expiração (1-720 horas)
- Vinculação a recursos (job, client, team)

✅ **Validação de Tokens**
- Verifica validade e expiração
- Previne uso duplicado
- Retorna status e informações

✅ **Salvamento de Localização**
- Armazena coordenadas + endereço
- Timestamp e IP do capturador
- Atualização de status automática

## 📖 Como Usar

### 1. Criar um Token de Captura

```typescript
import { createLocationCaptureToken } from '@/utils/location-capture';

// Exemplo básico
const token = await createLocationCaptureToken({
  description: "Localização do cliente João Silva",
  expiresInHours: 24 // Token válido por 24h
});

// Exemplo vinculado a um Job
const token = await createLocationCaptureToken({
  description: "Localização da obra - OS #12345",
  resourceType: "job",
  resourceId: jobId,
  expiresInHours: 48
});
```

### 2. Gerar Link Completo (com QR Code)

```typescript
import { generateLocationCaptureLink } from '@/utils/location-capture';

const { url, qrCodeUrl } = await generateLocationCaptureLink({
  description: "Confirme a localização da sua obra",
  resourceType: "client",
  resourceId: clientId
});

// Enviar URL por WhatsApp/Email
console.log("Link:", url);

// Exibir QR Code
<img src={qrCodeUrl} alt="QR Code" />
```

### 3. API Backend

#### Criar Token
```bash
POST /api/location-capture/create
Content-Type: application/json

{
  "description": "Localização do cliente",
  "resourceType": "client",
  "resourceId": "507f1f77bcf86cd799439011",
  "expiresInHours": 24
}
```

#### Validar Token
```bash
GET /api/location-capture/validate/:token
```

#### Salvar Localização
```bash
POST /api/location-capture/:token
Content-Type: application/json

{
  "latitude": -15.7801,
  "longitude": -47.9292,
  "address": "Brasília, DF, Brasil"
}
```

## 🎨 Casos de Uso

### 1. Confirmar Endereço do Cliente
```typescript
// Ao cadastrar um novo cliente
const { url } = await generateLocationCaptureLink({
  description: "Por favor, confirme a localização do seu endereço",
  resourceType: "client",
  resourceId: newClient._id,
  expiresInHours: 72 // 3 dias
});

// Enviar link por WhatsApp/SMS
sendWhatsAppMessage(client.phone, `Confirme seu endereço: ${url}`);
```

### 2. Registrar Localização da Obra
```typescript
// Ao criar uma Ordem de Serviço
const { url, qrCodeUrl } = await generateLocationCaptureLink({
  description: `Localização da obra - ${job.title}`,
  resourceType: "job",
  resourceId: job._id,
  expiresInHours: 24
});

// Equipe escaneia QR Code no local
printJobOrder(job, { qrCodeUrl });
```

### 3. Check-in de Equipe
```typescript
// Registrar quando equipe chega no local
const { url } = await generateLocationCaptureLink({
  description: "Check-in no local da obra",
  resourceType: "team",
  resourceId: team._id,
  expiresInHours: 8 // Apenas durante o dia de trabalho
});

// Enviar para o líder da equipe
sendToTeamLeader(team.leaderId, url);
```

## 🔒 Segurança

- ✅ Tokens únicos (SHA-256, 64 caracteres)
- ✅ Expiração configurável
- ✅ Uso único (não pode ser reutilizado)
- ✅ Validação no backend
- ✅ Registro de IP do capturador
- ✅ Limpeza automática de tokens expirados (MongoDB TTL index)

## 📱 Compatibilidade

- ✅ Desktop: Chrome, Firefox, Safari, Edge
- ✅ Mobile: iOS Safari, Chrome Android
- ✅ Tablets: iPad, Android tablets
- ✅ Funciona offline (após carregar a página)

## 🎯 Próximos Passos

### Integração com Clientes
1. Adicionar botão "📍 Confirmar Localização" na página de clientes
2. Gerar link e copiar ou enviar por WhatsApp
3. Cliente abre o link e marca a localização
4. Sistema atualiza o endereço do cliente automaticamente

### Integração com Jobs
1. Adicionar QR Code na impressão da OS
2. Equipe escaneia QR Code ao chegar no local
3. Sistema registra check-in com localização e horário
4. Permite rastreamento em tempo real

### Integração com Equipes
1. Botão "📍 Onde está a equipe?" no painel
2. Gerar link rápido para líder da equipe
3. Visualizar localização das equipes no mapa
4. Histórico de movimentações

## 🧪 Testar Agora

1. Acesse: `http://localhost:3000/location-capture/8540f1dcca6c0fcdca8dce4b54d1f14e52d3d909c2fd9b93e44c5a4f37144db4`

2. Ou crie um novo token via API:
```bash
curl -X POST http://localhost:4000/api/location-capture/create \
  -H "Content-Type: application/json" \
  -d '{"description":"Teste de captura","expiresInHours":1}'
```

3. Use o token retornado: `http://localhost:3000/location-capture/[TOKEN]`

## 📊 Modelo de Dados

```typescript
interface LocationCapture {
  token: string;              // Token único
  description?: string;       // Descrição do propósito
  resourceType?: string;      // "job" | "client" | "team" | "other"
  resourceId?: string;        // ID do recurso vinculado
  latitude?: number;          // Coordenada capturada
  longitude?: number;         // Coordenada capturada
  address?: string;           // Endereço (reverse geocoded)
  capturedAt?: Date;          // Quando foi capturado
  capturedBy?: string;        // IP do capturador
  status: string;             // "pending" | "captured" | "expired"
  expiresAt?: Date;           // Quando expira
  createdAt: Date;            // Quando foi criado
  updatedAt: Date;            // Última atualização
}
```

## 🎨 UI/UX Features

- 🎨 Design moderno com gradientes
- 📱 Mobile-first e responsivo
- 🗺️ Mapa interativo do Google Maps
- 📍 Marcador arrastável
- 🎯 Precisão de GPS
- ⚡ Feedback visual em tempo real
- 🔔 Notificações de sucesso/erro
- 💡 Instruções claras e intuitivas

