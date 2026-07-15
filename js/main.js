// Heroes Home Network — shared interactions
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Mobile nav
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('nav.main');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
      });
    }

    // Header shadow on scroll
    var header = document.querySelector('header.site');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('scrolled', window.scrollY > 8);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scenic art headers on state cards (decorative, injected so markup stays clean)
    document.querySelectorAll('.grid .card').forEach(function (card, i) {
      var link = card.querySelector('a.card-link[href^="/states/"][href$=".html"]');
      if (!link || card.classList.contains('state-card')) return;
      card.classList.add('state-card');
      var body = document.createElement('div');
      body.className = 'card-body';
      while (card.firstChild) body.appendChild(card.firstChild);
      var art = document.createElement('div');
      art.className = 'card-art g' + ((i % 6) + 1);
      art.setAttribute('aria-hidden', 'true');
      var label = document.createElement('span');
      label.textContent = (body.querySelector('h3') || {}).textContent || '';
      art.appendChild(label);
      card.appendChild(art);
      card.appendChild(body);
    });

    // Arrow affordance on card links
    document.querySelectorAll('a.card-link').forEach(function (a) {
      if (a.querySelector('.arr')) return;
      a.innerHTML = a.innerHTML.replace(/\s*(→|&rarr;)\s*$/, '');
      var arr = document.createElement('span');
      arr.className = 'arr';
      arr.textContent = '→';
      a.appendChild(arr);
    });

    // Wrap FAQ answers for padding (summary + body layout)
    document.querySelectorAll('details.faq').forEach(function (d) {
      if (d.querySelector('.faq-body')) return;
      var body = document.createElement('div');
      body.className = 'faq-body';
      Array.prototype.slice.call(d.children).forEach(function (child) {
        if (child.tagName !== 'SUMMARY') body.appendChild(child);
      });
      d.appendChild(body);
    });

    // Reveal-on-scroll: tag common blocks, then observe
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var targets = document.querySelectorAll(
        '.section-head, .card, .step, .prose > h2, .prose > p, .prose > ul, ' +
        '.prose > ol, .prose > details, .prose > .note, .prose > .table-wrap, ' +
        '.calc, .stats .grid > div, .cta-band h2, .cta-band p, .cta-band .btn'
      );
      targets.forEach(function (el) { el.classList.add('reveal'); });

      // Stagger siblings inside grids
      document.querySelectorAll('.grid').forEach(function (grid) {
        Array.prototype.slice.call(grid.children).forEach(function (el, i) {
          el.style.setProperty('--reveal-delay', (i % 4) * 0.09 + 's');
        });
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    }

    // Animated stat counters
    var counters = document.querySelectorAll('.stats .num');
    if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
      var animate = function (el) {
        var text = el.textContent.trim();
        var m = text.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
        if (!m) return;
        var prefix = m[1], target = parseFloat(m[2].replace(/,/g, '')), suffix = m[3];
        var start = null, dur = 1600;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 4);
          el.textContent = prefix + Math.round(target * eased).toLocaleString('en-US') + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animate(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  });
})();
