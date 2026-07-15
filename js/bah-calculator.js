// BAH estimator — representative rates for planning purposes only.
// Anchor values approximate published E-5 "with dependents" rates for each
// military housing area; other grades are derived with typical grade spreads.
// Always verify exact rates at the official DoD BAH lookup.
(function () {
  var STATIONS = [
    { name: 'Colorado Springs, CO (Fort Carson / Peterson & Schriever SFB / USAFA)', e5: 2391 },
    { name: 'Killeen, TX (Fort Cavazos)', e5: 1653 },
    { name: 'El Paso, TX (Fort Bliss)', e5: 1449 },
    { name: 'San Antonio, TX (JBSA)', e5: 2064 },
    { name: 'Norfolk / Virginia Beach, VA (Naval Station Norfolk)', e5: 2148 },
    { name: 'Washington, DC area (Fort Belvoir / Pentagon / Quantico)', e5: 3111 },
    { name: 'Fayetteville, NC (Fort Bragg)', e5: 1602 },
    { name: 'Jacksonville, NC (Camp Lejeune)', e5: 1521 },
    { name: 'Tampa, FL (MacDill AFB)', e5: 2619 },
    { name: 'Fort Walton Beach / Destin, FL (Eglin & Hurlburt)', e5: 2337 },
    { name: 'Pensacola, FL (NAS Pensacola)', e5: 1938 },
    { name: 'Jacksonville, FL (NAS Jacksonville / Mayport)', e5: 2031 },
    { name: 'Columbus, GA (Fort Moore)', e5: 1587 },
    { name: 'Savannah / Hinesville, GA (Fort Stewart / Hunter AAF)', e5: 1998 },
    { name: 'Augusta, GA (Fort Eisenhower)', e5: 1614 },
    { name: 'San Diego, CA (Naval Base San Diego / Miramar / Pendleton)', e5: 3813 },
    { name: 'Tacoma, WA (Joint Base Lewis-McChord)', e5: 2712 },
    { name: 'Honolulu, HI (JB Pearl Harbor-Hickam / Schofield Barracks)', e5: 3921 },
    { name: 'Clarksville, TN / Fort Campbell, KY', e5: 1554 },
    { name: 'Oklahoma City / Lawton, OK (Tinker AFB / Fort Sill)', e5: 1497 }
  ];

  // Multipliers relative to the E-5 with-dependents anchor (typical spreads).
  var GRADES = [
    ['E-1', 0.90], ['E-2', 0.90], ['E-3', 0.90], ['E-4', 0.90],
    ['E-5', 1.00], ['E-6', 1.07], ['E-7', 1.12], ['E-8', 1.17], ['E-9', 1.22],
    ['W-1', 1.10], ['W-2', 1.15], ['W-3', 1.21], ['W-4', 1.27], ['W-5', 1.32],
    ['O-1', 1.05], ['O-2', 1.12], ['O-3', 1.22], ['O-4', 1.32], ['O-5', 1.38], ['O-6', 1.40]
  ];
  var WITHOUT_DEP_FACTOR = 0.82;

  var stationSel = document.getElementById('station');
  var gradeSel = document.getElementById('grade');
  if (!stationSel || !gradeSel) return;

  STATIONS.forEach(function (s, i) {
    var o = document.createElement('option');
    o.value = i; o.textContent = s.name;
    stationSel.appendChild(o);
  });
  GRADES.forEach(function (g) {
    var o = document.createElement('option');
    o.value = g[1]; o.textContent = g[0];
    if (g[0] === 'E-5') o.selected = true;
    gradeSel.appendChild(o);
  });

  document.getElementById('calc-btn').addEventListener('click', function () {
    var station = STATIONS[Number(stationSel.value)];
    var mult = Number(gradeSel.value);
    var withDeps = document.getElementById('dep').value === 'with';
    var rate = station.e5 * mult * (withDeps ? 1 : WITHOUT_DEP_FACTOR);
    rate = Math.round(rate);
    document.getElementById('amount').textContent =
      '$' + rate.toLocaleString('en-US') + '/mo';
    document.getElementById('detail').textContent =
      gradeSel.options[gradeSel.selectedIndex].text + ' ' +
      (withDeps ? 'with' : 'without') + ' dependents — ' + station.name +
      '. Estimate only; verify at the official DoD BAH lookup.';
    document.getElementById('result').style.display = 'block';
  });
})();
