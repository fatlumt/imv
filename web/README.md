# IMV Web Frontend (Step 9)

Responsive React + Vite scaffold that mirrors the existing PHP dashboard filters, exports, totals, and now routes create/edit forms through dedicated pages with shared auth state and inline validation.

## Getting started
1. Copy `.env.example` to `.env` and set `VITE_API_URL` to your API host (defaults to `http://localhost:4000`).
2. Install dependencies (offline-safe if cached):
   ```bash
   npm install
   ```
3. Run locally:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Feature parity checklist
- Search, status, date-from, date-to, and sort options rendered as first-class controls.
- Export button calls `/api/invoices/export` with the same CSV shape.
- VAT, paid, and open totals displayed from API aggregates (falls back to mock calculations).
- Pagination buttons mirror API paging; inline actions include delete and edit via the same form used for new invoices.
- Mobile-friendly grid/layout so options stay visible at small breakpoints.
- Create/edit form keeps existing labels (invoice number, client, project, date, status, total) and reuses the same status options.
- Routed create/edit pages share the same controls as the list view and persist auth context so exports and saves stay consistent.
- Validation errors are shown inline to mirror backend expectations and guard parity with the legacy PHP forms.
- Authenticated saves apply optimistic UI updates so edits feel responsive on slow connections while preserving API sync.

## Next wiring tasks
- Move "New Invoice" into a routed form that reuses existing field labels/helpers. ✅
- Introduce global auth/tenant context shared with the Node API JWT flow. ✅
- Harden form validation to mirror current backend rules and add optimistic UI for network-constrained devices. ✅
- Add lightweight guardrails for authenticated routes (redirect on 401) and wire error toasts/alerts for API failures.
