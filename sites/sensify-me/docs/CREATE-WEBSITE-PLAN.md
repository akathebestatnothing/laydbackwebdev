# Create Website Plan

## Context
Built 2026-11-11 independently from public Sensify Me Facebook evidence and the customer-supplied logo. Target `/home/oem/sensify-me`, eventual mount `/sites/sensify-me/` on laydbackapps.com. No deployment, real enquiry submission or live data mutation. User requested a bespoke 3D motion site with real content, SEO/AEO and tested controls. The interactive staged sign-offs in the create-website skill are superseded by the delegated instruction to work independently; remaining business decisions are recorded here.

## Phase Status
| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | one-page-marketing | done | MARKETING.md | 2026-11-11 |
| 2 | storybrand-messaging | done | POSITIONING.md, WEBSITE.md | 2026-11-11 |
| 3 | made-to-stick | done | POSITIONING.md, WEBSITE.md | 2026-11-11 |
| 4 | top-design | done (skill fallback, design-led) | DESIGN.md | 2026-11-11 |
| 5 | web-typography | done (brief fallback) | DESIGN.md | 2026-11-11 |
| 6 | refactoring-ui | done (brief fallback) | DESIGN.md | 2026-11-11 |
| 7 | ux-heuristics | done (brief fallback + real QA) | DESIGN.md | 2026-11-11 |
| 8 | cro-methodology | done (brief fallback) | WEBSITE.md | 2026-11-11 |
| 9 | scorecard-marketing | skipped: unnecessary second funnel and unsupported scoring | — | 2026-11-11 |
| 10 | steve-jobs-design-review | awaiting-evidence: user/business sign-off and production endpoint verification | WEBSITE.md | 2026-11-11 |

Statuses: pending · in-progress · awaiting-evidence · done · deferred: reason · skipped: reason.

## Key Decisions
| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-11-11 | 1 | One conversion: enquiry, not checkout. | Prices, stock and availability not evidenced. |
| 2026-11-11 | 2 | Service = sensory party catering incl. science; product = Spidey packs. Other public themes are inspiration only. | Preserve precise evidence boundaries. |
| 2026-11-11 | 3 | No fake review, rating, medical benefit, price or response time. | User factual-evidence requirement. |
| 2026-11-11 | 4 | Editorial discovery-table / paper 3D scene. | Distinct identity; accessible transform-only motion. |
| 2026-11-11 | 5 | Fraunces + DM Sans, locally hosted with OFL. | Friendly editorial feel; no third-party font traffic. |
| 2026-11-11 | 6 | Warm paper, forest ink, pastel accents, honest form states. | Brand-adjacent but not generic rainbow gradient. |
| 2026-11-11 | 7 | Child data stays out of persistent storage. | Reduce collection; form transmits only on intentional submit. |
| 2026-11-11 | 8 | Form is a request for conversation, not confirmed booking. | Fulfilment and response process unverified. |
| 2026-11-11 | 9 | Skip quiz. | One clear direct CTA; no unsupported “personalised recommendations”. |
| 2026-11-11 | 10 | No declaration of production readiness. | Backend is tested by interception only; real production needs owner verification. |

## Next Actions
- [ ] Owner verifies service area, quote/inventory/content and Superhero/IP wording (Sensify Me, before launch).
- [ ] Owner supplies contact policy including enquiry retention and consent/recipient language (Sensify Me + backend operator, before launch).
- [ ] Validate full-resolution image and child-image permission (Sensify Me, before launch).
- [ ] Convert local fonts to WOFF2/subsets if tooling permits, while preserving licences (developer, optimisation).
- [ ] Deploy `/sites/sensify-me/`, confirm correct asset URLs/canonical/sitemap and test real POST handler plus CORS (deployment owner, not this task).
- [ ] Confirm Facebook fallback and email routing with the owner; ideally publish a monitored contact email (Sensify Me).
- [ ] Run real-browser cross-engine device tests, owner content sign-off and privacy/accessibility review (owner/QA).
