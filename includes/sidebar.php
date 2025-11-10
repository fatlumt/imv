<?php
// Active-link helper
$current = basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
function navActive(array $names){ 
  global $current; 
  return in_array($current, $names, true) ? ' active' : ''; 
}
?>
<style>
  :root {
  --accent-50:  #fef2f2;
  --accent-200: #fecaca;
  --accent-600: #dc2626;
  --accent-700: #b91c1c;
  --line:       #e5e7eb;
  --muted:      #6b7280;
  --sidebar-w:  260px;
}

/* --- SIDEBAR LAYOUT --- */
.layout {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  min-height: 100vh;
}

.sidebar {
  background: #fff;
  border-right: 1px solid var(--line);
  padding: 18px;
  position: sticky;
  top: 0;
  height: 100dvh;
  z-index: 20;
  transition: transform .25s ease;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.brand .logo {
  width: 150px;
 
}

.brand h1 {
  font-size: 16px;
  margin: 0;
}

.menu a {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #111;
  font-weight: 500;
  text-decoration: none;
}

.menu a:hover {
  background: var(--accent-50);
}

.menu a.active {
  background: var(--accent-600);
  color: #fff;
}

.menu .section-title {
  margin: 12px 8px 6px;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .04em;
}

/* --- BURGER / MOBILE --- */
.burger {
  display: none;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
}
.burger span {
  display: block;
  width: 18px;
  height: 2px;
  background: #111;
  position: relative;
}
.burger span::before,
.burger span::after {
  content: "";
  position: absolute;
  left: 0;
  width: 18px;
  height: 2px;
  background: #111;
}
.burger span::before { top: -6px; }
.burger span::after  { top: 6px; }

/* --- RESPONSIVE --- */
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100dvh;
    width: var(--sidebar-w);
    transform: translateX(-100%);
    box-shadow: 0 20px 40px rgba(0,0,0,.2);
  }
  .sidebar.open { transform: translateX(0); }
  .burger { display: flex; }
}

</style>
<aside class="sidebar" id="sidebar">
  <div class="brand">
    <?php if (!empty($company['logo_path'])): ?>
      <img width="150px"class="logo" src="<?= htmlspecialchars($company['logo_path']) ?>" alt="Logo" style="object-fit:contain">
    <?php else: ?>
      <div class="logo" style="width:36px;height:36px;border:2px solid var(--accent-600);border-radius:9px"></div>
    <?php endif; ?>
    <!-- <h4>Krasniqi – Admin</h4> -->
  </div>

  <nav class="menu">
    <div class="section-title">Übersicht</div>
    <a href="index.php" class="<?= navActive(['index.php','dashboard.php']) ?>">🏠 Dashboard</a>

    <div class="section-title">Rechnungen</div>
    <a href="invoice_form.php" class="<?= navActive(['invoice_form.php','create.php']) ?>">➕ Neue Rechnung</a>
    <a href="rechnungen.php" class="<?= navActive(['invorechnungenices.php']) ?>">🧾 Alle Rechnungen</a>

    <div class="section-title">Offerten</div>
    <a href="offerte-erstellen.php" class="<?= navActive(['offerte-erstellen.php','offerte-erstellen.php']) ?>">➕ Neue Offerte</a>
    <a href="offerte.php" class="<?= navActive(['offers.php','offerten.php']) ?>">💼 Alle Offerten</a>

    <div class="section-title">Verträge</div>
    <a href="vertrag-erstellen.php" class="<?= navActive(['vertrag-erstellen.php','vertrag-erstellen.php']) ?>">➕ Neuer Vertrag</a>
    <a href="vertrag.php" class="<?= navActive(['vertrag.php','vertraege.php','vertrags.php']) ?>">📄 Alle Verträge</a>

    <div class="section-title">Stammdaten</div>
    <a href="company.php" class="<?= navActive(['company.php']) ?>">🏢 Firmenprofil</a>
    <a href="users.php" class="<?= navActive(['users.php','users.php']) ?>">👤 Benutzer</a>

    <div class="section-title">Hilfe</div>
    <a href="documentation.php" class="<?= navActive(['documentation.php','documentation.php']) ?>">📚 Dokumentation</a>

    <div class="section-title">Konto</div>
    <a href="logout.php">🚪 Abmelden</a>
  </nav>
</aside>
