// BAH lookup — reads the published DoD rate table in js/bah-rates-2026.js and
// returns the exact rate for the selected military housing area, pay grade, and
// dependency status. No estimating or interpolation happens here: every figure
// shown comes straight from the published table.
(function () {
  'use strict';

  var TABLE = window.BAH_TABLE;
  var comboInput = document.getElementById('station-input');
  if (!comboInput || !TABLE) return;

  // Pay grade pickers. Each entry is [label, index into the rate arrays].
  // O-1E/O-2E/O-3E are the higher rates paid to officers with at least four
  // years of prior enlisted or warrant service. O-8 through O-10 are paid at
  // the O-7 rate, so the top officer pill covers them.
  function gi(grade) {
    var i = TABLE.GRADES.indexOf(grade);
    if (i === -1) throw new Error('unknown grade ' + grade);
    return i;
  }
  var GRADES = {
    E: [['E-1', gi('E-1')], ['E-2', gi('E-2')], ['E-3', gi('E-3')], ['E-4', gi('E-4')],
        ['E-5', gi('E-5')], ['E-6', gi('E-6')], ['E-7', gi('E-7')], ['E-8', gi('E-8')],
        ['E-9', gi('E-9')]],
    W: [['W-1', gi('W-1')], ['W-2', gi('W-2')], ['W-3', gi('W-3')], ['W-4', gi('W-4')],
        ['W-5', gi('W-5')]],
    O: [['O-1', gi('O-1')], ['O-1E', gi('O-1E')], ['O-2', gi('O-2')], ['O-2E', gi('O-2E')],
        ['O-3', gi('O-3')], ['O-3E', gi('O-3E')], ['O-4', gi('O-4')], ['O-5', gi('O-5')],
        ['O-6', gi('O-6')], ['O-7+', gi('O-7')]]
  };
  var DEFAULT_GRADE = { E: 4, W: 0, O: 0 }; // E-5, W-1, O-1

  // Flatten the rate table into the list the duty station search runs against.
  var STATIONS = Object.keys(TABLE.MHA).map(function (code) {
    var row = TABLE.MHA[code];
    return {
      code: code,
      name: row[0],
      bases: TABLE.BASES[code] || '',
      withDeps: row[1],
      withoutDeps: row[2]
    };
  }).sort(function (a, b) {
    // Installations the site has guides for surface first on an empty query.
    if (!!b.bases !== !!a.bases) return b.bases ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  var comboList = document.getElementById('station-list');
  var gradeCats = document.getElementById('grade-cats');
  var gradePills = document.getElementById('grade-pills');
  var depPills = document.getElementById('dep-pills');
  var resultEl = document.getElementById('result');

  var state = { station: null, cat: 'E', grade: 'E-5', gradeIdx: gi('E-5'), withDeps: true, activeIdx: -1, matches: [] };

  /* ---------- station type-ahead ---------- */
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function haystack(s) {
    if (!s._hay) s._hay = norm(s.name + ' ' + s.bases + ' ' + s.code);
    return s._hay;
  }
  function filterStations(q) {
    q = norm(q);
    if (!q) return STATIONS.slice(0, 8);
    var terms = q.split(' ');
    var hits = STATIONS.filter(function (s) {
      var hay = haystack(s);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    // Rank whole-word and name matches above mid-word matches inside a base list.
    hits.sort(function (a, b) { return score(b, terms) - score(a, terms); });
    return hits.slice(0, 8);
  }
  function score(s, terms) {
    var name = norm(s.name), hay = haystack(s), n = 0;
    terms.forEach(function (t) {
      if (name.indexOf(t) === 0) n += 4;
      else if (new RegExp('\\b' + t).test(name)) n += 3;
      else if (new RegExp('\\b' + t).test(hay)) n += 2;
      else n += 1;
    });
    if (s.bases) n += 1;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function subtitle(s) { return s.bases || 'Military housing area ' + s.code; }
  function renderList() {
    comboInput.setAttribute('aria-expanded', 'true');
    if (!state.matches.length) {
      comboList.innerHTML = '<li class="combo-empty">No match — try a base name, city, or state abbreviation. Or call (719) 259-2246 for any ZIP code.</li>';
      comboList.hidden = false;
      return;
    }
    comboList.innerHTML = state.matches.map(function (s, i) {
      return '<li role="option" data-i="' + i + '" class="' + (i === state.activeIdx ? 'active' : '') + '" aria-selected="' + (i === state.activeIdx) + '">' +
        '<strong>' + esc(s.name) + '</strong><small>' + esc(subtitle(s)) + '</small></li>';
    }).join('');
    comboList.hidden = false;
  }
  function closeList() {
    comboList.hidden = true;
    state.activeIdx = -1;
    comboInput.setAttribute('aria-expanded', 'false');
  }
  function selectStation(s) {
    state.station = s;
    comboInput.value = s.bases ? s.name + ' — ' + s.bases : s.name;
    closeList();
    calc();
  }
  comboInput.addEventListener('input', function () {
    state.station = null;
    state.matches = filterStations(comboInput.value);
    state.activeIdx = state.matches.length ? 0 : -1;
    renderList();
    calc();
  });
  comboInput.addEventListener('focus', function () {
    if (state.station) { comboInput.select(); }
    state.matches = filterStations(state.station ? '' : comboInput.value);
    state.activeIdx = -1;
    renderList();
  });
  comboInput.addEventListener('blur', function () {
    // Typing a station name and tabbing away should still produce a rate.
    if (!state.station && state.matches.length === 1) selectStation(state.matches[0]);
  });
  comboInput.addEventListener('keydown', function (e) {
    if (comboList.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); state.activeIdx = Math.min(state.activeIdx + 1, state.matches.length - 1); renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.activeIdx = Math.max(state.activeIdx - 1, 0); renderList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (state.matches[state.activeIdx]) selectStation(state.matches[state.activeIdx]); }
    else if (e.key === 'Escape') { closeList(); }
  });
  comboList.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); selectStation(state.matches[Number(li.getAttribute('data-i'))]); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.combo')) closeList();
  });

  /* ---------- grade + dependents pickers ---------- */
  function renderGradePills() {
    gradePills.innerHTML = GRADES[state.cat].map(function (g) {
      return '<button type="button" class="pill' + (g[0] === state.grade ? ' active' : '') + '" data-grade="' + g[0] + '" data-idx="' + g[1] + '">' + g[0] + '</button>';
    }).join('');
  }
  gradeCats.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.cat = btn.getAttribute('data-cat');
    var first = GRADES[state.cat][DEFAULT_GRADE[state.cat]];
    state.grade = first[0]; state.gradeIdx = first[1];
    gradeCats.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    renderGradePills();
    calc();
  });
  gradePills.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-grade]');
    if (!btn) return;
    state.grade = btn.getAttribute('data-grade');
    state.gradeIdx = Number(btn.getAttribute('data-idx'));
    gradePills.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    calc();
  });
  depPills.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-dep]');
    if (!btn) return;
    state.withDeps = btn.getAttribute('data-dep') === 'with';
    depPills.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    calc();
  });

  /* ---------- email capture on the results screen ---------- */
  var captureEl = document.getElementById('bah-capture');
  var captureStationEl = document.getElementById('bah-capture-station');
  var captureForm = captureEl ? captureEl.querySelector('.lead-form') : null;

  // Reveal the capture alongside the result and keep the lead payload in sync
  // with whatever rate the visitor is currently looking at.
  function syncCapture(rate) {
    if (!captureEl) return;
    if (!state.station) { captureEl.hidden = true; return; }
    captureEl.hidden = false;
    if (captureStationEl) captureStationEl.textContent = state.station.name;
    if (captureForm) {
      captureForm.setAttribute('data-location', state.station.name);
      captureForm.setAttribute('data-context',
        TABLE.year + ' BAH: $' + rate.toLocaleString('en-US') + '/mo — ' + state.grade + ' ' +
        (state.withDeps ? 'with' : 'without') + ' dependents at ' + state.station.name +
        ' (MHA ' + state.station.code + ')');
    }
  }

  /* ---------- live result ---------- */
  function calc() {
    if (!state.station) { resultEl.classList.remove('show'); syncCapture(0); return; }
    var rates = state.withDeps ? state.station.withDeps : state.station.withoutDeps;
    var rate = rates[state.gradeIdx];
    document.getElementById('amount').textContent = '$' + rate.toLocaleString('en-US') + '/mo';
    document.getElementById('detail').textContent =
      state.grade + ' ' + (state.withDeps ? 'with' : 'without') + ' dependents — ' +
      state.station.name + ' (MHA ' + state.station.code + '). Published ' + TABLE.year +
      ' DoD rate. Your rate follows your duty station ZIP code, so confirm your ZIP falls in this housing area.';
    resultEl.classList.add('show');
    syncCapture(rate);
  }

  renderGradePills();
})();
