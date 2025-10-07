# CuraGenesis Intake + KPI Dashboard

Production-ready Next.js application for practice intake and KPI tracking with CuraGenesis API integration.

## 🚀 Features

### Intake Mini-CRM
- ✅ Practice account management with full CRUD operations
- ✅ Contact management (minimum 1 required per account)
- ✅ Comprehensive validation (NPI, phone, email, state)
- ✅ Phone number masking and E.164 formatting
- ✅ Idempotent API submissions with retry logic
- ✅ Duplicate prevention via idempotency keys
- ✅ Real-time submission status tracking
- ✅ Audit trail for all submissions

### KPI Dashboard
- ✅ Overview metrics (Sales, Orders, AOV, Active Practices, Retention, Days to First Order)
- ✅ Time series charts (Sales and Orders trends)
- ✅ Geographic breakdown (Top states by sales)
- ✅ Rep leaderboard with rankings
- ✅ Date range filters (30d, 60d, 90d)
- ✅ Server-side API proxy (secrets never exposed to client)

### Security & Compliance
- ✅ No PHI stored or transmitted
- ✅ Strict input validation (Zod schemas)
- ✅ PHI pattern detection and rejection
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Server-side API key management
- ✅ Comprehensive error handling with friendly messages

### UI/UX
- ✅ CuraGenesis branded theme (dark blue palette)
- ✅ Responsive design with Tailwind CSS
- ✅ shadcn/ui components
- ✅ Toast notifications
- ✅ Loading states and error boundaries
- ✅ WCAG AA color contrast

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Validation:** Zod
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **State:** React hooks + TanStack Query patterns

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL 14+
- CuraGenesis API credentials
- CuraGenesis Metrics API credentials

## ⚙️ Setup

### 1. Clone and Install

```bash
git clone <repository>
cd curasalescrm
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/curagenesis_crm?schema=public"

# CuraGenesis API - Intake Submissions
CURAGENESIS_API_BASE="https://api.curagenesis.com"
CURAGENESIS_API_KEY="your_api_key_here"
CURAGENESIS_API_TIMEOUT_MS="10000"

# CuraGenesis API - Metrics (KPI Dashboard)
NEXT_PUBLIC_CG_METRICS_BASE="https://api.curagenesis.com"
CG_METRICS_API_KEY="your_metrics_api_key_here"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (creates admin + rep users)
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### User
- Admin and Rep roles
- Email-based identification

### Account (Practice)
- Practice details (name, specialty, NPI, address, etc.)
- Status tracking (draft → ready_to_send → sent/failed → acknowledged)
- Owner rep relationship

### Contact
- Contact types (clinician, owner_physician, admin, billing)
- At least one required per account
- Email or phone required

### Submission
- Idempotent tracking
- Request/response payloads
- Status and error logging
- Retry mechanism (3 attempts)

### Setting
- Key-value configuration store

## 📡 API Routes

### Accounts
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `GET /api/accounts/:id` - Get account details
- `PATCH /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Contacts
- `POST /api/accounts/:id/contacts` - Add contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Submissions
- `GET /api/submissions` - List submissions
- `POST /api/submissions/send` - Send account to CuraGenesis

### KPI (Server-side Proxy)
- `POST /api/kpi/overview` - Overview metrics
- `POST /api/kpi/geo` - Geographic data
- `POST /api/kpi/leaderboard` - Rep leaderboard

## 🔐 Security Features

### Input Validation
- Zod schemas for all inputs
- NPI validation (10 digits + optional Luhn checksum)
- Phone formatting (display + E.164)
- Email validation
- State code validation (2-letter uppercase)
- ZIP code validation (5 or 5+4 format)

### PHI Protection
- Pattern detection for SSN, DOB, MRN
- Server-side rejection of prohibited patterns
- No sensitive data in logs

### API Security
- Idempotency keys prevent duplicate submissions
- Server-side API key storage
- 24-hour idempotency window for retries
- HTTP security headers

### Error Handling
- Friendly error messages for common HTTP codes
- 409 → Duplicate warning
- 422 → Validation feedback
- 408/504 → Timeout guidance
- 5xx → Service unavailable message

## 🎨 UI Pages

### Dashboard (`/dashboard`)
- KPI cards with metrics
- Sales and orders trend charts
- Geographic breakdown (bar chart)
- Rep leaderboard table
- Date range selector

### Intake (`/intake`)
- Accounts list with status badges
- Create/Edit account form
- Contacts manager
- Send to CuraGenesis workflow

### Submissions (`/submissions`)
- Submission history
- Status tracking
- Request/response viewer
- Idempotency key display

### Admin (`/admin`)
- System health checks
- Environment configuration status

## 🚢 Deployment

### Build

```bash
npm run build
```

### Production Start

```bash
npm start
```

### Environment Checklist

- ✅ DATABASE_URL configured
- ✅ CURAGENESIS_API_BASE set
- ✅ CURAGENESIS_API_KEY set (secret)
- ✅ CG_METRICS_API_KEY set (secret)
- ✅ NEXT_PUBLIC_CG_METRICS_BASE set
- ✅ NODE_ENV=production
- ✅ Database migrations applied
- ✅ Seed data loaded (optional)

## 📊 Data Model Validation Rules

### Account
- `practiceName`: 3-255 characters, no PHI patterns
- `specialty`: Required
- `state`: Required, 2-letter uppercase
- `npiOrg`: Optional, exactly 10 digits
- `phoneDisplay`: (XXX) XXX-XXXX format
- `phoneE164`: +1XXXXXXXXXX format
- `email`: Valid email format
- `website`: Valid URL

### Contact
- `fullName`: Required, no PHI patterns
- `contactType`: clinician | owner_physician | admin | billing
- `npiIndividual`: Optional, 10 digits
- `email` or `phoneE164`: At least one required

## 🔄 Submission Flow

1. **Draft**: Account created, contacts added
2. **Validation**: Client-side and server-side checks
3. **Idempotency Key**: Generated (or reused within 24h for failed)
4. **API Call**: POST to CuraGenesis `/v1/practices/intake`
5. **Retry Logic**: Up to 3 attempts on 5xx/timeout
6. **Status Update**: Account marked sent/failed
7. **Response Storage**: Full request/response saved
8. **User Feedback**: Toast notification with friendly message

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Prisma Studio (database GUI)
npm run db:studio
```

## 📝 Seed Users

After running `npx prisma db seed`:

- **Admin**: `admin@curagenesis.com`
- **Rep**: `rep@curagenesis.com`

(No authentication implemented - use for dev/demo)

## 🎯 Acceptance Criteria

- ✅ Create account → add contact → Send → submission row saved
- ✅ Retry failed send preserves idempotency key within 24h window
- ✅ KPI dashboard renders with mocked endpoints and switches to real when env is set
- ✅ No PHI stored or transmitted
- ✅ Branded theme applied throughout
- ✅ Input validation with inline errors
- ✅ Friendly error messages for API failures
- ✅ Audit trail for all submissions

## 🛡️ HIPAA/Compliance Notes

- **No PHI**: This system handles practice and contact information only. No patient data (PHI) is stored or transmitted.
- **Audit Logging**: All submissions tracked with timestamps, payloads, and status.
- **Data Validation**: Strict input validation prevents injection attacks.
- **Secure Communication**: HTTPS required in production, API keys server-side only.

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Zod Validation](https://zod.dev/)
- [Recharts Documentation](https://recharts.org/)

## 🤝 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for CuraGenesis**
