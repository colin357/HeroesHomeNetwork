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
    "logo.png": "https://files.leadconnectorhq.com/file/6af677114a2360a4d7cab790/logo.png",
    "favicon.png": "https://files.leadconnectorhq.com/file/6af677114a2360a4d7cab790/logo.png",
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


def scope_selector(sel):
    sel = sel.strip()
    if sel == ":root" or sel == "body":
        return ".hhn-page"
    if sel.startswith("body.join-open") or sel == "html":
        return sel
    if sel.startswith("body."):
        return ".hhn-page." + sel[5:]
    if sel.startswith("*"):
        return ".hhn-page" + sel[1:] + ", .hhn-page " + sel
    return ".hhn-page " + sel


def scope_css(css):
    """Prefix every rule with .hhn-page so HighLevel's styles can't override
    ours (and ours can't leak into HighLevel's), and convert rem to px so
    HighLevel's root font size doesn't rescale the site."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"(?<![\w.-])(\d*\.?\d+)rem\b",
                 lambda m: f"{float(m.group(1)) * 16:g}px", css)
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j == -1:
            out.append(css[i:]); break
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while depth:
            if css[k] == "{": depth += 1
            elif css[k] == "}": depth -= 1
            k += 1
        inner = css[j + 1:k - 1]
        if head.startswith("@media") or head.startswith("@supports"):
            out.append(f"{head} {{\n{scope_css(inner)}\n}}\n")
        elif head.startswith("@"):
            out.append(f"{head} {{{inner}}}\n")
        else:
            sels = ", ".join(scope_selector(x) for x in head.split(","))
            out.append(f"{sels} {{{inner}}}\n")
        i = k
    return "".join(out)


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
        js = js.replace("document.body.appendChild(", "hhnRoot().appendChild(")
        js = js.replace("document.body.insertAdjacentHTML(", "hhnRoot().insertAdjacentHTML(")
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

function hhnRoot() { return document.querySelector('.hhn-page') || document.body; }

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
    css = scope_css((ROOT / "css" / "style.css").read_text())
    css += """
/* ---- HighLevel layout fixes ---------------------------------------------
   Break the page out of HighLevel's section/row width cap so it spans the
   full window, whatever the section's width setting. */
html, body { overflow-x: clip; }
.hhn-page {
  position: relative; left: 50%;
  width: 100vw !important; max-width: 100vw !important;
  margin-left: -50vw !important; margin-right: 0 !important;
  text-align: left;
}
.c-custom-code, .c-custom-code > div, .c-section:has(.hhn-page), .c-row:has(.hhn-page),
.c-column:has(.hhn-page), .c-section:has(.hhn-page) .inner, .c-row:has(.hhn-page) .inner,
.c-column:has(.hhn-page) .inner {
  padding: 0 !important; margin-top: 0 !important; margin-bottom: 0 !important;
  max-width: none !important; overflow: visible !important;
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
        body = f'<div class="hhn-page{" " + bc.group(1) if bc else ""}">\n{body}\n</div>'
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
