# Heroes Home Network

SEO-optimized static website helping veterans and active-duty military families
research their next duty station before a PCS, use their VA loan benefit, and
buy a home — in all 50 states.

**Phone:** (719) 259-2246

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage — value proposition, how it works, popular PCS states, FAQ |
| `va-loan-guide.html` | Complete VA loan guide (eligibility, entitlement, funding fee, process, FAQ) |
| `bah-calculator.html` | BAH lookup by duty station / pay grade / dependents, using the published DoD rate table |
| `pcs-checklist.html` | Timeline-based PCS home buying checklist |
| `resources.html` | Curated official veteran resources |
| `states/` | State-by-state PCS guides (TX, VA, CO, NC, FL, GA + index) |
| `404.html` | Not-found page |

## SEO

- Unique titles, meta descriptions, canonicals, and Open Graph tags per page
- Structured data: Organization, WebSite, FAQPage, HowTo, Article, BreadcrumbList, WebApplication
- `sitemap.xml` and `robots.txt`
- Semantic HTML, mobile-responsive, no build step or external dependencies

## Development

Pure static HTML/CSS/JS — no build step. Serve locally with:

```sh
python3 -m http.server 8080
```

Canonical URLs assume the production domain `https://heroeshomenetwork.com`;
update canonicals and `sitemap.xml` if deploying under a different domain.

The BAH calculator serves exact published rates, not estimates. `js/bah-rates-2026.js`
holds the DoD 2026 BAH table — all 299 stateside military housing areas (MHAs) for
every pay grade, with and without dependents — plus the map of installations to
MHAs that powers the duty station search. `js/bah-calculator.js` only looks values
up in that table.

Regenerate the data file when DoD publishes the next rate year:

```
python3 tools/build-bah-rates.py --year 2027 \
  --with-url <2027 with-dependents rate table PDF> \
  --without-url <2027 without-dependents rate table PDF>
```

Then point `bah-calculator.html` at the new `js/bah-rates-<year>.js` and update the
year references in the page copy. The script re-checks the invariants (24 grades per
row, E-1 through E-4 equal, with-dependents >= without-dependents) before writing.
Two base guides — Arnold AFB and NAS Kingsville — sit in county cost groups rather
than a named MHA, so they are intentionally absent from the picker.

The states index map is derived from Wikimedia Commons "Blank US Map
(states only)" (public domain).

## VA Loan Class signups (Twilio)

`va-loan-class.html` posts signups to `/api/class-signup`
(`api/class-signup.js`, a dependency-free Node serverless handler in the
Vercel/Netlify style). It texts each signup to +1 (786) 788-2699 via
Twilio's REST API. Set these environment variables in your hosting
dashboard: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM_NUMBER`. Class dates (4th Tuesday monthly, 12:00 PM ET) are
computed automatically in `js/class-signup.js`.

## Lead capture (Twilio)

Every capture point on the site posts to `/api/lead` (`api/lead.js`) and texts
the lead to the same number using the same three Twilio environment variables
above. `js/lead-capture.js` drives all of them from one delegated submit
handler — include it after `js/main.js` on any page with a capture form.

| Page | Form (`data-source`) | Fields | Offer |
|---|---|---|---|
| `index.html#pre-approval` | `pre-approval` | name, email, phone, target base/state (all required) | Pre-approval + agent match |
| `bah-calculator.html` | `bah-calculator` | name, email, phone (optional) | Personalized BAH breakdown + PCS checklist |
| `states/*.html#get-packet` | `state-guide` | name, email, base/city + phone (optional) | State PCS packet + checklist |
| `pcs-checklist.html#get-checklist` | `pcs-checklist` | name, email, base/state + phone (optional) | Printable checklist PDF + VA document list |

The calculator's capture is hidden until a rate renders; `js/bah-calculator.js`
then reveals it and writes the live rate into the form's `data-context` so the
notification text includes the duty station, pay grade, and dollar amount the
visitor was looking at. Phone is mandatory only on the pre-approval form —
enforced client-side via `data-require-phone` and server-side in `api/lead.js`.

Markup contract for adding a capture point to a new page: a `.lead-block
.lead-capture` wrapper containing a `form.lead-form` (with `data-source`,
`data-offer`, and optional `data-location`), inputs tagged
`data-field="name|email|phone|location"`, a sibling `.form-done` block, and a
sibling `.form-error` paragraph — both `hidden`.

Fulfillment of the emailed offers (BAH breakdown, state packets, checklist PDF)
is manual today; the endpoint only delivers the notification text.
