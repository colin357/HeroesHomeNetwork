// Shared lead capture — powers every form on the site that posts to /api/lead
// (pre-approval, BAH calculator breakdown, state guides, PCS checklist).
//
// Markup contract:
//   <div class="lead-block">
//     <form class="lead-form" data-source="state-guide"
//           data-offer="Texas PCS packet" data-location="Texas" novalidate>
//       <input data-field="name"> <input data-field="email">
//       <input data-field="phone"> <input data-field="location">
//       <button type="submit">Send It</button>
//       <p class="form-error" hidden></p>
//     </form>
//     <div class="form-done" hidden>…</div>
//   </div>
//
// data-source        which form this is (matches SOURCE_LABELS in api/lead.js)
// data-offer         what the person is being sent
// data-location      fallback target base/state when there is no location input
// data-require-phone "true" to make the phone field mandatory
// data-context       extra detail (the BAH calculator sets this at runtime)
(function () {
  'use strict';

  var PHONE_MSG = 'Please add a phone number we can reach you at.';

  function field(form, name) {
    return form.querySelector('[data-field="' + name + '"]');
  }
  function value(form, name) {
    var el = field(form, name);
    return el ? el.value.trim() : '';
  }

  function submit(form) {
    var block = form.closest('.lead-block') || form.parentNode;
    var errEl = block.querySelector('.form-error');
    var doneEl = block.querySelector('.form-done');
    var btn = form.querySelector('button[type="submit"]');
    var name = value(form, 'name');
    var email = value(form, 'email');
    var phone = value(form, 'phone');
    var location = value(form, 'location') || form.getAttribute('data-location') || '';
    var requirePhone = form.getAttribute('data-require-phone') === 'true';
    var digits = phone.replace(/\D/g, '').length;

    function fail(msg) {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    if (errEl) errEl.hidden = true;

    if (!name || !/.+@.+\..+/.test(email)) {
      fail('Please fill in your name and a valid email address.');
      return;
    }
    if (requirePhone && digits < 10) {
      fail(PHONE_MSG);
      return;
    }
    if (phone && digits < 10) {
      fail('That phone number looks incomplete — leave it blank or enter 10 digits.');
      return;
    }

    var label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = btn.getAttribute('data-sending') || 'Sending…';
    }

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: phone,
        location: location,
        source: form.getAttribute('data-source') || 'website',
        offer: form.getAttribute('data-offer') || '',
        context: form.getAttribute('data-context') || ''
      })
    }).then(function (r) {
      if (r.ok) return null;
      return r.json().catch(function () { return {}; }).then(function (data) {
        var err = new Error('bad status ' + r.status);
        err.status = r.status;
        err.code = data && data.error;
        throw err;
      });
    }).then(function () {
      form.hidden = true;
      if (doneEl) doneEl.hidden = false;
    }).catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
      var msg = 'Something went wrong sending that. Please try again, or call (719) 259-2246 and we’ll take care of it by phone.';
      if (err && err.code === 'twilio_not_configured') {
        msg = 'This form isn’t configured yet (Twilio credentials missing on the server). Site admin: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER, then redeploy.';
      } else if (err && err.status === 404) {
        msg = 'Form endpoint not found on this deployment (/api/lead returned 404). Site admin: confirm the api/ folder is deployed. Meanwhile, call (719) 259-2246.';
      }
      fail(msg);
    });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form.lead-form');
    if (!form) return;
    e.preventDefault();
    submit(form);
  });
})();
