# AI-Powered Website Auditor

A complete, production-ready SaaS platform that allows users to submit a website URL and automatically perform comprehensive technical, functional, visual, SEO, accessibility, and performance audits with AI-generated explanations and weekly automated monitoring.

---

## 1. System Architecture

```
website-auditor/
├── apps/
│   ├── web/               # Next.js 15 App Router, React 19, Tailwind CSS, TanStack Query, Recharts
│   ├── api/               # NestJS REST API with Swagger/OpenAPI, Passport JWT, PostgreSQL Prisma
│   └── worker/            # BullMQ background workers executing audits, browser pools & AI analysis
├── packages/
│   ├── database/          # Prisma schema, migrations, PostgreSQL client
│   ├── contracts/         # Shared TypeScript interfaces, enums, DTOs & Zod schemas
│   ├── crawler/           # SSRF-protected crawler, sitemaps, robots.txt, Cheerio parser
│   ├── browser-engine/    # Playwright browser automation pool for interactive element & form testing
│   ├── issue-engine/      # Deterministic issue deduplication, fingerprinting, severity matrices
│   ├── ai/                # OpenAI API structured output engine with graceful fallbacks
│   ├── reporting/         # Standalone HTML and PDF report generator
│   ├── storage/           # S3 / Cloudflare R2 / Local file storage adapter
│   └── shared/            # SSRF validation, URL normalization, SHA-256 fingerprinting
├── infrastructure/
│   ├── docker/            # Production Dockerfiles (API, Worker with Playwright, Web)
│   └── deployment/        # Multi-service container orchestration
├── tests/
│   ├── unit/              # SSRF protection, URL normalization, issue engine tests
│   ├── integration/       # Playwright browser engine & test fixtures
│   └── fixtures/          # Controlled test site benchmark
└── docker-compose.yml     # PostgreSQL, Redis, API, Worker, Web
```

---

## 2. Key Features

1. **Automated URL Crawling & Resource Auditing**
   - High-throughput crawler with recursive depth and page limits.
   - Sitemaps (`sitemap.xml`) and robots directives inspection.
   - Broken link detection (404, 500, timeouts) differentiating internal from third-party.

2. **Automated Interactive Element & Button Testing**
   - Headless Playwright browser automation with isolated incognito contexts.
   - Discovers buttons, dropdowns, accordions, and modals.
   - Pre-interaction & post-interaction screenshot capture.
   - Outcome classification: `NAVIGATION`, `MODAL_OPENED`, `ACCORDION_EXPANDED`, `CLICK_FAILED`, `NO_OBSERVABLE_CHANGE`.

3. **Safe Form Inspection**
   - Non-destructive form testing verifying input labels, ARIA attributes, and submit buttons without unintended submissions to production databases.

4. **Multi-Viewport Responsive Testing**
   - Simulates Desktop (1440×900), Tablet (768×1024), and Mobile (390×844) viewports.
   - Detects horizontal layout overflows (`overflow-x`) and container clipping.

5. **Deterministic Issue Deduplication & Severity Matrix**
   - SHA-256 fingerprinting prevents issue duplication.
   - Deterministic severity classification: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`.
   - Historical baseline tracking: `NEW`, `PERSISTENT`, `RESOLVED`.

6. **OpenAI AI Analysis & Action Plans**
   - Structured JSON executive synthesis, business impact analysis, and prioritized engineering action plan.
   - Safe offline fallback: core audits finish reliably even without external AI credentials.

7. **Real-time SSE Progress Streaming & Downloadable Reports**
   - Live audit progress bar via Server-Sent Events (`/api/v1/audits/:id/stream`).
   - Self-contained, printable HTML report downloads.

8. **Automated Weekly Schedules**
   - Configurable recurring weekly audits with custom days, hours, and timezone support.

---

## 3. Quickstart & Local Development

### Prerequisites
- Node.js >= 20
- pnpm >= 10 (`npm i -g pnpm`)
- PostgreSQL (port 5432)
- Redis (port 6379)

### 1. Setup Environment
```bash
cp .env.example .env
```

### 2. Install Dependencies & Build Packages
```bash
pnpm approve-builds --all
pnpm install
pnpm --filter @auditor/database db:push
pnpm --filter @auditor/database db:seed
pnpm --filter "./packages/*" build
```

### 3. Run Automated Tests
```bash
pnpm test
```

### 4. Start Development Services
```bash
# Terminal 1: Background Worker
pnpm --filter @auditor/worker dev

# Terminal 2: REST API (Port 4000)
pnpm --filter @auditor/api dev

# Terminal 3: Next.js Frontend (Port 3000)
pnpm --filter @auditor/web dev
```

Default credentials seeded:
- **Email**: `admin@megamind.studio`
- **Password**: `password123`

---

## 4. API Endpoints & Swagger

Interactive Swagger OpenAPI docs available at `http://localhost:4000/docs`:

- **Auth**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- **Websites**: `GET /api/v1/websites`, `POST /api/v1/websites`, `DELETE /api/v1/websites/:id`
- **Audits**: `GET /api/v1/audits`, `POST /api/v1/websites/:id/audits`, `GET /api/v1/audits/:id/stream`
- **Issues**: `GET /api/v1/issues`, `PATCH /api/v1/issues/:id`
- **Reports**: `GET /api/v1/reports/:id/download`, `GET /api/v1/reports/:id/view`
- **Schedules**: `POST /api/v1/schedules`, `POST /api/v1/schedules/:id/pause`
- **Health**: `GET /api/v1/health`, `GET /api/v1/health/database`, `GET /api/v1/health/redis`

---

## 5. Security & SSRF Protection

All target URLs submitted to the system undergo strict SSRF validation (`@auditor/shared`):
- Only `http:` and `https:` schemes allowed.
- Localhost, `.local`, and internal hostnames are rejected.
- Private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`) are prohibited.
- Cloud provider metadata IP (`169.254.169.254`) is strictly blocked.
- DNS resolution checks prevent DNS rebinding attacks.
