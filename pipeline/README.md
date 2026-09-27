# Results pipeline

Turns Bangladesh Bank's prize-bond PDFs into `site/public/data/results.json` (read by the app) and the static results website.

- `npm run publish-draw` — fetch the newest 8 draw PDFs through headless Chrome (bb.org.bd blocks plain HTTP clients), parse, build the site.
- `npm run publish-draw -- --local` — manual fallback: download the PDF in a browser, save it as `pdfs/<draw>.pdf`, then run this.
- Deploy: `cd ../site && railway up --detach --service bondcheck-site`.
- Automated: `.github/workflows/publish-results.yml` (needs the `RAILWAY_TOKEN` repository secret).

Parser notes: the PDFs are Bijoy-encoded. Prize labels look like `1g cyi` (১ম পুরস্কার); the draw date follows `e½vã/` (বঙ্গাব্দ/) as `DD <month> , YYYY`. Every draw must yield exactly 1/1/2/2/40 numbers or the build fails loudly.
