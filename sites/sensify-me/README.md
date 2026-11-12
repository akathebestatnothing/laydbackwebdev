# Sensify Me — local preview

Bespoke, dependency-free HTML/CSS/JavaScript for the Sensify Me service + enquiry storefront. No external deployment is included. No runtime frameworks, analytics, social widgets, trackers, media autoplay or generated business content.

## Run local QA

```bash
node tests/server.cjs
# separate terminal — defaults to http://127.0.0.1:4174
node tests/qa.cjs
```

`tests/server.cjs` strictly supports GET/HEAD for this project's files under a `/sites/sensify-me/` mount. It also includes deliberately local-only QA stubs under `/qa-config` and `/websites/sensify-me/enquiries`; these do not contact Meta or an actual production backend. The endpoint `POST /websites/sensify-me/enquiries` is not implemented by this static site, by design: deployment must connect the real Lay'd Back endpoint before production.

`node tests/qa.cjs` uses Google Chrome via Playwright in `/tmp/sensify-qa/node_modules` created during this task (not shipped). It intercepts the Gist pointer/POS T, blocks Facebook navigations, saves mock API evidence and checks desktop/mobile, reduced motion, filter/reset, keyboard tabs, validation and error recovery.

## Launch configuration

- Mount at `/sites/sensify-me/` — all website asset references are relative below this path.
- API config follows `/home/oem/newy-crete/app.js` conventions: Gist pointer plus Tailscale fallback; broken local fallback is corrected to `window.location.origin`.
- `POST /websites/sensify-me/enquiries` expects `{data:{service_name,client_name,email,phone,preferred_timing,notes,request_id,consent:true}}`. Other optional fields may be empty strings. request_id uses a fresh UUID.
- Browser failure exposes canonical Facebook instead of claiming success. Form data isn't persisted locally.
- Local hostname QA deliberately selects the same-origin local mock; to QA production resolution use an overridden non-local host or a production-like staging URL with proper CORS and test/no-op backend.

## Content and licensing

See `docs/PROVENANCE.md`, `research/facebook-evidence.txt`, `research/final-assets.json` and font licence files in `assets/fonts/`. Logo and Facebook media are user/business-supplied/public-page assets, not third-party stock. The actual public evidence contains no complete pack ingredients, prices, verified contact email/phone, service area, age guidance, stock or availability. Do not add those without an owner-approved source.

## Assets

Real 1536×2048 activity images: `facebook-12.webp` … `facebook-16.webp`.
Reel covers: `facebook-17.webp` birthday/racing, `18.webp` racing teaser, `19.webp` Spidey packs, `20.webp` Christmas, `21.webp` event/hall. Public direct source IDs/URLs in `research/`.
Logo: `assets/images/sensify-me-logo.webp`.

Remaining launch requirements and genuine verification boundaries: `docs/RELEASE.md` and `docs/QA.md`.
