// Serverless endpoint: POST /api/lead
// Handles every lead capture on the site — pre-approval requests, BAH
// calculator breakdowns, state guide sign-ups, and the PCS checklist — and
// sends an SMS notification via Twilio for each one.
//
// Required environment variables (set these in your hosting dashboard):
//   TWILIO_ACCOUNT_SID  - from your Twilio console
//   TWILIO_AUTH_TOKEN   - from your Twilio console
//   TWILIO_FROM_NUMBER  - your Twilio phone number, e.g. +15551234567
//
// Notification destination:
const NOTIFY_NUMBER = '+17867882699';

// Human labels for the form each lead came from, so the text message says what
// the person actually asked for.
const SOURCE_LABELS = {
  'pre-approval': 'Pre-approval request',
  'bah-calculator': 'BAH breakdown request',
  'state-guide': 'State guide lead',
  'pcs-checklist': 'PCS checklist request',
};

async function sendLeadText({ name, email, phone, location, source, context, offer }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error('Twilio environment variables are not configured');
  }
  const lines = [
    `New ${SOURCE_LABELS[source] || 'website lead'}:`,
    name,
    email,
  ];
  if (phone) lines.push(phone);
  if (location) lines.push(`Target: ${location}`);
  if (context) lines.push(context);
  if (offer) lines.push(`Wants: ${offer}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: NOTIFY_NUMBER, From: from, Body: lines.join('\n') }),
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
    const location = clean(data.location, 80);
    const source = clean(data.source, 40);
    const context = clean(data.context, 200);
    const offer = clean(data.offer, 120);
    // Phone is required only on the pre-approval form; the content offers ask
    // for it optionally so the email step stays low friction.
    const phoneOk = source === 'pre-approval'
      ? phone.replace(/\D/g, '').length >= 10
      : !phone || phone.replace(/\D/g, '').length >= 10;
    if (!name || !/.+@.+\..+/.test(email) || !phoneOk) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid input' }));
    }
    await sendLeadText({ name, email, phone, location, source, context, offer });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('lead error:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    const configMissing = /environment variables/.test(err.message);
    return res.end(JSON.stringify({
      error: configMissing ? 'twilio_not_configured' : 'send_failed',
    }));
  }
};
