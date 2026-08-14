// BAH estimator — representative rates for planning purposes only.
// Anchor values approximate published E-5 "with dependents" rates for each
// military housing area; other grades are derived with typical grade spreads.
// Always verify exact rates at the official DoD BAH lookup.
(function () {
  'use strict';

  var STATIONS = [
    { name: 'Colorado Springs, CO', bases: 'Fort Carson, Peterson SFB, Schriever SFB, USAFA', e5: 2391 },
    { name: 'Killeen, TX', bases: 'Fort Hood', e5: 1653 },
    { name: 'El Paso, TX', bases: 'Fort Bliss', e5: 1449 },
    { name: 'San Antonio, TX', bases: 'JBSA: Lackland, Randolph, Fort Sam Houston', e5: 2064 },
    { name: 'Corpus Christi, TX', bases: 'NAS Corpus Christi', e5: 1743 },
    { name: 'Norfolk / Virginia Beach, VA', bases: 'Naval Station Norfolk, JEB Little Creek', e5: 2148 },
    { name: 'Washington, DC area', bases: 'Fort Belvoir, Pentagon, JB Andrews, Fort Meade', e5: 3111 },
    { name: 'Quantico, VA', bases: 'MCB Quantico', e5: 2769 },
    { name: 'Hampton / Newport News, VA', bases: 'JB Langley-Eustis', e5: 2007 },
    { name: 'Fayetteville, NC', bases: 'Fort Bragg', e5: 1602 },
    { name: 'Jacksonville, NC', bases: 'Camp Lejeune, MCAS New River', e5: 1521 },
    { name: 'Goldsboro, NC', bases: 'Seymour Johnson AFB', e5: 1389 },
    { name: 'Havelock, NC', bases: 'MCAS Cherry Point', e5: 1359 },
    { name: 'Tampa, FL', bases: 'MacDill AFB', e5: 2619 },
    { name: 'Fort Walton Beach / Destin, FL', bases: 'Eglin AFB, Hurlburt Field', e5: 2337 },
    { name: 'Pensacola, FL', bases: 'NAS Pensacola', e5: 1938 },
    { name: 'Jacksonville, FL', bases: 'NAS Jacksonville, NS Mayport', e5: 2031 },
    { name: 'Columbus, GA', bases: 'Fort Benning', e5: 1587 },
    { name: 'Savannah / Hinesville, GA', bases: 'Fort Stewart, Hunter AAF', e5: 1998 },
    { name: 'Augusta, GA', bases: 'Fort Eisenhower', e5: 1614 },
    { name: 'Warner Robins, GA', bases: 'Robins AFB', e5: 1443 },
    { name: 'San Diego, CA', bases: 'Naval Base San Diego, Miramar, Camp Pendleton', e5: 3813 },
    { name: 'Fairfield, CA', bases: 'Travis AFB', e5: 2631 },
    { name: 'Lemoore, CA', bases: 'NAS Lemoore', e5: 1836 },
    { name: 'Twentynine Palms, CA', bases: 'MCAGCC Twentynine Palms', e5: 1809 },
    { name: 'Tacoma, WA', bases: 'Joint Base Lewis-McChord', e5: 2712 },
    { name: 'Bremerton / Silverdale, WA', bases: 'Naval Base Kitsap', e5: 2451 },
    { name: 'Oak Harbor, WA', bases: 'NAS Whidbey Island', e5: 2247 },
    { name: 'Spokane, WA', bases: 'Fairchild AFB', e5: 1662 },
    { name: 'Honolulu, HI', bases: 'JB Pearl Harbor-Hickam, Schofield Barracks, MCBH Kaneohe', e5: 3921 },
    { name: 'Anchorage, AK', bases: 'JB Elmendorf-Richardson', e5: 2532 },
    { name: 'Fairbanks, AK', bases: 'Eielson AFB, Fort Wainwright', e5: 1794 },
    { name: 'Clarksville, TN / Fort Campbell, KY', bases: 'Fort Campbell', e5: 1554 },
    { name: 'Millington, TN', bases: 'NSA Mid-South', e5: 1671 },
    { name: 'Louisville / Fort Knox, KY', bases: 'Fort Knox', e5: 1509 },
    { name: 'Oklahoma City, OK', bases: 'Tinker AFB', e5: 1497 },
    { name: 'Lawton, OK', bases: 'Fort Sill', e5: 1329 },
    { name: 'Enid, OK', bases: 'Vance AFB', e5: 1281 },
    { name: 'Junction City / Manhattan, KS', bases: 'Fort Riley', e5: 1416 },
    { name: 'Leavenworth, KS', bases: 'Fort Leavenworth', e5: 1626 },
    { name: 'Wichita, KS', bases: 'McConnell AFB', e5: 1443 },
    { name: 'St. Robert, MO', bases: 'Fort Leonard Wood', e5: 1347 },
    { name: 'Knob Noster, MO', bases: 'Whiteman AFB', e5: 1371 },
    { name: 'Huntsville, AL', bases: 'Redstone Arsenal', e5: 1683 },
    { name: 'Montgomery, AL', bases: 'Maxwell AFB', e5: 1497 },
    { name: 'Dothan / Enterprise, AL', bases: 'Fort Novosel', e5: 1422 },
    { name: 'Biloxi, MS', bases: 'Keesler AFB', e5: 1467 },
    { name: 'Columbus, MS', bases: 'Columbus AFB', e5: 1311 },
    { name: 'Little Rock / Jacksonville, AR', bases: 'Little Rock AFB', e5: 1434 },
    { name: 'Shreveport / Bossier City, LA', bases: 'Barksdale AFB', e5: 1503 },
    { name: 'Leesville, LA', bases: 'Fort Johnson', e5: 1338 },
    { name: 'Phoenix / Glendale, AZ', bases: 'Luke AFB', e5: 2334 },
    { name: 'Tucson, AZ', bases: 'Davis-Monthan AFB', e5: 1911 },
    { name: 'Sierra Vista, AZ', bases: 'Fort Huachuca', e5: 1704 },
    { name: 'Yuma, AZ', bases: 'MCAS Yuma, YPG', e5: 1719 },
    { name: 'Las Vegas, NV', bases: 'Nellis AFB, Creech AFB', e5: 2148 },
    { name: 'Fallon, NV', bases: 'NAS Fallon', e5: 1638 },
    { name: 'Albuquerque, NM', bases: 'Kirtland AFB', e5: 1839 },
    { name: 'Alamogordo, NM', bases: 'Holloman AFB', e5: 1308 },
    { name: 'Clovis, NM', bases: 'Cannon AFB', e5: 1263 },
    { name: 'Watertown, NY', bases: 'Fort Drum', e5: 1728 },
    { name: 'West Point, NY', bases: 'USMA West Point', e5: 2634 },
    { name: 'Trenton area, NJ', bases: 'JB McGuire-Dix-Lakehurst', e5: 2418 },
    { name: 'Dayton, OH', bases: 'Wright-Patterson AFB', e5: 1701 },
    { name: 'Belleville, IL', bases: 'Scott AFB', e5: 1707 },
    { name: 'North Chicago, IL', bases: 'Naval Station Great Lakes', e5: 2214 },
    { name: 'Ogden / Layton, UT', bases: 'Hill AFB', e5: 1902 },
    { name: 'Mountain Home, ID', bases: 'Mountain Home AFB', e5: 1389 },
    { name: 'Great Falls, MT', bases: 'Malmstrom AFB', e5: 1494 },
    { name: 'Omaha / Bellevue, NE', bases: 'Offutt AFB', e5: 1713 },
    { name: 'Minot, ND', bases: 'Minot AFB', e5: 1329 },
    { name: 'Grand Forks, ND', bases: 'Grand Forks AFB', e5: 1302 },
    { name: 'Rapid City, SD', bases: 'Ellsworth AFB', e5: 1521 },
    { name: 'Cheyenne, WY', bases: 'F.E. Warren AFB', e5: 1608 },
    { name: 'Columbia, SC', bases: 'Fort Jackson', e5: 1698 },
    { name: 'Sumter, SC', bases: 'Shaw AFB', e5: 1503 },
    { name: 'Charleston, SC', bases: 'JB Charleston', e5: 2124 },
    { name: 'Beaufort, SC', bases: 'MCRD Parris Island, MCAS Beaufort', e5: 1932 },
    { name: 'Groton / New London, CT', bases: 'Naval Submarine Base New London', e5: 2325 },
    { name: 'Dover, DE', bases: 'Dover AFB', e5: 1812 },
    { name: 'Aberdeen, MD', bases: 'Aberdeen Proving Ground', e5: 2043 },
    { name: 'Lexington Park, MD', bases: 'NAS Patuxent River', e5: 2334 }
  ];

  var GRADES = {
    E: [['E-1', 0.90], ['E-2', 0.90], ['E-3', 0.90], ['E-4', 0.90], ['E-5', 1.00],
        ['E-6', 1.07], ['E-7', 1.12], ['E-8', 1.17], ['E-9', 1.22]],
    W: [['W-1', 1.10], ['W-2', 1.15], ['W-3', 1.21], ['W-4', 1.27], ['W-5', 1.32]],
    O: [['O-1', 1.05], ['O-2', 1.12], ['O-3', 1.22], ['O-4', 1.32], ['O-5', 1.38], ['O-6', 1.40]]
  };
  var WITHOUT_DEP_FACTOR = 0.82;

  var comboInput = document.getElementById('station-input');
  if (!comboInput) return;
  var comboList = document.getElementById('station-list');
  var gradeCats = document.getElementById('grade-cats');
  var gradePills = document.getElementById('grade-pills');
  var depPills = document.getElementById('dep-pills');
  var resultEl = document.getElementById('result');

  var state = { station: null, cat: 'E', grade: 'E-5', mult: 1.0, withDeps: true, activeIdx: -1, matches: [] };

  /* ---------- station type-ahead ---------- */
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ''); }
  function filterStations(q) {
    q = norm(q);
    if (!q) return STATIONS.slice(0, 8);
    var terms = q.split(/\s+/).filter(Boolean);
    return STATIONS.filter(function (s) {
      var hay = norm(s.name + ' ' + s.bases);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    }).slice(0, 8);
  }
  function renderList() {
    if (!state.matches.length) {
      comboList.innerHTML = '<li class="combo-empty">No match — try a base name, city, or state abbreviation. Or call (719) 259-2246 for any ZIP code.</li>';
      comboList.hidden = false;
      return;
    }
    comboList.innerHTML = state.matches.map(function (s, i) {
      return '<li role="option" data-i="' + i + '" class="' + (i === state.activeIdx ? 'active' : '') + '" aria-selected="' + (i === state.activeIdx) + '">' +
        '<strong>' + s.name + '</strong><small>' + s.bases + '</small></li>';
    }).join('');
    comboList.hidden = false;
  }
  function closeList() { comboList.hidden = true; state.activeIdx = -1; }
  function selectStation(s) {
    state.station = s;
    comboInput.value = s.name + ' — ' + s.bases;
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
      return '<button type="button" class="pill' + (g[0] === state.grade ? ' active' : '') + '" data-grade="' + g[0] + '" data-mult="' + g[1] + '">' + g[0] + '</button>';
    }).join('');
  }
  gradeCats.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.cat = btn.getAttribute('data-cat');
    var first = GRADES[state.cat][state.cat === 'E' ? 4 : 0];
    state.grade = first[0]; state.mult = first[1];
    gradeCats.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    renderGradePills();
    calc();
  });
  gradePills.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-grade]');
    if (!btn) return;
    state.grade = btn.getAttribute('data-grade');
    state.mult = Number(btn.getAttribute('data-mult'));
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
  // with whatever estimate the visitor is currently looking at.
  function syncCapture(rate) {
    if (!captureEl) return;
    if (!state.station) { captureEl.hidden = true; return; }
    captureEl.hidden = false;
    if (captureStationEl) captureStationEl.textContent = state.station.name;
    if (captureForm) {
      captureForm.setAttribute('data-location', state.station.name);
      captureForm.setAttribute('data-context',
        'Estimate: $' + rate.toLocaleString('en-US') + '/mo — ' + state.grade + ' ' +
        (state.withDeps ? 'with' : 'without') + ' dependents at ' + state.station.name);
    }
  }

  /* ---------- live result ---------- */
  function calc() {
    if (!state.station) { resultEl.classList.remove('show'); syncCapture(0); return; }
    var rate = Math.round(state.station.e5 * state.mult * (state.withDeps ? 1 : WITHOUT_DEP_FACTOR));
    document.getElementById('amount').textContent = '$' + rate.toLocaleString('en-US') + '/mo';
    document.getElementById('detail').textContent =
      state.grade + ' ' + (state.withDeps ? 'with' : 'without') + ' dependents — ' + state.station.name +
      '. Estimate only; verify your exact rate at the official DoD BAH lookup.';
    resultEl.classList.add('show');
    syncCapture(rate);
  }

  renderGradePills();
})();
