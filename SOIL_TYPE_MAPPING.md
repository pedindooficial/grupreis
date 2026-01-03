# Soil Type Mapping for Orçamento Requests

This document provides the mapping between orçamento request soil types and catalog soil types.

## Orçamento Request Soil Types (Website Form)

| Value | Display Label |
|-------|---------------|
| `terra_comum` | "Terra comum" |
| `argiloso` | "Argiloso" |
| `arenoso` | "Arenoso" |
| `rochoso` | "Rochoso" |
| `nao_sei` | "Não sei informar" |

## Catalog Soil Types (Internal System)

| Value | Display Label |
|-------|---------------|
| `misturado` | "Terra comum" / "Misturado" |
| `argiloso` | "Argiloso" |
| `arenoso` | "Arenoso" |
| `rochoso` | "Rochoso" |
| `outro` | "Outro" |

## Mapping Rules

When converting from orçamento request to catalog/budget:

- `terra_comum` → `misturado`
- `argiloso` → `argiloso`
- `arenoso` → `arenoso`
- `rochoso` → `rochoso`
- `nao_sei` → `misturado` (default to mixed when unknown)

## Access Type Mapping

| Orçamento Request Value | Catalog Value | Display Label |
|-------------------------|--------------|---------------|
| `facil` | `livre` | "Fácil" / "Acesso livre e desimpedido" |
| `medio` | `limitado` | "Médio" / "Algumas limitações" |
| `dificil` | `restrito` | "Difícil" / "Acesso restrito ou complicado" |

## Usage in Website Form

When submitting an orçamento request, use these values:

```javascript
// Soil Types
const SOIL_TYPES = [
  { value: 'terra_comum', label: 'Terra comum' },
  { value: 'argiloso', label: 'Argiloso' },
  { value: 'arenoso', label: 'Arenoso' },
  { value: 'rochoso', label: 'Rochoso' },
  { value: 'nao_sei', label: 'Não sei informar' }
];

// Access Types
const ACCESS_TYPES = [
  { value: 'facil', label: 'Fácil', description: 'Acesso livre e desimpedido' },
  { value: 'medio', label: 'Médio', description: 'Algumas limitações' },
  { value: 'dificil', label: 'Difícil', description: 'Acesso restrito ou complicado' }
];
```

