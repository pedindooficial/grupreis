# Client Authentication API - Estrutura de Respostas

## Estrutura de Respostas do Backend

### 1. Registro (`POST /api/client-auth/register`)
**Request:**
```json
{
  "name": "Nome do Cliente",
  "email": "cliente@email.com",
  "password": "senha123",
  "phone": "11999999999",
  "docNumber": "12345678900",
  "personType": "cpf"
}
```

**Response (201):**
```json
{
  "data": {
    "client": {
      "id": "694209671bda434a682d0c67",
      "name": "Nome do Cliente",
      "email": "cliente@email.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login (`POST /api/client-auth/login`)
**Request:**
```json
{
  "email": "cliente@email.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "data": {
    "client": {
      "id": "694209671bda434a682d0c67",
      "name": "Nome do Cliente",
      "email": "cliente@email.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Solicitar Reset de Senha (`POST /api/client-auth/password-reset`)
**Request:**
```json
{
  "email": "cliente@email.com"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Se o email existir, você receberá um link para redefinir sua senha."
  }
}
```

### 4. Confirmar Reset de Senha (`POST /api/client-auth/password-reset/confirm`)
**Request:**
```json
{
  "token": "19b7efd0bb...",
  "password": "novaSenha123"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Senha redefinida com sucesso",
    "client": {
      "id": "694209671bda434a682d0c67",
      "name": "DANIEL REIS",
      "email": "afmdaniel@hotmail.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response de Erro (400):**
```json
{
  "error": "Token inválido ou expirado"
}
```

## Como Usar no Frontend

### Armazenar Token
Após login ou reset de senha bem-sucedido, armazene o token no `localStorage`:

```javascript
// Após receber a resposta do backend
const { data } = await response.json();
localStorage.setItem('clientToken', data.token);
localStorage.setItem('clientData', JSON.stringify(data.client));
```

### Enviar Token nas Requisições
Para rotas protegidas, envie o token no header `Authorization`:

```javascript
const token = localStorage.getItem('clientToken');
fetch('/api/client-protected/budgets', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Verificar Autenticação
```javascript
const token = localStorage.getItem('clientToken');
const clientData = localStorage.getItem('clientData');

if (token && clientData) {
  // Cliente está autenticado
  const client = JSON.parse(clientData);
  // Usar dados do cliente
}
```

### Logout
```javascript
localStorage.removeItem('clientToken');
localStorage.removeItem('clientData');
// Redirecionar para página de login
```

## Rotas Protegidas

Todas as rotas em `/api/client-protected/*` requerem o header:
```
Authorization: Bearer <token>
```

### Rotas Disponíveis:

#### Dados do Cliente
- `GET /api/client-protected/me` - Dados do cliente

#### Orçamentos
- `GET /api/client-protected/budgets` - Lista de orçamentos do cliente
- `GET /api/client-protected/budgets/:id` - Detalhes de um orçamento específico
- `POST /api/client-protected/budgets/:id/approve` - Aprovar orçamento com assinatura
- `POST /api/client-protected/budgets/:id/reject` - Rejeitar orçamento com motivo

#### Ordens de Serviço (OS)
- `GET /api/client-protected/jobs` - Lista de ordens de serviço do cliente
- `GET /api/client-protected/jobs/:id` - Detalhes de uma ordem de serviço específica

#### Endereços
- `GET /api/client-protected/addresses` - Lista de endereços
- `POST /api/client-protected/addresses` - Adicionar endereço
- `PUT /api/client-protected/addresses/:addressId` - Atualizar endereço
- `DELETE /api/client-protected/addresses/:addressId` - Deletar endereço

## Endpoints Detalhados

### Aprovar Orçamento
**Endpoint:** `POST /api/client-protected/budgets/:id/approve`

**Request:**
```json
{
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Orçamento aprovado com sucesso",
    "budget": {
      "_id": "...",
      "approved": true,
      "approvedAt": "2026-01-11T19:04:53.364Z",
      "clientSignature": "data:image/png;base64,...",
      "status": "aprovado"
    }
  }
}
```

**Erros:**
- `400` - Orçamento já foi aprovado
- `404` - Orçamento não encontrado ou não pertence ao cliente

### Rejeitar Orçamento
**Endpoint:** `POST /api/client-protected/budgets/:id/reject`

**Request:**
```json
{
  "rejectionReason": "Preço muito alto"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Orçamento rejeitado",
    "budget": {
      "_id": "...",
      "rejected": true,
      "rejectedAt": "2026-01-11T19:04:53.364Z",
      "rejectionReason": "Preço muito alto",
      "status": "rejeitado"
    }
  }
}
```

**Erros:**
- `400` - Orçamento já foi processado (aprovado ou rejeitado)
- `404` - Orçamento não encontrado ou não pertence ao cliente

### Listar Ordens de Serviço
**Endpoint:** `GET /api/client-protected/jobs`

**Response (200):**
```json
{
  "data": [
    {
      "_id": "...",
      "title": "OS001 - Fundação Casa",
      "seq": 1,
      "clientId": "...",
      "clientName": "Nome do Cliente",
      "status": "em_execucao",
      "plannedDate": "2026-01-15",
      "value": 5000,
      "finalValue": 5000,
      "services": [...],
      "createdAt": "2026-01-11T19:04:53.364Z"
    }
  ]
}
```

### Visualizar Ordem de Serviço
**Endpoint:** `GET /api/client-protected/jobs/:id`

**Response (200):**
```json
{
  "data": {
    "_id": "...",
    "title": "OS001 - Fundação Casa",
    "seq": 1,
    "status": "em_execucao",
    "services": [...],
    "site": "Rua Exemplo, 123",
    "plannedDate": "2026-01-15",
    "startedAt": "2026-01-15T08:00:00",
    "value": 5000,
    "finalValue": 5000
  }
}
```

**Erros:**
- `404` - Ordem de serviço não encontrada ou não pertence ao cliente

