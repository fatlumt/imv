# IMV Web Frontend (Step 6)

Responsive React + Vite scaffold that mirrors the existing PHP dashboard filters, exports, and totals while we wire it to the new Node API.

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
- Pagination buttons mirror API paging; inline actions include delete (edit placeholder kept for parity).
- Mobile-friendly grid/layout so options stay visible at small breakpoints.

## Next wiring tasks
- Move "New Invoice" into a routed form that reuses existing field labels/helpers.
- Introduce global auth/tenant context shared with the Node API JWT flow.
- Wire in create/update flows against the Node endpoints while keeping existing labels.
