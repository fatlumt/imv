# IMV API (Node.js)

A lightweight Express-based API to modernize the existing invoices system while keeping the same options for authentication and invoice filtering.

## Setup
1. Copy `.env.example` to `.env` and provide database + JWT credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the API:
   ```bash
   npm run start
   ```
   Or run in watch mode with `npm run dev`.

## Endpoints
- `GET /health` — health check.
- `POST /api/login` — authenticate with `email` and `password`, returns JWT.
- `GET /api/invoices` — paginated invoice list (requires `Authorization: Bearer <token>`). Query params: `search`, `from`, `to`, `paid`, `page`, `pageSize`, `sort` (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`). Response includes `items`, `totalCount`, and aggregated `totals` for VAT/paid/open.
- `GET /api/invoices/export` — CSV export matching current columns, honors same filters and sort as the list endpoint (supports `token` query param when headers aren't available for downloads).
- `POST /api/invoices` — create invoice with `invoice_number`, `customer_name`, `invoice_date`, optional `project_name`, `total`, `paid`.
- `PUT /api/invoices/:id` — update invoice fields.
- `DELETE /api/invoices/:id` — remove an invoice after confirming existence.

All queries use prepared statements via `mysql2`.
