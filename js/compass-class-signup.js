// Compass VA loan class — signup form (single scheduled session)
(function () {
  'use strict';

  var CLASS_DATE = 'August 18, 2026 at 10:00 AM ET';
  var SOURCE = 'Compass Real Estate';

  var form = document.getElementById('class-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('f-name').value.trim();
    var email = document.getElementById('f-email').value.trim();
    var phone = document.getElementById('f-phone').value.trim();
    var officeEl = document.getElementById('f-office');
    var office = officeEl ? officeEl.value.trim() : '';
    var errEl = document.getElementById('form-error');
    errEl.hidden = true;
    if (!name || !/.+@.+\..+/.test(email) || phone.replace(/\D/g, '').length < 10) {
      errEl.textContent = 'Please fill in your name, a valid email, and a valid phone number.';
      errEl.hidden = false;
      return;
    }
    var btn = document.getElementById('f-submit');
    btn.disabled = true;
    btn.textContent = 'Saving your spot…';
    fetch('/api/class-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: phone,
        classDate: CLASS_DATE,
        source: SOURCE,
        office: office
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
      document.getElementById('form-done').hidden = false;
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Save My Spot';
      var msg = 'Something went wrong sending your signup. Please try again, or call (719) 259-2246 and we’ll add you manually.';
      if (err && err.code === 'twilio_not_configured') {
        msg = 'Signup service isn’t configured yet (Twilio credentials missing on the server). Site admin: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER, then redeploy.';
      } else if (err && err.status === 404) {
        msg = 'Signup endpoint not found on this deployment (/api/class-signup returned 404). Site admin: confirm the api/ folder is deployed. Meanwhile, call (719) 259-2246 to sign up.';
      }
      errEl.textContent = msg;
      errEl.hidden = false;
    });
  });
})();
