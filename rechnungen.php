<?php
/***************************************************
 * Rechnungen – Übersicht (modern Offerte-style UI)
 * - White background, red topbar, mobile nav, quick-edit filter panel
 * - Search + status + date filters
 * - Autosave invoice status via fetch()
 * - AJAX delete with confirmation popup
 * - Export modal (print-friendly)
 ***************************************************/

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['user'])) {
  $next = $_SERVER['REQUEST_URI'] ?? 'rechnungen.php';
  header('Location: login.php?next='.urlencode($next));
  exit;
}
include 'config.php';

/* ---------- Helpers ---------- */
function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function chf($n){ return number_format((float)$n, 2, ',', "'") . ' CHF'; }
function ymd(DateTimeImmutable $dt){ return $dt->format('Y-m-d'); }

/* ---------- AJAX actions ---------- */
if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['ajax'])) {
  header('Content-Type: application/json; charset=utf-8');
  $act = $_POST['ajax'];

  if ($act==='update_status') {
    $id=(int)($_POST['id']??0); $status=$_POST['status']??'';
    if ($id>0 && in_array($status,['offen','bezahlt'],true)) {
      $amt_due=($status==='bezahlt')?0:1;
      $st=$conn->prepare("UPDATE invoices SET status=?, amount_due=? WHERE id=?");
      $st->bind_param('sdi',$status,$amt_due,$id);
      $st->execute();
    }
  }
  if ($act==='delete_invoice') {
    $id=(int)($_POST['id']??0);
    if ($id>0){ $st=$conn->prepare("DELETE FROM invoices WHERE id=?"); $st->bind_param('i',$id); $st->execute(); }
  }
  $agg=$conn->query("SELECT
    COALESCE(SUM(CASE WHEN status='bezahlt' THEN total ELSE 0 END),0) paid,
    COALESCE(SUM(CASE WHEN status='offen' THEN total ELSE 0 END),0) unpaid
    FROM invoices")->fetch_assoc();
  echo json_encode([
    'success'=>true,
    'paid_sum'=>chf($agg['paid']??0),
    'unpaid_sum'=>chf($agg['unpaid']??0)
  ]); exit;
}

/* ---------- Filters ---------- */
$q=trim($_GET['q']??'');
$statusF=$_GET['status']??'';
$range=$_GET['range']??'all';
$startI=$_GET['start']??'';
$endI=$_GET['end']??'';

$today=new DateTimeImmutable('today');
switch($range){
  case 'this-month': $s=$today->modify('first day of this month');$e=$today->modify('last day of this month');break;
  case 'last-month': $s=$today->modify('first day of last month');$e=$today->modify('last day of last month');break;
  case 'this-year': $y=$today->format('Y');$s=new DateTimeImmutable("$y-01-01");$e=new DateTimeImmutable("$y-12-31");break;
  case 'custom': $s=$startI?new DateTimeImmutable($startI):$today->modify('-10 years');$e=$endI?new DateTimeImmutable($endI):$today;break;
  default: $s=$today->modify('-50 years');$e=$today->modify('+1 day');
}
$start_ymd=ymd($s); $end_ymd=ymd($e);

/* ---------- WHERE ---------- */
$where=[];$params=[];$types='';
if($range!=='all'){ $where[]="DATE(invoice_date) BETWEEN ? AND ?";$params[]=$start_ymd;$params[]=$end_ymd;$types.='ss'; }
if($q!==''){ $where[]="(customer_name LIKE ? OR invoice_number LIKE ? OR bill_to LIKE ?)";$like="%$q%";array_push($params,$like,$like,$like);$types.='sss'; }
if(in_array($statusF,['bezahlt','offen'],true)){ $where[]="status=?";$params[]=$statusF;$types.='s'; }
$whereSql=$where?"WHERE ".implode(" AND ",$where):"";

/* ---------- Aggregates ---------- */
$aggSql="SELECT
  COALESCE(SUM(subtotal),0) net, COALESCE(SUM(vat_amount),0) vat,
  COALESCE(SUM(total),0) gross,
  COALESCE(SUM(CASE WHEN status='bezahlt' THEN total ELSE 0 END),0) paid,
  COALESCE(SUM(CASE WHEN status='offen' THEN total ELSE 0 END),0) unpaid,
  COUNT(*) cnt FROM invoices $whereSql";
$agg=$conn->prepare($aggSql); if($types) $agg->bind_param($types,...$params);
$agg->execute(); $tot=$agg->get_result()->fetch_assoc();

/* ---------- Pagination ---------- */
$per=max(5,min(100,(int)($_GET['per_page']??15))); $page=max(1,(int)($_GET['page']??1));
$offset=($page-1)*$per;
$count=$conn->prepare("SELECT COUNT(*) c FROM invoices $whereSql");
if($types) $count->bind_param($types,...$params);
$count->execute(); $rows=(int)$count->get_result()->fetch_assoc()['c'];
$pages=max(1,ceil($rows/$per));

$list="SELECT id,customer_name,invoice_number,invoice_date,subtotal,vat_amount,total,status
  FROM invoices $whereSql ORDER BY invoice_date DESC,id DESC LIMIT ? OFFSET ?";
$listTypes=$types.'ii'; $listParams=array_merge($params,[$per,$offset]);
$st=$conn->prepare($list); $st->bind_param($listTypes,...$listParams);
$st->execute(); $res=$st->get_result();
$vat_rate=8.1; $vat_due=$tot['net']*($vat_rate/100);
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Rechnungen – Übersicht</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{
 --bg:#fff;--ink:#0f172a;--muted:#6b7280;--line:#e5e7eb;
 --accent-600:#dc2626;--accent-700:#b91c1c;--paid:#16a34a;
 --radius:14px;--sidebar-w:260px;--mnav-h:64px;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);
 font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent-700);text-decoration:none}a:hover{text-decoration:underline}

/* Layout */
.layout{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh}
.sidebar{background:#fff;border-right:1px solid var(--line);padding:18px;position:sticky;top:0;height:100dvh;z-index:20;transition:transform .25s ease}
.content{padding:22px 26px;background:#fafafa}

/* Topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;
 background:var(--accent-600);color:#fff;padding:12px 18px;border-radius:12px;margin-bottom:16px}
.title{font-size:20px;font-weight:800;margin:0}
.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{background:#fff;color:#111;border:1px solid #d1d5db;padding:10px 14px;border-radius:999px;font-weight:600;cursor:pointer}
.btn.primary{background:var(--accent-600);color:#fff;border-color:var(--accent-700)}
.btn.primary:hover{background:var(--accent-700)}

/* Cards */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:14px 0 18px}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:16px 18px;
 box-shadow:0 4px 10px rgba(0,0,0,.04);transition:transform .15s ease}
.card:hover{transform:translateY(-2px)}
.card .label{color:var(--muted);font-size:12px;text-transform:uppercase}
.card .value{font-size:22px;font-weight:800;margin-top:6px}
.tiny{font-size:12px;color:var(--muted)}

/* Table */
.panel{background:#fff;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;margin-bottom:16px;box-shadow:0 6px 14px rgba(0,0,0,.05)}
.panel .hd{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid var(--line)}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 12px;border-bottom:1px solid var(--line);font-size:14px}
thead th{background:#fafafa;text-align:left;font-size:12px;font-weight:700}
tbody tr:hover{background:rgba(239,68,68,.03)}
.status-paid{color:var(--paid);font-weight:700}
.status-unpaid{color:var(--accent-600);font-weight:700}
.status-select{padding:6px 8px;border:1px solid var(--line);border-radius:8px;font:inherit;cursor:pointer}
.status-select.paid{border-color:var(--paid);color:var(--paid)}
.status-select.unpaid{border-color:var(--accent-600);color:var(--accent-600)}

/* Search */
.search-box{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:16px;box-shadow:0 2px 5px rgba(0,0,0,.03)}
.search-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.search-box input,.search-box select{border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:inherit}
.search-box input[type=text]{flex:1;min-width:180px}

/* Quick-edit + bottom nav base will come in part 2 */
@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{position:fixed;transform:translateX(-100%)}.content{padding:16px}}
</style>
</head>
<body>
<div class="layout">
  <?php include __DIR__.'/includes/sidebar.php'; ?>
  <main class="content">
    <div class="topbar">
      <h2 class="title">Rechnungen – Übersicht</h2>
      <div class="actions">
        <a href="create.php" class="btn">+ Neue Rechnung</a>
      </div>
    </div>

    <section class="cards">
      <div class="card"><div class="label">Umsatz (Brutto)</div><div class="value"><?= chf($tot['gross']) ?></div></div>
      <div class="card"><div class="label">Netto</div><div class="value"><?= chf($tot['net']) ?></div></div>
      <div class="card"><div class="label">MWST 8.1 %</div><div class="value"><?= chf($vat_due) ?></div></div>
      <div class="card"><div class="label">Status</div>
        <div class="value"><span id="paidSum" class="status-paid"><?= chf($tot['paid']) ?></span> bezahlt • <span id="unpaidSum" class="status-unpaid"><?= chf($tot['unpaid']) ?></span> offen</div>
      </div>
    </section>

    <form class="search-box" id="filterForm" method="get" action="">
      <div class="search-row">
        <input type="text" name="q" value="<?=h($q)?>" placeholder="Suchen … (Kunde, Nr)">
        <select name="status">
          <option value="">Status: Alle</option>
          <option value="bezahlt" <?= $statusF==='bezahlt'?'selected':'' ?>>Bezahlt</option>
          <option value="offen" <?= $statusF==='offen'?'selected':'' ?>>Offen</option>
        </select>
        <select name="range" id="range">
          <option value="all" <?= $range==='all'?'selected':'' ?>>Alle</option>
          <option value="this-month" <?= $range==='this-month'?'selected':'' ?>>Diesen Monat</option>
          <option value="last-month" <?= $range==='last-month'?'selected':'' ?>>Letzter Monat</option>
          <option value="this-year" <?= $range==='this-year'?'selected':'' ?>>Dieses Jahr</option>
          <option value="custom" <?= $range==='custom'?'selected':'' ?>>Benutzerdefiniert</option>
        </select>
        <input type="date" name="start" value="<?=h($range==='custom'?$start_ymd:'')?>">
        <input type="date" name="end" value="<?=h($range==='custom'?$end_ymd:'')?>">
        <button type="submit" class="btn primary">Filtern</button>
      </div>
    </form>

    <section class="panel">
      <div class="hd">
        <div><?= $rows ?> Rechnungen</div>
        <div>Seite <?= $page ?> / <?= $pages ?></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>ID</th><th>Kunde</th><th>Nr.</th><th>Datum</th><th>Netto</th><th>MWST</th><th>Total</th><th>Status</th><th>Aktionen</th>
          </tr></thead>
          <tbody>
          <?php if($res->num_rows==0): ?>
            <tr><td colspan="9" style="text-align:center;color:var(--muted)">Keine Rechnungen gefunden.</td></tr>
          <?php else: while($r=$res->fetch_assoc()): ?>
            <tr data-id="<?= $r['id'] ?>">
              <td>#<?= $r['id'] ?></td>
              <td><?= h($r['customer_name']) ?></td>
              <td><?= h($r['invoice_number']) ?></td>
              <td><?= h($r['invoice_date']) ?></td>
              <td><?= chf($r['subtotal']) ?></td>
              <td><?= chf($r['vat_amount']) ?></td>
              <td><strong><?= chf($r['total']) ?></strong></td>
              <td><select class="status-select <?=($r['status']==='bezahlt')?'paid':'unpaid'?>" data-id="<?= $r['id'] ?>">
                <option value="offen" <?= $r['status']==='offen'?'selected':'' ?>>Offen</option>
                <option value="bezahlt" <?= $r['status']==='bezahlt'?'selected':'' ?>>Bezahlt</option>
              </select></td>
              <td><a href="edit.php?id=<?= $r['id'] ?>">✏️</a> | <a href="#" data-del="<?= $r['id'] ?>">🗑</a></td>
            </tr>
          <?php endwhile; endif; ?>
          </tbody>
        </table>
      </div>
    </section>
    <!-- Floating Quick-Edit (⚙️) -->
    <button class="qe-fab" id="qeOpenBtn" title="Filter bearbeiten">⚙️</button>

    <!-- Mobile bottom navbar -->
    <nav class="m-nav" aria-label="Mobile actions">
      <button type="button" onclick="toggleMobileMenu()"><span class="ic">☰</span>Menü</button>
      <a href="rechnungen.php"><span class="ic">📄</span>Alle</a>
      <a href="create.php"><span class="ic">➕</span>Neu</a>
      <button type="button" onclick="openQuickEdit()"><span class="ic">🔍</span>Filter</button>
      <button type="button" onclick="downloadExport()"><span class="ic">⬇️</span>Export</button>
    </nav>

    <!-- Quick-Edit Filter Panel -->
    <aside class="qe-panel" id="qePanel" aria-hidden="true">
      <div class="qe-head">
        <strong>Filter bearbeiten</strong>
        <button class="btn-mini" id="qeCloseBtn">✕</button>
      </div>
      <div class="qe-body">
        <label>Suchbegriff</label>
        <input type="text" id="qeSearch" placeholder="Kunde oder Nr." value="<?=h($q)?>">

        <label>Status</label>
        <select id="qeStatus">
          <option value="">Alle</option>
          <option value="offen" <?=$statusF==='offen'?'selected':''?>>Offen</option>
          <option value="bezahlt" <?=$statusF==='bezahlt'?'selected':''?>>Bezahlt</option>
        </select>

        <label>Zeitraum</label>
        <select id="qeRange">
          <option value="all" <?=$range==='all'?'selected':''?>>Alle</option>
          <option value="this-month" <?=$range==='this-month'?'selected':''?>>Diesen Monat</option>
          <option value="last-month" <?=$range==='last-month'?'selected':''?>>Letzter Monat</option>
          <option value="this-year" <?=$range==='this-year'?'selected':''?>>Dieses Jahr</option>
          <option value="custom" <?=$range==='custom'?'selected':''?>>Benutzerdefiniert</option>
        </select>

        <div class="qe-row">
          <div>
            <label>Von</label>
            <input type="date" id="qeStart" value="<?=h($range==='custom'?$start_ymd:'')?>">
          </div>
          <div>
            <label>Bis</label>
            <input type="date" id="qeEnd" value="<?=h($range==='custom'?$end_ymd:'')?>">
          </div>
        </div>
      </div>
      <div class="qe-foot">
        <button class="btn primary" id="qeApplyBtn">✔ Anwenden</button>
      </div>
    </aside>

    <!-- Loader + Toast + Delete Confirm -->
    <div id="loader" class="loader"></div>
    <div id="toast" class="toast"></div>

    <div id="delConfirm" class="modal hidden">
      <div class="modal-box">
        <p>Möchten Sie diese Rechnung wirklich löschen?</p>
        <div class="actions">
          <button id="delYes" class="btn primary">Ja</button>
          <button id="delNo" class="btn">Abbrechen</button>
        </div>
      </div>
    </div>

    <style>
    /* ---- Quick-Edit panel, m-nav & modals ---- */
    .qe-fab{position:fixed;right:18px;bottom:18px;width:48px;height:48px;border-radius:999px;
      background:#111;color:#fff;font-size:20px;border:none;cursor:pointer;z-index:10000;
      box-shadow:0 10px 24px rgba(0,0,0,.22)}
    .qe-panel{position:fixed;top:0;right:-380px;width:360px;max-width:88vw;height:100dvh;
      background:#fff;border-left:1px solid #e5e7eb;box-shadow:-16px 0 40px rgba(0,0,0,.18);
      z-index:10001;display:flex;flex-direction:column;transition:right .28s ease}
    .qe-panel.open{right:0}
    .qe-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #e5e7eb}
    .qe-body{padding:14px;overflow:auto}
    .qe-body label{font-size:12px;color:#374151;font-weight:700;display:block;margin:10px 0 6px}
    .qe-body input,.qe-body select{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px;font:inherit}
    .qe-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .qe-foot{padding:12px 14px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end}
    .btn-mini{border:1px solid #d1d5db;background:#fff;padding:4px 8px;border-radius:999px}

    .m-nav{position:fixed;left:12px;right:12px;bottom:12px;height:var(--mnav-h);
      display:flex;align-items:center;justify-content:space-around;gap:8px;
      background:rgba(255,255,255,.62);backdrop-filter:blur(10px);
      border:1px solid rgba(0,0,0,.06);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.10);
      z-index:10003}
    .m-nav button,.m-nav a{background:transparent;border:none;padding:10px 8px;border-radius:12px;
      font-size:12px;color:#0f172a;text-align:center;text-decoration:none;min-width:56px}
    .m-nav .ic{display:block;font-size:18px;margin-bottom:4px}

    .loader{position:fixed;inset:0;background:rgba(255,255,255,.65);z-index:9998;display:none}
    .loader.show{display:block}
    .loader:after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:46px;height:46px;border:4px solid #e5e7eb;border-top-color:#ef4444;border-radius:999px;
      animation:spin .9s linear infinite}
    @keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}

    .toast{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
      background:#111;color:#fff;padding:14px 18px;border-radius:12px;z-index:9999;display:none}
    .toast.error{background:#b91c1c}
    .toast.show{display:block;animation:fade .25s ease}
    @keyframes fade{from{opacity:0;transform:translate(-50%,-56%)}to{opacity:1;transform:translate(-50%,-50%)}}

    .modal.hidden{display:none}
    .modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999}
    .modal-box{background:#fff;padding:22px 24px;border-radius:16px;max-width:300px;text-align:center}
    </style>
<script>
/* ========= UTILITIES ========= */
const toastEl=document.getElementById('toast');
function toast(msg,isErr=false){
  toastEl.textContent=msg;
  toastEl.className='toast show'+(isErr?' error':'');
  setTimeout(()=>toastEl.classList.remove('show'),1800);
}
function loader(on){document.getElementById('loader').classList.toggle('show',!!on);}

/* ========= STATUS UPDATE ========= */
document.querySelectorAll('.status-select').forEach(sel=>{
  sel.addEventListener('change',async()=>{
    const id=sel.dataset.id,status=sel.value;
    loader(true);
    try{
      const fd=new FormData();
      fd.append('ajax','update_status');fd.append('id',id);fd.append('status',status);
      const r=await fetch('',{method:'POST',body:fd});
      const j=await r.json();
      if(j.success){ 
        document.getElementById('paidSum').textContent=j.paid_sum;
        document.getElementById('unpaidSum').textContent=j.unpaid_sum;
        toast('Status gespeichert ✓');
      }else toast('Fehler',true);
    }catch(e){toast('Netzwerkfehler',true);}
    loader(false);
  });
});

/* ========= DELETE ========= */
const delModal=document.getElementById('delConfirm');
let delId=null;
document.querySelectorAll('[data-del]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();delId=a.dataset.del;
    delModal.classList.remove('hidden');
  });
});
document.getElementById('delNo').onclick=()=>delModal.classList.add('hidden');
document.getElementById('delYes').onclick=async()=>{
  if(!delId)return;
  loader(true);
  try{
    const fd=new FormData();
    fd.append('ajax','delete_invoice');
    fd.append('id',delId);
    const r=await fetch('',{method:'POST',body:fd});
    const j=await r.json();
    if(j.success){
      document.querySelector(`tr[data-id="${delId}"]`)?.remove();
      document.getElementById('paidSum').textContent=j.paid_sum;
      document.getElementById('unpaidSum').textContent=j.unpaid_sum;
      toast('Gelöscht ✓');
    }else toast('Fehler beim Löschen',true);
  }catch(e){toast('Netzwerkfehler',true);}
  loader(false);
  delModal.classList.add('hidden');
};

/* ========= QUICK-EDIT PANEL ========= */
const qePanel=document.getElementById('qePanel');
const qeOpen=document.getElementById('qeOpenBtn');
const qeClose=document.getElementById('qeCloseBtn');
const qeApply=document.getElementById('qeApplyBtn');

function openQuickEdit(){
  qePanel.classList.add('open');
  qePanel.setAttribute('aria-hidden','false');
}
function closeQuickEdit(){
  qePanel.classList.remove('open');
  qePanel.setAttribute('aria-hidden','true');
}
qeOpen?.addEventListener('click',openQuickEdit);
qeClose?.addEventListener('click',closeQuickEdit);
qeApply?.addEventListener('click',()=>{
  const s=new URLSearchParams(window.location.search);
  s.set('q',document.getElementById('qeSearch').value.trim());
  s.set('status',document.getElementById('qeStatus').value);
  s.set('range',document.getElementById('qeRange').value);
  s.set('start',document.getElementById('qeStart').value);
  s.set('end',document.getElementById('qeEnd').value);
  window.location.search=s.toString();
});

/* ========= EXPORT PLACEHOLDER ========= */
function downloadExport(){
  toast('Export wird vorbereitet …');
  setTimeout(()=>toast('Export abgeschlossen ✓'),1200);
}

/* ========= MOBILE NAV ========= */
function toggleMobileMenu(){document.body.classList.toggle('mobmenu-open');}
</script>
</body>
</html>
