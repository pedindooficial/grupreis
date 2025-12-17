# Operations Team Page - Refactored Structure

This directory contains the operations team page, refactored into smaller, maintainable files.

## File Structure

```
[id]/
├── _components/          # React components
│   ├── BottomNavigation.tsx   - Bottom navigation bar (Home, Ops, Logout)
│   ├── JobCard.tsx            - Job card component for list view
│   ├── LoadingScreen.tsx      - Loading state screen
│   ├── LoginScreen.tsx        - Authentication/login screen
│   └── RouteMap.tsx           - Google Maps route component
│
├── hooks/                # Custom React hooks
│   └── useOperations.ts       - Main business logic and state management
│
├── constants.tsx         # Constants and icon definitions
├── types.ts              # TypeScript type definitions
├── utils.ts              # Utility functions
├── page.tsx              # Main page component (orchestrates everything)
└── README.md             # This file
```

## Component Responsibilities

### `page.tsx`
- Main page component
- Orchestrates all sub-components
- Handles view state (home vs operations view)
- Renders the job list and detail modal

### `hooks/useOperations.ts`
- All business logic and API calls
- State management
- Authentication logic
- Job status updates
- Navigation handlers
- Payment/receipt handling
- Signature handling

### `_components/`
All UI components:
- **BottomNavigation**: Fixed bottom navigation bar
- **JobCard**: Individual job card in the list
- **LoadingScreen**: Shown while checking authentication
- **LoginScreen**: Password authentication screen
- **RouteMap**: Google Maps integration for navigation

### `types.ts`
TypeScript interfaces and types:
- Job
- TeamData
- Status
- PaymentMethod
- ViewTab
- MainView
- DateFilter

### `utils.ts`
Utility functions:
- `encodePassword` / `decodePassword` - Simple password obfuscation
- `statusLabel` - Status display labels
- `matchesDateFilter` - Date filtering logic
- `groupJobsByDate` - Group jobs by date for display

### `constants.tsx`
- Payment methods list
- Icon definitions (SVG)
- Date filter options

## Key Features

1. **Authentication**: Secure login with 24-hour session expiry
2. **Job Management**: Start, complete, and receive payments
3. **Navigation**: Google Maps integration with geolocation
4. **Signatures**: Client signature capture
5. **Date Filtering**: Filter jobs by date ranges
6. **Receipt Upload**: File upload for payment receipts

## API Endpoints Used

- `POST /api/operations/team/{teamId}` - Authentication
- `PATCH /api/operations/jobs/{jobId}` - Update job status
- `POST /api/jobs/{jobId}/received` - Mark as received
- `POST /api/jobs/{jobId}/signature` - Save signature
- `GET /api/jobs/{jobId}/pdf` - Download PDF
- `GET /api/cash` - Get transactions
- `GET /api/settings` - Get headquarters address
- `POST /api/files/upload` - Upload receipt files

## State Management

All state is managed in the `useOperations` hook:
- `data` - Team and jobs data
- `password` - Current password
- `authLoading` - Authentication loading state
- `checkingAuth` - Initial auth check
- `tab` - Current tab (disponiveis/execucao/concluidas)
- `selectedJob` - Currently viewed job details
- `dateFilter` - Active date filter
- `transactions` - Payment transactions
- `updating` - Currently updating job ID

## Session Storage

Sessions are stored in localStorage with:
- Encoded password (base64)
- Timestamp for 24-hour expiry
- Key format: `ops-auth-team-{teamId}`

