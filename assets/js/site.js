/* ==========================================================================
   MP DOORS · SITE SCRIPT
   Shared behaviour for every page. Vanilla, no dependencies.

   Interior pages still carry their own inline script, which drives the
   mobile menu (#burger / #menu), the "Reduce animations" toggle
   (#motionToggle) and the .rev reveals. The homepage opts this file into
   those jobs with <body data-nav="site">, so nothing is bound twice.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var ownsNav = body.getAttribute('data-nav') === 'site';
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motionOff() { return mqReduce.matches || root.getAttribute('data-motion') === 'off'; }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- header: solid once scrolled, tucks away on the way down --- */
  var hdr = document.getElementById('hdr');
  var menu = document.getElementById('menu');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 10);
      var menuOpen = menu && menu.classList.contains('is-open');
      var panelOpen = !!document.querySelector('.site-nav__item.is-open');
      if (y > 240 && y > lastY + 4 && !menuOpen && !panelOpen) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 240) hdr.classList.remove('is-hidden');
    }
    lastY = y;
    parallax();
    scrub();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  if (hdr) hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });

  /* ---------- desktop nav panels: hover, click and keyboard ------------- */
  var items = $all('.site-nav__item.has-panel');
  function closeAll(except) { items.forEach(function (it) { if (it !== except) setPanel(it, false); }); }
  function setPanel(it, open) {
    it.classList.toggle('is-open', open);
    var b = it.querySelector('.site-nav__btn');
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  items.forEach(function (it) {
    var btn = it.querySelector('.site-nav__btn'), t = null;
    it.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) { clearTimeout(t); closeAll(it); setPanel(it, true); } });
    it.addEventListener('mouseleave', function () { if (window.matchMedia('(hover: hover)').matches) { t = setTimeout(function () { setPanel(it, false); }, 160); } });
    btn.addEventListener('click', function () { var open = !it.classList.contains('is-open'); closeAll(it); setPanel(it, open); });
    it.addEventListener('focusout', function (e) { if (!it.contains(e.relatedTarget)) setPanel(it, false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelector('.site-nav__item.is-open');
    if (open) { setPanel(open, false); open.querySelector('.site-nav__btn').focus(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.site-nav__item')) closeAll(null); });

  /* ---------- mobile menu (homepage owns it; interior pages already do) - */
  var burger = document.getElementById('burger');
  if (ownsNav && burger && menu) {
    var setMenu = function (open) {
      menu.hidden = false;
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    $all('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }
  if (menu) {
    // Lock the page behind the open menu, whichever script opened it.
    new MutationObserver(function () {
      var open = menu.classList.contains('is-open');
      root.classList.toggle('is-locked', open);
      if (hdr && open) hdr.classList.remove('is-hidden');
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open') && burger) { burger.click(); burger.focus(); }
    });
  }

  /* ---------- "Reduce animations" (homepage owns it) -------------------- */
  var tog = document.getElementById('motionToggle');
  if (ownsNav && tog) {
    var lbl = tog.querySelector('[data-state]');
    var applyMotion = function (off) {
      root.setAttribute('data-motion', off ? 'off' : 'on');
      tog.setAttribute('aria-pressed', String(off));
      if (lbl) lbl.textContent = off ? 'On' : 'Off';
      document.dispatchEvent(new CustomEvent('mp:motion', { detail: { off: off } }));
    };
    var stored = null; try { stored = localStorage.getItem('mp-motion'); } catch (e) {}
    applyMotion(stored === 'off');
    tog.addEventListener('click', function () {
      var off = root.getAttribute('data-motion') !== 'off';
      applyMotion(off);
      try { localStorage.setItem('mp-motion', off ? 'off' : 'on'); } catch (e) {}
    });
  }

  /* ---------- split headlines into words -------------------------------- */
  $all('[data-split]').forEach(function (el) {
    var i = 0;
    (function walk(node) { // nested <em> keeps its styling; <br> is left alone
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.className = 'w__i'; inner.style.setProperty('--i', i++);
            inner.textContent = part; w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    })(el);
  });

  /* ---------- line drawings: measure each path once --------------------- */
  $all('.draw path').forEach(function (p) {
    try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) {}
  });

  /* ---------- reveal on scroll ------------------------------------------ */
  var revealables = $all('[data-reveal], [data-split], .draw');
  if (!('IntersectionObserver' in window)) revealables.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
  }
  // Interior pages: their inline script reveals .rev; nothing to do here.
  if (ownsNav) $all('.rev').forEach(function (el) { el.classList.add('in'); });

  /* ---------- parallax: a few images drift against the scroll ----------- */
  var plx = $all('[data-parallax]');
  function parallax() {
    if (!plx.length) return;
    var vh = window.innerHeight, off = motionOff();
    plx.forEach(function (el) {
      if (off) { el.style.transform = ''; return; }
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var k = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      var c = (r.top + r.height / 2 - vh / 2) * -k;
      el.style.transform = 'translate3d(0,' + c.toFixed(1) + 'px,0) scale(' + (1 + Math.abs(k) * 1.2).toFixed(3) + ')';
    });
  }

  /* ---------- words that fill in with ink as they are read -------------- */
  var scrubs = $all('[data-scrub]');
  scrubs.forEach(function (el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'sw'; s.textContent = part; words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.hasAttribute('data-keep')) walk(n);
      });
    })(el);
    el._words = words;
  });
  function scrub() {
    if (!scrubs.length) return;
    var vh = window.innerHeight, off = motionOff();
    scrubs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = off ? 1 : Math.min(1, Math.max(0, (vh * 0.86 - r.top) / (r.height + vh * 0.32)));
      var n = el._words.length, lit = p * n;
      el._words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    });
  }

  /* ---------- counters ---------------------------------------------------- */
  var counters = $all('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, to = parseFloat(el.getAttribute('data-count')), from = parseFloat(el.getAttribute('data-from') || 0);
        if (motionOff()) { el.textContent = to; return; }
        var t0 = null, dur = 1600;
        (function step(now) {
          if (!t0) t0 = now;
          var x = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - x, 4);
          el.textContent = Math.round(from + (to - from) * e);
          if (x < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) {
      // Markup holds the final figure (no-JS); start from the low end only when it will animate.
      if (!motionOff()) el.textContent = el.getAttribute('data-from') || '0';
      cio.observe(el);
    });
  }

  /* ---------- rails: buttons, drag, progress, filters ------------------- */
  $all('[data-rail]').forEach(function (rail) {
    var track = rail.querySelector('[data-rail-track]');
    var prev = rail.querySelector('[data-rail-prev]'), next = rail.querySelector('[data-rail-next]');
    var bar = rail.querySelector('[data-rail-bar]');
    if (!track) return;
    function step() { var c = track.querySelector(':scope > :not([hidden])'); return c ? c.getBoundingClientRect().width + 20 : 320; }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.max(0.08, track.scrollLeft / max) : 1) + ')';
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step() * 2, behavior: motionOff() ? 'auto' : 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step() * 2, behavior: motionOff() ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    // drag with a mouse; touch keeps native swiping
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; track.classList.add('is-drag'); });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; track.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; track.classList.remove('is-drag'); });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    // Optional motion hooks; a page without the matching CSS shows none of it.
    var thumb = rail.querySelector('.seg__thumb');
    function placeThumb() {
      var on = rail.querySelector('[data-rail-filter][aria-pressed="true"]');
      if (!thumb || !on) return;
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }
    $all('[data-rail-filter]', rail).forEach(function (f) {
      f.addEventListener('click', function () {
        var v = f.getAttribute('data-rail-filter');
        $all('[data-rail-filter]', rail).forEach(function (o) { o.setAttribute('aria-pressed', String(o === f)); });
        placeThumb();
        var shown = [];
        $all(':scope > [data-kind]', track).forEach(function (c) {
          c.hidden = v !== 'all' && c.getAttribute('data-kind') !== v;
          c.classList.remove('is-enter');
          if (!c.hidden) shown.push(c);
        });
        void track.offsetWidth;                       // restart the entrance
        shown.forEach(function (c, i) { c.style.setProperty('--k', i); c.classList.add('is-enter'); });
        track.scrollLeft = 0; update();
        var live = rail.querySelector('[data-rail-count]');
        if (live) {
          var n = live.querySelector('[data-rail-n]');
          if (n) { n.textContent = shown.length; live.classList.remove('is-tick'); void live.offsetWidth; live.classList.add('is-tick'); }
          else live.textContent = shown.length + ' doors';
        }
      });
    });
    if (thumb) {
      placeThumb();
      window.addEventListener('resize', placeThumb);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);
      rail.classList.add('has-thumb');
    }
    update();
  });

  /* ---------- tabs (climate zones) -------------------------------------- */
  $all('[data-tabs]').forEach(function (box) {
    var tabs = $all('[role="tab"]', box), panels = $all('[role="tabpanel"]', box), media = $all('[data-tab-media]', box);
    function select(i, focus) {
      tabs.forEach(function (t, j) { var on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p, j) { p.hidden = i !== j; });
      media.forEach(function (m, j) { m.classList.toggle('is-on', i === j); });
      box.setAttribute('data-zone', i);
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length;
        if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); select((i + 1) % n, true); }
        if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); select((i - 1 + n) % n, true); }
        if (k === 'Home') { e.preventDefault(); select(0, true); }
        if (k === 'End') { e.preventDefault(); select(n - 1, true); }
      });
    });
    select(0);
  });

  /* ---------- the guide form (homepage) --------------------------------- */
  var gf = document.getElementById('guideForm');
  if (gf) gf.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = gf.querySelector('input[type="email"]'), note = gf.querySelector('[data-form-note]');
    if (!input.value || !input.checkValidity()) { input.focus(); if (note) note.textContent = 'Please enter a valid email address.'; gf.classList.add('is-error'); return; }
    gf.classList.remove('is-error'); gf.classList.add('is-sent');
    if (note) note.textContent = 'Thank you. The guide is on its way to ' + input.value + '.';
    input.value = '';
  });

  /* ---------- outbound shop clicks -------------------------------------- */
  if (ownsNav) $all('[data-cta]').forEach(function (a) {
    a.addEventListener('click', function () { if (typeof window.gtag === 'function') window.gtag('event', 'outbound_shop_click', { placement: a.dataset.cta }); });
  });

  /* ---------- search ----------------------------------------------------- */
  var PAGES = [
    ['Entry Doors', 'entry-doors.html', 'Collection', 'Ten fiberglass styles on a waterproof composite frame', 'assets/product/entry/craftsman.webp', 'entry front door fiberglass all'],
    ['1/2 Lite', 'entry-half-lite.html', 'Entry door', 'Half-height decorative glass', 'assets/product/entry/half-lite.webp', 'half lite glass'],
    ['3 Lite', 'entry-3-lite.html', 'Entry door', 'Mid-century, three horizontal lites', 'assets/product/entry/3-lite.webp', 'three mid century modern'],
    ['3/4 Lite', 'entry-3-4-lite.html', 'Entry door', 'Three-quarter decorative glass', 'assets/product/entry/3-4-lite.webp', 'three quarter decorative glass'],
    ['4 Lite', 'entry-4-lite.html', 'Entry door', 'Mid-century, four horizontal lites', 'assets/product/entry/4-lite.webp', 'four mid century'],
    ['Full Lite', 'entry-full-lite.html', 'Entry door', 'Large decorative glass', 'assets/product/entry/full-lite.webp', 'full glass decorative'],
    ['Narrow Lite', 'entry-narrow-lite.html', 'Entry door', 'Slim vertical glass', 'assets/product/entry/narrow-lite.webp', 'narrow vertical modern'],
    ['Contemporary Teak', 'entry-contemporary-teak.html', 'Entry door', 'Solid, architectural, teak-toned', 'assets/product/entry/teak.webp', 'teak solid wood look oak'],
    ['Craftsman', 'entry-craftsman.html', 'Entry door', 'Straight-edge panels and a glazing bead', 'assets/product/entry/craftsman.webp', 'craftsman oak vintage'],
    ['Modern Full Lite', 'entry-modern-full-lite.html', 'Entry door', 'Full view or four-lite SDL grid', 'assets/product/entry/modern-full-lite.webp', 'modern full view black white'],
    ['3/4 Oval Lite', 'entry-3-4-oval-lite.html', 'Entry door', 'Oval decorative glass', 'assets/product/entry/3-4-oval-lite.webp', 'oval decorative traditional'],
    ['Patio Doors', 'patio-doors.html', 'Collection', 'Gliding and hinged patio doors', 'assets/product/gliding-2panel/lifestyle-living.webp', 'patio slider french all'],
    ['Gliding Patio Doors', 'patio-gliding.html', 'Collection', 'Two gliding patio doors', 'assets/product/gliding-2panel/gbg.webp', 'gliding sliding slider'],
    ['Hinged Patio Doors', 'patio-hinged.html', 'Collection', 'Three hinged patio doors, including impact', 'assets/product/full-lite-hinged/gbg.webp', 'hinged french swing'],
    ['Full Lite Gliding', 'patio-2-panel-gliding.html', 'Patio door', '24 configurations · DP50', 'assets/product/gliding-2panel/gbg.webp', 'sliding two panel 2 panel slider'],
    ['3/4 Lite Gliding', 'gliding-3-4-lite.html', 'Patio door', '20 configurations · 0.26 U-Factor', 'assets/product/gliding/gbg-6lite.webp', 'sliding slider three quarter'],
    ['Full Lite Hinged', 'patio-full-lite-hinged.html', 'Patio door', '48 configurations · PG55', 'assets/product/full-lite-hinged/gbg.webp', 'french hinged swing'],
    ['3/4 Lite Hinged', 'patio-3-4-lite-hinged.html', 'Patio door', '20 configurations · PG50', 'assets/product/3-4-lite-hinged/gbg.webp', 'french hinged three quarter'],
    ['HVHZ Impact Full Lite Hinged', 'patio-impact-full-lite-hinged.html', 'Patio door', 'Florida impact · DP50', 'assets/product/impact-hinged/studio.webp', 'hurricane impact florida coastal hvhz miami dade'],
    ['Why MP Doors', 'why-composite.html', 'About', 'Composite, HydroShield and certifications', 'assets/scene/craftsman-lifestyle.webp', 'composite material hydroshield energy star certification comparison wood steel'],
    ['Real Projects', 'real-projects.html', 'Inspiration', 'Installations by climate and style', 'assets/scene/gliding-blinds-lifestyle.webp', 'projects gallery photos homes inspiration'],
    ['Support & Guides', 'warranty-support.html', 'Support', 'Measure, install, care, warranty, FAQ', 'assets/scene/in-store.webp', 'warranty support care faq install measure contact help'],
    ['How to measure a rough opening', 'blog.html#measure', 'Guide', 'Measure before you buy', 'assets/product/3-4-lite-hinged/lifestyle-room.webp', 'measure rough opening size width height'],
    ['U-Factor and SHGC, in plain terms', 'blog.html#u-factor', 'Guide', 'Reading the energy label', 'assets/product/entry/craftsman-low-e.webp', 'energy u-factor shgc label low-e'],
    ['What HVHZ approval certifies', 'blog.html#hvhz', 'Guide', 'High-velocity hurricane zones explained', 'assets/scene/coastal-16-9.webp', 'hvhz hurricane impact florida'],
    ['Choosing decorative glass', 'blog.html#glass', 'Guide', 'Light in, privacy kept', 'assets/product/entry/3-4-oval-lite.webp', 'glass decorative privacy'],
    ['Contact us', 'warranty-support.html#contact', 'Support', '1-888-366-7717', 'assets/scene/in-store.webp', 'contact phone call email help']
  ];
  var dlg = null, input = null, list = null, sel = -1, results = [];
  function buildSearch() {
    dlg = document.createElement('dialog');
    dlg.className = 'search'; dlg.id = 'search'; dlg.setAttribute('aria-label', 'Search MP Doors');
    dlg.innerHTML =
      '<form class="search__bar" method="dialog" role="search">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<label class="sr" for="searchInput">Search doors, guides and support</label>' +
      '<input class="search__input" id="searchInput" type="search" autocomplete="off" placeholder="Search doors, guides, support" role="combobox" aria-expanded="true" aria-controls="searchList" aria-autocomplete="list">' +
      '<button class="search__close" type="button" data-search-close>Esc</button></form>' +
      '<ul class="search__list" id="searchList" role="listbox" aria-label="Results"></ul>' +
      '<p class="search__hint"><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open. Press <kbd>/</kbd> anywhere to search.</p>';
    body.appendChild(dlg);
    input = dlg.querySelector('input'); list = dlg.querySelector('ul');
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); var r = results[sel < 0 ? 0 : sel]; if (r) location.href = r[1]; }
    });
    dlg.querySelector('[data-search-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  function score(p, q) {
    var hay = (p[0] + ' ' + p[2] + ' ' + p[3] + ' ' + p[5]).toLowerCase(), s = 0;
    var ok = q.split(/\s+/).every(function (t) { var i = hay.indexOf(t); if (i < 0) return false; s += (p[0].toLowerCase().indexOf(t) === 0 ? 10 : p[0].toLowerCase().indexOf(t) > -1 ? 6 : 1); return true; });
    return ok ? s : -1;
  }
  function render() {
    var q = input.value.trim().toLowerCase();
    results = !q ? PAGES.filter(function (p) { return /Collection|About|Inspiration|Support/.test(p[2]); }).slice(0, 6)
      : PAGES.map(function (p) { return [score(p, q), p]; }).filter(function (x) { return x[0] > -1; }).sort(function (a, b) { return b[0] - a[0]; }).map(function (x) { return x[1]; }).slice(0, 8);
    sel = -1;
    list.innerHTML = results.length ? results.map(function (p, i) {
      return '<li class="search__item" role="option" id="sr-' + i + '" aria-selected="false"><a href="' + p[1] + '" tabindex="-1">' +
        '<span class="search__thumb" style="background-image:url(\'' + p[4] + '\')"></span>' +
        '<span><span class="search__t">' + p[0] + '</span><span class="search__d">' + p[3] + '</span></span>' +
        '<span class="search__k">' + p[2] + '</span></a></li>';
    }).join('') : '<li class="search__empty">Nothing matched “' + input.value.replace(/[<>&"]/g, '') + '”. Try “craftsman”, “sliding” or “warranty”.</li>';
    input.removeAttribute('aria-activedescendant');
  }
  function move(d) {
    if (!results.length) return;
    sel = (sel + d + results.length) % results.length;
    $all('.search__item', list).forEach(function (li, i) { li.setAttribute('aria-selected', String(i === sel)); if (i === sel) li.scrollIntoView({ block: 'nearest' }); });
    input.setAttribute('aria-activedescendant', 'sr-' + sel);
  }
  function openSearch() {
    if (!dlg) buildSearch();
    if (dlg.open) return;
    input.value = ''; render();
    dlg.showModal(); input.focus();
  }
  $all('[data-search-open]').forEach(function (b) { b.addEventListener('click', openSearch); });
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
  });

  onScroll();
  document.addEventListener('mp:motion', function () { parallax(); scrub(); });
})();
