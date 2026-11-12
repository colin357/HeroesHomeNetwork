#!/usr/bin/env python3
"""Build paste-ready HighLevel (GHL) Sites blocks from the static site.

Run from the repository root:  python3 ghl-export/build.py

Output (ghl-export/out/):
  00-SITE-HEAD.html     -> Website Settings > Head tracking code (fonts + all CSS)
  01-SITE-FOOTER.html   -> Website Settings > Footer tracking code (all JS)
  pages/<slug>.html     -> one per page: paste into a Custom Code element
  pages/<slug>.seo.txt  -> page path, title, description, social image, head code
  PAGE-LIST.csv         -> every page: old URL, new path, title
  REDIRECTS.csv         -> old URL -> new path (for Domain > URL Redirects)
"""
import csv
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ghl-export" / "out"
DOMAIN = "https://heroeshomenetwork.com"

# --- Fill these in after uploading the images to HighLevel Media, then re-run.
# (Until then the pages point at the files on the current domain, which stop
# loading once the domain moves to HighLevel.)
ASSET_URLS = {
    "logo.png": DOMAIN + "/assets/logo.png",
    "favicon.png": DOMAIN + "/assets/favicon.png",
    "hero-family.jpg": DOMAIN + "/assets/hero-family.jpg",
    "social-share.png": DOMAIN + "/assets/social-share.png",
}


def new_path(old):
    """Map an old site URL path (e.g. /bases/fort-bragg.html) to a flat GHL path."""
    p = old.split("#")[0].split("?")[0]
    frag = old[len(p):]
    if p in ("/", "/index.html", ""):
        return "/" + frag
    p = re.sub(r"/index\.html$", "/", p)
    m = re.match(r"^/(bases|states)/([^/]+)\.html$", p)
    if m:
        return "/" + m.group(2) + frag
    if p in ("/bases/", "/bases"):
        return "/bases" + frag
    if p in ("/states/", "/states"):
        return "/states" + frag
    m = re.match(r"^/([^/]+)\.html$", p)
    if m:
        return "/" + m.group(1) + frag
    return old


def page_url(rel):
    return "/" if rel == "index.html" else "/" + rel


def rewrite_links(s):
    for name, url in ASSET_URLS.items():
        s = s.replace("/assets/" + name, url)
    # Mark state-guide card links so main.js can still find them after the
    # /states/x.html URLs are flattened.
    s = re.sub(r'(<a class="card-link")(\s+href="/states/[^"/]+\.html")',
               r'\1 data-state-link\2', s)
    s = re.sub(r'(href|action)="(/[^"]*)"',
               lambda m: f'{m.group(1)}="{new_path(m.group(2))}"', s)
    # absolute URLs inside JSON-LD
    s = re.sub(re.escape(DOMAIN) + r'(/[^"\s<]*)',
               lambda m: DOMAIN + new_path(m.group(1)), s)
    return s


def build_js():
    order = ["main.js", "join-network.js", "lead-capture.js"]
    guards = {
        "bah-calculator.js": "document.getElementById('station-input')",
        "class-signup.js": "document.getElementById('class-dates') || document.getElementById('next-class-date')",
        "compass-class-signup.js": "document.getElementById('f-office')",
    }
    parts = []
    for f in order + list(guards):
        js = (ROOT / "js" / f).read_text()
        js = js.replace("document.addEventListener('DOMContentLoaded', ", "hhnReady(")
        js = js.replace("fetch('/api/lead', {", "hhnSend('lead', {")
        js = js.replace("fetch('/api/class-signup', {", "hhnSend('class-signup', {")
        js = js.replace('[href^="/states/"][href$=".html"]', "[data-state-link]")
        if f in guards:
            js = f"if ({guards[f]}) {{\n{js}\n}}"
        parts.append(f"/* ---- {f} ---- */\n{js}")
    helpers = r"""
/* ==== HighLevel glue ==================================================== */
/* PASTE YOUR HIGHLEVEL INBOUND WEBHOOK URL HERE (Automation > Workflows >
   trigger "Inbound Webhook"). Every form on the site posts to it with a
   "source" field: pre-approval, bah-calculator, state-guide, pcs-checklist,
   agent-join, class-signup, compass-class. */
var HHN_WEBHOOK_URL = 'PASTE_HIGHLEVEL_WEBHOOK_URL_HERE';

function hhnReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

/* Drop-in replacement for the old fetch('/api/...') calls. Returns a
   Response-like object so the existing form code works unchanged. */
function hhnSend(kind, opts) {
  var data = {};
  try { data = JSON.parse(opts.body || '{}'); } catch (e) {}
  if (!data.source) data.source = kind;
  data.page = location.pathname;
  var ok = { ok: true, status: 200, json: function () { return Promise.resolve({}); } };
  if (!/^https?:/.test(HHN_WEBHOOK_URL)) {
    return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({}); } });
  }
  return fetch(HHN_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function () { return ok; }).catch(function () {
    // Browser blocked the JSON request (CORS) — resend as a simple form post.
    var form = new URLSearchParams();
    Object.keys(data).forEach(function (k) { form.append(k, data[k] == null ? '' : data[k]); });
    return fetch(HHN_WEBHOOK_URL, { method: 'POST', mode: 'no-cors', body: form }).then(function () { return ok; });
  });
}

/* Pages that used <body class="..."> carry a marker div instead. */
hhnReady(function () {
  document.querySelectorAll('[data-hhn-body-class]').forEach(function (el) {
    el.getAttribute('data-hhn-body-class').split(/\s+/).forEach(function (c) {
      if (c) document.body.classList.add(c);
    });
  });
});
"""
    return "<script>\n" + helpers + "\n" + "\n\n".join(parts) + "\n</script>\n"


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "pages").mkdir(parents=True)

    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
             '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;'
             '9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n')
    css = (ROOT / "css" / "style.css").read_text()
    css += """
/* ---- HighLevel overrides: let the pasted blocks run edge to edge ---- */
.c-custom-code, .c-custom-code > div, .hl_page-creator--row:has(.c-custom-code),
.hl_page-creator--column:has(.c-custom-code), .c-section:has(.c-custom-code),
.c-row:has(.c-custom-code), .c-column:has(.c-custom-code) {
  padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important;
}
"""
    (OUT / "00-SITE-HEAD.html").write_text(fonts + "<style>\n" + css + "\n</style>\n")
    (OUT / "01-SITE-FOOTER.html").write_text(build_js())

    files = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*.html")
                   if ".git" not in p.parts and "ghl-export" not in p.parts)
    rows, redirects = [], []
    for rel in files:
        src = (ROOT / rel).read_text()
        title = html.unescape(re.search(r"<title>(.*?)</title>", src, re.S).group(1).strip())
        dm = re.search(r'<meta name="description" content="([^"]*)"', src)
        desc = html.unescape(dm.group(1)) if dm else ""
        ld = "\n".join(re.findall(r'<script type="application/ld\+json">.*?</script>', src, re.S))
        body_tag = re.search(r"<body([^>]*)>", src)
        body = src[body_tag.end():src.rindex("</body>")]
        body = re.sub(r'<script src="[^"]*"></script>\s*', "", body).strip()
        bc = re.search(r'class="([^"]*)"', body_tag.group(1))
        if bc:
            body = f'<div data-hhn-body-class="{bc.group(1)}" hidden></div>\n' + body
        body = rewrite_links(body)
        ld = rewrite_links(ld)

        old = page_url(rel)
        path = "/404" if rel == "404.html" else new_path(old)
        slug = "home" if path == "/" else path.strip("/")
        (OUT / "pages" / f"{slug}.html").write_text(body + "\n")
        seo = [
            f"PAGE PATH:   {path}",
            f"OLD URL:     {DOMAIN}{old}",
            f"PAGE TITLE:  {title}",
            f"DESCRIPTION: {desc}",
            f"SOCIAL IMAGE: {ASSET_URLS['social-share.png']}",
            "",
            "HEAD TRACKING CODE (page settings > Tracking Code > Head):",
            ld or "(none)",
        ]
        (OUT / "pages" / f"{slug}.seo.txt").write_text("\n".join(seo) + "\n")
        rows.append([slug, path, old, title, len(body)])
        if old != path and rel != "404.html":
            redirects.append([old, path])
            if old.endswith("/index.html"):
                redirects.append([old[:-len("index.html")], path])

    with open(OUT / "PAGE-LIST.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["file", "new_path", "old_url", "title", "body_chars"])
        w.writerows(rows)
    with open(OUT / "REDIRECTS.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["from", "to"])
        w.writerows(redirects)
    print(f"{len(rows)} pages, {len(redirects)} redirects -> {OUT}")


if __name__ == "__main__":
    main()
