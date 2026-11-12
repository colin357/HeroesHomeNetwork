# Moving Heroes Home Network into HighLevel Sites

Everything to paste is in `out/`. Regenerate it any time with `python3 ghl-export/build.py`.

## 1. One-time site setup
1. **Upload images** to HighLevel Media: `assets/logo.png`, `favicon.png`, `hero-family.jpg`, `social-share.png`.
   Copy their URLs into `ASSET_URLS` at the top of `build.py` and re-run it. Until you do, images load from the
   current domain, and they break once DNS moves.
2. Create a **Website** (Sites → Websites). In **Settings → Head tracking code**, paste `out/00-SITE-HEAD.html`
   (fonts plus all the CSS). In **Footer tracking code**, paste `out/01-SITE-FOOTER.html` (all the JavaScript).
3. Create a **workflow** with the **Inbound Webhook** trigger. Copy its URL into `HHN_WEBHOOK_URL` near the top
   of the footer code. Submit one test form so HighLevel can map the fields:
   `name, email, phone, location, source, offer, context, classDate, office, page`.
   Then add actions: Create/Update Contact, add a tag from `source`, send an SMS/email notification to the team.
   This replaces the Twilio text from `api/lead.js`.
4. Set **Favicon** in the website settings.

## 2. For every page (191 of them, listed in `out/PAGE-LIST.csv`)
1. Add a page and set its **path** to the `PAGE PATH` line in `pages/<name>.seo.txt`.
2. Add one full-width section with one **Custom Code** element, and paste `pages/<name>.html` into it.
3. In page **SEO settings**, enter the title, description and social image from the `.seo.txt` file.
4. Paste the `HEAD TRACKING CODE` block from the `.seo.txt` file into the page's head tracking code (structured data for Google).

`home.html` is the home page (path `/`), and `404.html` goes on the site's 404 page.

## 3. Go live
1. Add every row of `out/REDIRECTS.csv` under Settings → Domains → URL Redirects (301). This keeps Google
   rankings and old links working.
2. Connect the domain to the website, then submit the new sitemap in Google Search Console.

## URL changes
Pages are flattened with `.html` dropped, for example `/bases/fort-bragg.html` → `/fort-bragg`,
`/states/texas.html` → `/texas`, `/va-loan-guide.html` → `/va-loan-guide`, `/bases/` → `/bases`.
All links inside the pages already use the new paths.
