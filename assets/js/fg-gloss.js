/* ==========================================================================
   MP DOORS · GLOSS LAYER · pointer light
   Moves the highlight on product cards, series photos and menu tiles so it
   follows the mouse, the way a reflection moves on real glass. Writes two
   custom properties (--mx, --my) on the lit surface; fg-gloss.css does the
   drawing. Mouse and pen only, and nothing at all when the visitor has asked
   for reduced motion (system setting or the footer toggle).
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function still() { return mqReduce.matches || root.getAttribute('data-motion') === 'off' || !root.classList.contains('gloss'); }

  // [element that receives the pointer, surface that carries the light]
  var HOSTS = [
    ['.fg-card', '.fg-card__img'],
    ['.fg-scard', '.fg-scard__img'],
    ['.fg-tile', null]
  ];

  HOSTS.forEach(function (pair) {
    Array.prototype.forEach.call(document.querySelectorAll(pair[0]), function (host) {
      var surface = pair[1] ? host.querySelector(pair[1]) : host;
      if (!surface) return;
      var frame = 0, x = 0, y = 0;
      function paint() {
        frame = 0;
        var r = surface.getBoundingClientRect();
        surface.style.setProperty('--mx', (x - r.left).toFixed(1) + 'px');
        surface.style.setProperty('--my', (y - r.top).toFixed(1) + 'px');
      }
      host.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch' || still()) return;
        x = e.clientX; y = e.clientY;
        if (!frame) frame = requestAnimationFrame(paint);
      }, { passive: true });
      host.addEventListener('pointerleave', function () {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        surface.style.removeProperty('--mx');   // light drifts back to its resting place
        surface.style.removeProperty('--my');
      });
    });
  });
})();
