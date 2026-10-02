/* ==========================================================================
   MP DOORS · FIGMA EDITION · page behaviour
   Runs after site.js (header, menus, search, rails).
   1. Product options as dropdowns. Each chip or swatch group gains a
      <select>; choosing an option clicks the original button, so the page's
      own inline script (gallery swaps, value labels) keeps doing the work.
   2. Series filters: checkbox groups (any-of within a group, all groups
      must match), removable keyword chips, live count, empty state.
   3. Footer "Do you have questions?": the address is handed to the Support
      contact form through sessionStorage, never through the URL.
   4. The filter panel starts closed on small screens.
   ========================================================================== */
(function () {
  'use strict';
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clean(t) { return (t || '').replace(/\s+/g, ' ').trim(); }

  /* ---------- 1. option dropdowns --------------------------------------- */
  var n = 0;
  $all('.buy .opt').forEach(function (opt) {
    var row = opt.querySelector('.opt__row, .swatchrow');
    if (!row) return;
    var btns = $all('button', row);
    if (!btns.length) return;
    var lbl = opt.querySelector('.opt__label');
    var sel = document.createElement('select');
    sel.className = 'fg-select';
    sel.id = 'fgopt' + (++n);
    if (lbl) { if (!lbl.id) lbl.id = sel.id + '-l'; sel.setAttribute('aria-labelledby', lbl.id); }
    btns.forEach(function (b, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = clean(b.getAttribute('data-name') || b.textContent);
      sel.appendChild(o);
    });
    function sync() {
      var i = btns.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
      if (i > -1) sel.value = String(i);
    }
    sync();
    if (btns.length === 1 || btns.every(function (b) { return b.disabled; })) sel.disabled = true;
    sel.addEventListener('change', function () { var b = btns[+sel.value]; if (b && !b.disabled) b.click(); sync(); });
    // other controls (thumbnails, glazing cards) can change the pressed state
    btns.forEach(function (b) { new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ['aria-pressed'] }); });
    row.parentNode.insertBefore(sel, row);
    opt.classList.add('is-enhanced');
  });
  // lay consecutive option groups out two by two, as in the design
  $all('.buy').forEach(function (buy) {
    var opts = $all(':scope > .opt', buy);
    if (opts.length < 2) return;
    var box = document.createElement('div');
    box.className = 'fg-opts';
    opts[0].parentNode.insertBefore(box, opts[0]);
    opts.forEach(function (o) { box.appendChild(o); });
  });

  /* ---------- 2. series filters ----------------------------------------- */
  $all('[data-filters]').forEach(function (shop) {
    var grid = shop.querySelector('[data-filter-grid]');
    var items = $all('[data-item]', grid);
    var boxes = $all('input[type="checkbox"][data-group]', shop);
    var keys = shop.querySelector('[data-filter-keys]');
    var count = shop.querySelector('[data-filter-count]');
    var empty = shop.querySelector('[data-filter-empty]');
    var clear = shop.querySelector('[data-filter-clear]');
    function apply() {
      var groups = {};
      boxes.forEach(function (b) { if (b.checked) (groups[b.dataset.group] = groups[b.dataset.group] || []).push(b.value); });
      var shown = 0;
      items.forEach(function (it) {
        var ok = Object.keys(groups).every(function (g) {
          var have = (it.getAttribute('data-' + g) || '').split(' ');
          return groups[g].some(function (v) { return have.indexOf(v) > -1; });
        });
        it.hidden = !ok; if (ok) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' door' : ' doors');
      if (empty) empty.hidden = shown > 0;
      if (clear) clear.hidden = !boxes.some(function (b) { return b.checked; });
      if (keys) {
        keys.innerHTML = '';
        var on = boxes.filter(function (b) { return b.checked; });
        if (!on.length) { var s = document.createElement('span'); s.className = 'fg-keys__none'; s.textContent = 'No filters selected'; keys.appendChild(s); }
        on.forEach(function (b) {
          var k = document.createElement('button');
          k.type = 'button'; k.className = 'fg-key';
          var name = clean(b.parentElement.querySelector('.fg-check__t').textContent);
          k.setAttribute('aria-label', 'Remove filter: ' + name);
          k.innerHTML = '<span></span><span aria-hidden="true">×</span>';
          k.firstChild.textContent = name;
          k.addEventListener('click', function () { b.checked = false; apply(); b.focus(); });
          keys.appendChild(k);
        });
      }
    }
    boxes.forEach(function (b) { b.addEventListener('change', apply); });
    if (clear) clear.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); apply(); });
    apply();
  });

  /* ---------- 3. footer question → contact form ------------------------- */
  $all('form[data-ask]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = f.querySelector('input[type="email"]');
      if (!input.value || !input.checkValidity()) { input.reportValidity ? input.reportValidity() : input.focus(); return; }
      try { sessionStorage.setItem('mp-ask-email', input.value); } catch (err) {}
      location.href = f.getAttribute('action');
    });
  });
  var cemail = document.getElementById('cemail');
  if (cemail) {
    var stored = null; try { stored = sessionStorage.getItem('mp-ask-email'); sessionStorage.removeItem('mp-ask-email'); } catch (err) {}
    if (stored) { cemail.value = stored; var nm = document.getElementById('cname'); if (nm) nm.focus(); }
  }

  /* ---------- 4. filter panel: closed by default on small screens ------- */
  var small = window.matchMedia('(max-width: 899px)');
  function panels() { $all('details.fg-filter').forEach(function (d) { d.open = !small.matches; }); }
  panels();
  if (small.addEventListener) small.addEventListener('change', panels);
})();
