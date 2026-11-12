# Website

## Sitemap
Single-page marketing/service storefront at `/sites/sensify-me/` with anchored Home, Parties, Packs, Gallery, FAQs and Enquiry. Source notes are delivered separately and are not linked into public navigation to avoid exposing raw social CDN tokens.

## Page Briefs
### / (home)
- **Purpose & primary action:** understand the real party/pack offer, then make an enquiry.
- **Message:** little hands, big discoveries; play/learn/explore from the brand’s public wording.
- **CTA:** direct “Plan their next adventure”; transitional “Explore the play table”.
- **Copy blocks:** hero discovery scene; service tabs; evidence explorer; real Spidey-pack card; enquiry steps; reel gallery; FAQs; enquiry form and Facebook route.
- **Imagery:** supplied logo, full-resolution 1536×2048 photos 12–16 and local public reel covers 17–21. No generated fake activity photos.

## Conversion Elements
| Objection (Big 5) | Counter | Placement | Status |
|---|---|---|---|
| Trust: is this the actual business? | Canonical Facebook ID, supplied logo, original source-linked reels. | Gallery/footer | shipped |
| Price: why isn’t there one? | No public evidence of price; request a tailored quote. | Each service/pack + FAQ | shipped |
| Fit: ages, venue, needs? | Directly ask business; notes prompt without making suitability claims. | FAQs/form | shipped |
| Timing: is my date available? | Preferred timing is a request, not confirmation. | Form | shipped |
| Effort: what do I need to say? | Four contact fields plus timing and notes; exact enquiry handoff. | Steps/form | shipped |
| Allergies/sensitivities: can I assume safe? | Never inferred. Ask about ingredients/materials with the business. | Packs/FAQs/form prompt | shipped |
| Contact: can I use another channel? | Canonical Facebook link; no guessed email or phone. | Footer/failure state | shipped |

## Audit Findings
| Issue | Severity (0-4) | Fix | Status |
|---|---|---|---|
| Social CDN URLs expire | 3 | Local assets saved; proven original URLs kept only in research manifest. | shipped |
| Full-size asset resolver initially reused the first album image | 4 | Token-matched full-resolution `viewer_image` extraction; actual dimensions and unique hashes verified for 12–16. | fixed |
| Only covers, not videos | 2 | Label “watch on Facebook”, never fabricate an embedded player. | shipped |
| Child appears in a public reel cover | 3 | Minimal product use; original linked public content; owner permission verification before launch required. | pending owner |
| Missing business facts | 4 | Do not infer contact, price, ages, allergy policy, location or stock. | shipped |
| External form not verified | 4 | Never send during tests; mock CORS/Gist/POST; real launch integration pending. | pending production QA |
| Expanded interaction correctness | 3 | Tests cover desktop/mobile, keyboard navigation, search/filter, empty state, motion toggle, API failure and success. | see evidence results |

## Lead Capture
Skipped a quiz: evidence supports only one useful conversion. Enquiry uses the agreed POST `/websites/sensify-me/enquiries` payload with `{data:{service_name,client_name,email,phone,preferred_timing,notes,request_id,consent:true}}`. No persistent form data, card/payment, automatic booking or fabricated confirmation text.
