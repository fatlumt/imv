# Invoice (Krasniqi Invoicing App)

A **pure PHP** invoicing/offers/contracts system with the same red brand design and mobile‑responsive UI.
This repository is the canonical reference to rebuild the system in a new repo called **`invoice`**.

## Goals

* **Pure PHP** (no framework required).
* **Same design** as the current UI (red brand theme, A4 invoice/offer layouts, dashboard styles).
* **Mobile responsive** (mobile menus, stacked layouts at smaller breakpoints).
* **All functions preserved** — the same PHP endpoints, helpers, and JS behavior.

## Quick Start (local)

1. **Requirements**
   * PHP 8.x
   * MySQL/MariaDB
   * Web server (Apache/Nginx) or PHP built‑in server

2. **Database**
   * Create a database named `invoices_db`.
   * Import schema and seed data from `invoices_db.sql`.

3. **Configuration**
   * Update DB credentials in `config.php`.

4. **Run**
   * Point your web server docroot to this project.
   * Visit `landing.php` or `login.php` to enter the app.

## System Map (PHP pages & endpoints)

Use this as a build checklist when re‑creating the repo.

### Core auth + shared utilities

* `config.php` — DB connection bootstrap.
* `auth.php` — core auth helpers:
  * `csrf_token()` / `csrf_check()`
  * `current_user()`
  * `safe_next_url()`
  * `require_login()`
  * `login()` / `logout()`

### Dashboard & invoices

* `index.php` — main dashboard with invoice list, filters, KPIs.
* `rechnungen.php` — invoice overview / actions UI.
* `invoice_form.php` — invoice editor (line items, totals, QR, PDF preview).
* `save_invoice.php` — create/update invoice records.
* `edit.php` / `delete.php` — helper endpoints for invoice actions.

### Offers (Offerte)

* `offerte.php` — offer list + actions.
* `offerte-erstellen.php` — create offer.
* `offerte-edit.php` — edit offer (line items, totals, PDF/QR export).

### Contracts (Vertrag)

* `vertrag.php` — contract list.
* `vertrag-erstellen.php` — create contract.
* `vertrag-edit.php` — edit contract.

### Company + users

* `company.php` — company profile settings (branding, legal details).
* `users.php` — user management (roles, CRUD).

### Public & layout assets

* `landing.php` — marketing/entry page.
* `login.php` / `logout.php` — auth screens.
* `includes/sidebar.php` — shared navigation.
* `template.html` / `invoice_design.html` / `invoice_style.css` — invoice layout templates & base styling.

## Mobile‑responsive design notes

The UI is already mobile‑first in key places:

* **Landing page** adapts to smaller screens with burger menu + stacked grids.
* **Editor pages** expose quick edit panels and mobile menus for narrow viewports.
* **Invoice/offer tables** collapse and reflow with utility helpers.

When rebuilding the repo, preserve:

* The existing CSS variables (red spectrum theme).
* The responsive breakpoints in each page’s `<style>` or shared CSS.
* The mobile menu toggles (JS helpers on invoice/offer pages).

## Data flow (high level)

1. User logs in via `login.php`.
2. Auth helpers (`auth.php`) enforce sessions and CSRF.
3. Editor forms (`invoice_form.php`, `offerte-edit.php`) submit to save endpoints.
4. PDF/QR preview uses in‑page JS to render printable output.

## What to copy into the new `invoice` repo

* **All PHP files** in this root directory.
* **`includes/`** for shared navigation.
* **`uploads/`** for user‑uploaded assets.
* **`invoices_db.sql`** for schema/seed.
* **Static assets** (`*.css`, `*.html`, logo image).

That’s the complete functional surface area required to rebuild the system in a new repository.
