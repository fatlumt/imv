# Node/Nest Backend and Unified Frontend Plan

## Goals
- Rebuild backend in JavaScript/TypeScript using NestJS for a modular, testable API.
- Serve a single responsive frontend for desktop and mobile web, with an option to wrap as a PWA or Capacitor app for native stores.
- Preserve existing invoicing/offers/contracts functionality while improving security, observability, and developer experience.

## Proposed Stack
- **Backend:** NestJS (TypeScript), PostgreSQL (or MySQL if migration cost is high), Prisma ORM, Zod validation, Passport/JWT for auth, Nodemailer for email.
- **Frontend:** React + Vite + Tailwind CSS; responsive layout with component library (e.g., Headless UI) and PWA manifest/service worker.
- **API Contracts:** REST first, with GraphQL considered later if client needs dictate complex querying.
- **Tooling:** ESLint/Prettier, vitest/jest for tests, Docker for local parity, GitHub Actions for CI.

## Architecture Outline
1. **Modules**: `auth`, `users`, `companies`, `invoices`, `offers`, `contracts`, `uploads`, `reports`. Each exposes controllers, services, DTOs, and guards.
2. **Database Models** (illustrative):
   - `User(id, email, password_hash, role, last_login, created_at)`
   - `Company(id, name, address, vat_number, iban, bic, contact_email, logo_url)`
   - `Invoice(id, company_id, client_name, invoice_date, due_date, status, net_amount, vat_amount, total_amount, pdf_url)`
   - `InvoiceItem(id, invoice_id, description, quantity, unit_price, vat_rate)`
   - Similar tables for `Offer` and `Contract`, plus `Attachment` for uploads.
3. **Security**: HTTPS enforcement, CSRF for cookie-auth flows, rate limiting, input validation with DTO + Zod, prepared statements via ORM, audit logging middleware.
4. **File Handling**: Signed URLs to object storage (S3-compatible) or local disk adapter with antivirus scan hook.
5. **Observability**: Structured logging (pino), request IDs, health checks, Prometheus metrics endpoint.

## API Surface (initial)
- `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /invoices`, `POST /invoices`, `GET /invoices/:id`, `PATCH /invoices/:id`, `DELETE /invoices/:id`
- `GET /offers`, `POST /offers`, ...
- `GET /contracts`, `POST /contracts`, ...
- `GET /reports/summary?from=&to=` for VAT/payment aggregates.
- `POST /uploads` for PDF/image assets with size/type validation.

## Frontend Approach
- Responsive SPA with auth-aware layout, dashboard cards, filters, and editable forms mirroring current PHP flows.
- Use TanStack Query for caching/fetching, React Hook Form + Zod for validation, and lazy-loaded routes for mobile performance.
- Add PWA manifest, offline fallback shell, and optional Capacitor wrapper for iOS/Android.

## Feature Parity Requirements
- Preserve every dashboard filter and option (date range presets, free-text search, status toggles, sort order, default ranges) and summary totals for VAT and payments.
- Keep CSV export for invoices/offers/contracts with identical column sets, order, delimiter/decimal formatting, and filename patterns.
- Maintain invoice/offer/contract create-edit flows, including prefilled company details, line items, and file uploads, and keep every field/label/helper exactly as today.
- Replicate authentication/authorization behavior (login redirect rules, session persistence, role-based access for admin/user) and keep login/logout entry points identical from the user perspective.
- Ensure invoice/offer/contract PDF templates match current layout, typography, colors, and asset placements.
- Keep navigation/menu options, button labels, and confirmation prompts unchanged across desktop and mobile breakpoints.
- Match pagination page sizes, default sorting, and any inline actions (edit/delete/download) exposed in current tables.

## Migration Steps
1. **Schema Migration**: Translate existing MySQL schema to Prisma models; add migrations for missing constraints/indexes while preserving column names used in exports.
2. **Data Import**: Use Prisma or raw scripts to import current tables; backfill passwords with bcrypt if necessary; migrate uploaded assets to the new storage.
3. **API Build**: Implement auth + invoices first, then offers/contracts; include endpoints for CSV/PDF export, dashboard aggregates, and search/filter parity.
4. **Frontend Build**: Scaffold React app, recreate dashboard, filters, and forms against new API, ensure mobile breakpoints and identical options in menus/buttons; confirm responsive layouts do not hide or rename existing options.
5. **Gradual Cutover**: Run PHP and Nest side-by-side; switch routes progressively, monitor logs/metrics; confirm feature parity with checklist-based UAT for each flow and both desktop/mobile viewports.
6. **Hardening**: Add tests (unit/integration/e2e), CI checks, backups, and error budgets; include regression tests for every preserved option (filters, exports, auth redirects), and add visual regression snapshots to lock button/label parity.

## Deployment Considerations
- Containerize with Docker; use docker-compose for dev and Helm/Kubernetes for prod if needed.
- Configure environment via `.env` + Nest config module; include secrets management (Vault/SSM).
- Set up CDN for static assets and caching headers for APIs; enable gzip/brotli compression.
- Add monitoring alerts for error rates, latency, and saturation; include synthetic uptime checks.
