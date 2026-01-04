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
- `GET /api/invoices` — list invoices (requires `Authorization: Bearer <token>`). Query params: `search`, `from`, `to`, `paid`.
- `POST /api/invoices` — create invoice with `invoice_number`, `customer_name`, `invoice_date`, optional `project_name`, `total`, `paid`.
- `PUT /api/invoices/:id` — update invoice fields.

All queries use prepared statements via `mysql2`.
