// "Join the Network" — header button that opens a modal application form for
// real estate agents (veterans, service members, military spouses) who want a
// seat in the network. Posts to /api/lead with source "agent-join".
//
// Markup contract: any element with [data-join-open] opens the modal. The
// modal itself and the mobile nav link are injected here so every page only
// needs the header button plus this script.
(function () {
  'use strict';

  var MODAL_HTML =
    '<div class="join-modal" id="join-modal" hidden>' +
      '<div class="join-backdrop" data-join-close></div>' +
      '<div class="join-dialog" role="dialog" aria-modal="true" aria-labelledby="join-title">' +
        '<button type="button" class="join-close" aria-label="Close" data-join-close>&times;</button>' +
        '<div class="lead-block">' +
          '<div class="eyebrow">Agents &amp; Brokers</div>' +
          '<h2 id="join-title">Join the Network</h2>' +
          '<p class="join-intro">Seats are limited per installation and every agent clears our vetting standard first. Tell us about yourself and we’ll reach out to start the conversation.</p>' +
          '<form class="join-form lead-form" data-source="agent-join" novalidate>' +
            '<div class="lead-fields">' +
              '<div><label for="jn-name">Full Name</label><input id="jn-name" data-field="name" type="text" autocomplete="name" placeholder="Jane Doe" required></div>' +
              '<div><label for="jn-email">Email</label><input id="jn-email" data-field="email" type="email" autocomplete="email" placeholder="jane@brokerage.com" required></div>' +
              '<div><label for="jn-phone">Phone</label><input id="jn-phone" data-field="phone" type="tel" autocomplete="tel" placeholder="(555) 123-4567" required></div>' +
              '<div><label for="jn-brokerage">Brokerage</label><input id="jn-brokerage" data-field="brokerage" type="text" autocomplete="organization" placeholder="Keller Williams" required></div>' +
              '<div><label for="jn-location">Market / Nearest Installation</label><input id="jn-location" data-field="location" type="text" autocomplete="off" placeholder="Fort Carson, CO" required></div>' +
              '<div><label for="jn-connection">Military Connection</label>' +
                '<select id="jn-connection" data-field="connection" required>' +
                  '<option value="">Select one</option>' +
                  '<option>Veteran</option>' +
                  '<option>Active Duty</option>' +
                  '<option>Guard / Reserve</option>' +
                  '<option>Military Spouse</option>' +
                  '<option>Other / None yet</option>' +
                '</select></div>' +
              '<div><label for="jn-closings">Closings, Last 24 Months</label><input id="jn-closings" data-field="closings" type="number" min="0" inputmode="numeric" placeholder="12"></div>' +
              '<div><label for="jn-va">Of Those, VA-Financed</label><input id="jn-va" data-field="va" type="number" min="0" inputmode="numeric" placeholder="4"></div>' +
              '<div class="full"><label for="jn-notes">Anything else? <span class="opt">(optional)</span></label><textarea id="jn-notes" data-field="notes" rows="3" placeholder="Years licensed, teams, why you want in…"></textarea></div>' +
            '</div>' +
            '<button class="btn btn-red" type="submit" data-sending="Sending…">Submit My Application</button>' +
            '<p class="lead-note">We review every application by hand. Expect a call or email within a few business days. Questions? Call <a href="tel:+17192592246">(719) 259-2246</a>.</p>' +
          '</form>' +
          '<div class="form-done" hidden>' +
            '<div class="done-mark">✓</div>' +
            '<h3>Application received.</h3>' +
            '<p>Thanks for raising your hand. We’ll review your market, closings, and military connection and reach out within a few business days.</p>' +
          '</div>' +
          '<p class="form-error" hidden></p>' +
        '</div>' +
      '</div>' +
    '</div>';

  var modal, lastFocus;

  function val(form, name) {
    var el = form.querySelector('[data-field="' + name + '"]');
    return el ? String(el.value).trim() : '';
  }

  function open() {
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
      modal = document.getElementById('join-modal');
      modal.addEventListener('click', function (e) {
        if (e.target.closest('[data-join-close]')) close();
      });
      modal.querySelector('form.join-form').addEventListener('submit', submit);
    }
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('join-open');
    var nav = document.querySelector('nav.main.open');
    if (nav) nav.classList.remove('open');
    requestAnimationFrame(function () {
      modal.classList.add('show');
      var first = modal.querySelector('input');
      if (first) first.focus();
    });
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('show');
    document.body.classList.remove('join-open');
    setTimeout(function () { modal.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    var form = e.currentTarget;
    var block = form.closest('.lead-block');
    var errEl = block.querySelector('.form-error');
    var doneEl = block.querySelector('.form-done');
    var btn = form.querySelector('button[type="submit"]');

    function fail(msg) { errEl.textContent = msg; errEl.hidden = false; }
    errEl.hidden = true;

    var name = val(form, 'name'), email = val(form, 'email'), phone = val(form, 'phone');
    var brokerage = val(form, 'brokerage'), location = val(form, 'location');
    var connection = val(form, 'connection'), closings = val(form, 'closings');
    var va = val(form, 'va'), notes = val(form, 'notes');

    if (!name || !/.+@.+\..+/.test(email)) return fail('Please fill in your name and a valid email address.');
    if (phone.replace(/\D/g, '').length < 10) return fail('Please add a phone number we can reach you at.');
    if (!brokerage || !location || !connection) return fail('Please add your brokerage, market, and military connection.');

    var context = [
      'Brokerage: ' + brokerage,
      'Connection: ' + connection,
      closings ? 'Closings/24mo: ' + closings + (va ? ' (VA: ' + va + ')' : '') : '',
      notes ? 'Notes: ' + notes : ''
    ].filter(Boolean).join(' | ');

    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = btn.getAttribute('data-sending') || 'Sending…';

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name, email: email, phone: phone, location: location,
        source: 'agent-join', offer: 'Network agent application', context: context
      })
    }).then(function (r) {
      if (r.ok) return null;
      return r.json().catch(function () { return {}; }).then(function (data) {
        var err = new Error('bad status ' + r.status);
        err.status = r.status; err.code = data && data.error;
        throw err;
      });
    }).then(function () {
      form.hidden = true;
      doneEl.hidden = false;
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = label;
      var msg = 'Something went wrong sending that. Please try again, or call (719) 259-2246.';
      if (err && err.code === 'twilio_not_configured') {
        msg = 'This form isn’t configured yet (Twilio credentials missing on the server). Site admin: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER, then redeploy.';
      } else if (err && err.status === 404) {
        msg = 'Form endpoint not found on this deployment (/api/lead returned 404). Site admin: confirm the api/ folder is deployed. Meanwhile, call (719) 259-2246.';
      }
      fail(msg);
    });
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-join-open]');
    if (!trigger) return;
    e.preventDefault();
    open();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  // Mirror the header button inside the mobile nav, where header CTAs are hidden.
  document.addEventListener('DOMContentLoaded', function () {
    var list = document.querySelector('nav.main ul');
    if (list && !list.querySelector('[data-join-open]')) {
      var li = document.createElement('li');
      li.className = 'nav-join-mobile';
      li.innerHTML = '<a href="#join" data-join-open>Join the Network</a>';
      list.appendChild(li);
    }
    if (location.hash === '#join') open();
  });
})();
