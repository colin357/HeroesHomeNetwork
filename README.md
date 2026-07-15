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
| `bah-calculator.html` | Interactive BAH estimator by duty station / pay grade / dependents |
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

The BAH calculator (`js/bah-calculator.js`) uses representative rates for
planning estimates only; update the anchor table annually when DoD publishes
new rates.
