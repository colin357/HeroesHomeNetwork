// Serverless endpoint: POST /api/class-signup
// Sends an SMS notification via Twilio for each class signup.
//
// Required environment variables (set these in your hosting dashboard):
//   TWILIO_ACCOUNT_SID  - from your Twilio console
//   TWILIO_AUTH_TOKEN   - from your Twilio console
//   TWILIO_FROM_NUMBER  - your Twilio phone number, e.g. +15551234567
//
// Notification destination:
const NOTIFY_NUMBER = '+17867882699';

// Vercel/Netlify-style Node handler (no dependencies — calls Twilio's REST API
// directly). If your host uses a different signature, only the wrapper at the
// bottom needs adjusting.
async function sendSignupText({ name, email, phone, classDate }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error('Twilio environment variables are not configured');
  }
  const body =
    `New VA Loan Class signup${classDate ? ' (' + classDate + ')' : ''}:\n` +
    `${name}\n${email}\n${phone}`;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: NOTIFY_NUMBER, From: from, Body: body }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Twilio API error ${res.status}: ${detail.slice(0, 300)}`);
  }
}

function clean(value, max) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  try {
    let data = req.body;
    if (!data || typeof data === 'string') {
      data = JSON.parse(data || '{}');
    }
    const name = clean(data.name, 80);
    const email = clean(data.email, 120);
    const phone = clean(data.phone, 40);
    const classDate = clean(data.classDate, 40);
    if (!name || !/.+@.+\..+/.test(email) || phone.replace(/\D/g, '').length < 10) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid input' }));
    }
    await sendSignupText({ name, email, phone, classDate });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('class-signup error:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    const configMissing = /environment variables/.test(err.message);
    return res.end(JSON.stringify({
      error: configMissing ? 'twilio_not_configured' : 'send_failed',
    }));
  }
};
