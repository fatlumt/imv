# IMV Web Frontend (Step 4)

Responsive React + Vite scaffold that mirrors the existing PHP dashboard filters, exports, and totals while we wire it to the new Node API.

## Getting started
1. Install dependencies (offline-safe if cached):
   ```bash
   npm install
   ```
2. Run locally:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Feature parity checklist
- Search, status, date-from, date-to, and sort options rendered as first-class controls.
- Export button points to `/api/invoices/export` preserving current CSV shape.
- VAT, paid, and open totals displayed; table ready for pagination/inline actions.
- Mobile-friendly grid/layout so options stay visible at small breakpoints.

## Next wiring tasks
- Replace `mockInvoices` with API calls to `/api/invoices` using authenticated fetches.
- Add pagination parameters to match current defaults and keep label names unchanged.
- Move "New Invoice" into a routed form that reuses existing field labels/helpers.
- Introduce global auth/tenant context shared with the Node API JWT flow.
