// VA loan class — schedule dates + signup form
(function () {
  'use strict';

  // Class runs the 4th Tuesday of every month, 12:00 PM ET.
  function fourthTuesday(year, month) {
    var d = new Date(year, month, 1);
    var offset = (2 - d.getDay() + 7) % 7; // 2 = Tuesday
    return new Date(year, month, 1 + offset + 21);
  }
  function nextClasses(count) {
    var out = [];
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    while (out.length < count) {
      var t = fourthTuesday(y, m);
      // class considered past after 1pm ET on the day; simple local-date compare
      if (t >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) out.push(t);
      m++; if (m > 11) { m = 0; y++; }
    }
    return out;
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var dates = nextClasses(3);

  var dateStrip = document.getElementById('class-dates');
  if (dateStrip) {
    dateStrip.innerHTML = dates.map(function (d, i) {
      return '<div class="class-date' + (i === 0 ? ' next' : '') + '">' +
        '<strong>' + MONTHS[d.getMonth()] + ' ' + d.getDate() + '</strong>' +
        '<span>' + d.getFullYear() + '</span>' +
        '<small>' + (i === 0 ? 'Next up' : 'Tuesday') + '</small></div>';
    }).join('');
  }
  var hero = document.getElementById('next-class-date');
  if (hero) {
    hero.innerHTML = '&#128197; Next class: Tuesday, ' + LONG_MONTHS[dates[0].getMonth()] + ' ' +
      dates[0].getDate() + ', ' + dates[0].getFullYear();
  }
  var blurb = document.getElementById('signup-blurb');
  if (blurb) {
    blurb.textContent = 'Free class on Tuesday, ' + LONG_MONTHS[dates[0].getMonth()] + ' ' +
      dates[0].getDate() + ', ' + dates[0].getFullYear() + ' at 12:00 PM ET. Sign up and we’ll send the Zoom link.';
  }

  // Signup form -> serverless endpoint -> Twilio SMS notification
  var form = document.getElementById('class-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('f-name').value.trim();
    var email = document.getElementById('f-email').value.trim();
    var phone = document.getElementById('f-phone').value.trim();
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
        classDate: LONG_MONTHS[dates[0].getMonth()] + ' ' + dates[0].getDate() + ', ' + dates[0].getFullYear()
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
