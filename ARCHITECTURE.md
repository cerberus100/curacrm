# CuraGenesis Intake CRM - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ Dashboard  │  │  Intake    │  │   Submissions      │   │
│  │   (KPIs)   │  │ (Accounts) │  │    (History)       │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes (Server-Side)                            │  │
│  │  • /api/accounts (CRUD)                              │  │
│  │  • /api/contacts (CRUD)                              │  │
│  │  • /api/submissions/send (Idempotent)                │  │
│  │  • /api/kpi/* (Proxy with secret keys)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                │  │
│  │  • CuraGenesisClient (retry, timeout)                │  │
│  │  • MetricsClient (server-side proxy)                 │  │
│  │  • Validation (Zod schemas)                          │  │
│  │  • PHI detection & rejection                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
        ┌──────────────────┐  ┌─────────────────┐
        │   PostgreSQL     │  │  CuraGenesis    │
        │   (Prisma ORM)   │  │   API (HTTPS)   │
        │                  │  │                 │
        │  • Users         │  │  • /v1/practices│
        │  • Accounts      │  │    /intake      │
        │  • Contacts      │  │  • /v1/metrics  │
        │  • Submissions   │  │    /overview    │
        │  • Settings      │  │  • /v1/metrics  │
        │                  │  │    /geo         │
        └──────────────────┘  │  • /v1/metrics  │
                              │    /leaderboard │
                              └─────────────────┘
```

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router, React 18)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + CSS Variables
- **Components:** shadcn/ui (Radix UI primitives)
- **Charts:** Recharts
- **State:** React hooks (no global state library)
- **Forms:** Controlled components + Zod validation

### Backend (Next.js API Routes)
- **Runtime:** Node.js 18+
- **Framework:** Next.js API Routes (server-side)
- **Validation:** Zod schemas
- **HTTP Client:** Fetch API (native)
- **Error Handling:** Try/catch + friendly messages

### Database
- **Engine:** PostgreSQL 14+
- **ORM:** Prisma 5
- **Migrations:** Prisma Migrate
- **Schema:** See `prisma/schema.prisma`

### External APIs
- **CuraGenesis Intake API:** Practice submission
- **CuraGenesis Metrics API:** KPI data

## Data Flow

### Intake Submission Flow

```
User fills form → Client validation (Zod)
                        ↓
            Save draft to database (optional)
                        ↓
            User clicks "Send to CuraGenesis"
                        ↓
        Server-side validation (Zod + PHI check)
                        ↓
            Generate idempotency key
                        ↓
            Create Submission record (status: pending)
                        ↓
        CuraGenesisClient.submitIntake()
         • Retry logic (3 attempts)
         • Exponential backoff
         • Timeout (10s)
                        ↓
                   ┌────┴────┐
                   ▼         ▼
              Success    Failure
                   │         │
                   ▼         ▼
        Update Submission  Update Submission
        (status: sent)     (status: failed)
                   │         │
                   ▼         ▼
        Update Account     Update Account
        (status: sent)     (status: failed)
                   │         │
                   └────┬────┘
                        ▼
              Return response to client
                        ↓
            Toast notification (friendly message)
```

### KPI Dashboard Flow

```
User selects date range → POST /api/kpi/overview
                                      ↓
                    Server-side (secrets safe)
                                      ↓
                    MetricsClient.overview()
                         • Uses CG_METRICS_API_KEY
                         • Calls CuraGenesis API
                                      ↓
                    Return JSON to client
                                      ↓
                    Recharts renders charts
```

## Key Design Decisions

### 1. Server-Side API Proxy
**Decision:** All external API calls go through Next.js API routes

**Rationale:**
- Protects API keys (never exposed to browser)
- Allows request transformation
- Enables rate limiting and caching
- Consistent error handling

### 2. Idempotent Submissions
**Decision:** Generate UUID idempotency key per submission, reuse for retries within 24h

**Rationale:**
- Prevents duplicate practice creation
- Allows safe retries
- CuraGenesis API requirement

### 3. Zod Validation
**Decision:** Use Zod for all input validation (client and server)

**Rationale:**
- Type-safe validation
- Reusable schemas
- Automatic TypeScript inference
- Better error messages

### 4. Phone Number Formatting
**Decision:** Store both display format `(XXX) XXX-XXXX` and E.164 `+1XXXXXXXXXX`

**Rationale:**
- Display format for UI
- E.164 for API/validation
- Supports international format in future

### 5. Contact Minimum Requirement
**Decision:** At least one contact required before sending

**Rationale:**
- Business rule from CuraGenesis
- Enforced in UI and API
- Clear validation message

### 6. Status Enum
**Decision:** Account status: draft → ready_to_send → sent → failed → acknowledged

**Rationale:**
- Clear state machine
- Tracks submission lifecycle
- Enables filtering and reporting

### 7. Audit Logging
**Decision:** Store full request/response payloads in Submission table

**Rationale:**
- Debugging support
- Compliance/audit trail
- Error analysis
- Idempotency verification

### 8. No PHI
**Decision:** Reject inputs containing SSN, DOB, MRN patterns

**Rationale:**
- System is for practice info only
- Prevent accidental PHI storage
- Compliance requirement

## Security Architecture

### Authentication
**Current:** None (demo/internal tool)
**Future:** Add NextAuth.js or similar

### Authorization
**Current:** Rep sees all accounts (no user context in forms)
**Future:** Filter by `ownerRepId` from session

### Input Validation
- Client-side: Zod schemas, inline errors
- Server-side: Same Zod schemas, reject PHI patterns
- Database: Prisma validation, foreign keys

### API Security
- HTTPS required in production
- API keys server-side only
- CORS headers (Next.js defaults)
- Security headers in next.config.mjs

### Data Protection
- No PHI stored
- Phone/email stored but not sensitive per HIPAA
- Database credentials in environment variables
- API keys in environment variables (never committed)

## Performance Considerations

### Database
- Indexes on foreign keys (`ownerRepId`, `accountId`)
- Indexes on search fields (`email`, `npiOrg`, `phoneE164`)
- Connection pooling (Prisma default)

### API Routes
- Server-side rendering disabled where not needed
- Parallel API calls for KPI dashboard
- Client-side caching via React state

### Charts
- Recharts lazy-loaded
- Data aggregation server-side (future)
- Pagination on large lists (future)

## Scalability

### Current Limitations
- Single Next.js instance
- No caching layer
- No queue for submissions
- No webhook handlers

### Future Enhancements
- Redis for caching KPI data
- Bull/BullMQ for submission queue
- Horizontal scaling (stateless app)
- CDN for static assets
- Read replicas for database

## Error Handling Strategy

### Client-Side
- Try/catch around fetch calls
- Toast notifications for user feedback
- Inline validation errors

### Server-Side
- Try/catch in API routes
- Zod validation errors → 400 with details
- CuraGenesis API errors → mapped to friendly messages
- Database errors → 500 with generic message (no leakage)

### Friendly Error Messages
- 409 → "Practice may already exist"
- 422 → "Check NPI/Email/State"
- 408/504 → "Timeout, try again"
- 5xx → "Service unavailable"

## Testing Strategy (Future)

### Unit Tests
- Zod schemas validation
- Phone formatting functions
- NPI checksum validation

### Integration Tests
- API routes with mock database
- CuraGenesis client with mock responses

### E2E Tests (Playwright)
- Create account → add contact → submit
- KPI dashboard rendering
- Error handling flows

## Monitoring & Observability (Future)

### Metrics
- Submission success/failure rate
- CuraGenesis API latency
- Database query performance
- Error counts by type

### Logging
- Structured JSON logs
- Request IDs
- No PHI in logs

### Alerts
- High error rate
- CuraGenesis API down
- Database connection issues

## Deployment Architecture

### Development
```
localhost:3000 → Next.js dev server
               → PostgreSQL local
```

### Production (Vercel)
```
Vercel Edge Network → Next.js serverless functions
                    → PostgreSQL (managed)
                    → CuraGenesis API
```

### Production (Self-Hosted)
```
Load Balancer → Next.js (PM2/Docker)
              → PostgreSQL (replica set)
              → CuraGenesis API
```

## File Structure

```
curasalescrm/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   ├── accounts/
│   │   │   ├── contacts/
│   │   │   ├── submissions/
│   │   │   └── kpi/
│   │   ├── dashboard/
│   │   ├── intake/
│   │   ├── submissions/
│   │   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/
│   │   ├── intake/
│   │   ├── submissions/
│   │   ├── admin/
│   │   └── nav-shell.tsx
│   ├── hooks/
│   │   └── use-kpi-data.ts
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   ├── env.ts            # Environment validation
│   │   ├── validations.ts    # Zod schemas
│   │   ├── curagenesis-client.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   └── types/                # TypeScript types
├── .env                      # Environment variables (gitignored)
├── .env.example              # Example environment
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## Future Roadmap

### Phase 2
- [ ] User authentication (NextAuth.js)
- [ ] Role-based access control
- [ ] CSV bulk import
- [ ] Duplicate detection (fuzzy matching)
- [ ] Email notifications

### Phase 3
- [ ] Webhooks from CuraGenesis
- [ ] Real-time submission status
- [ ] Advanced filtering/search
- [ ] Export to CSV
- [ ] Activity log viewer

### Phase 4
- [ ] Multi-tenant support
- [ ] White-label branding
- [ ] API for external integrations
- [ ] Mobile app (React Native)

---

Last updated: 2025-10-07
