# Design System

## Design Direction
**Signature moment:** an asymmetric paper-and-play “discovery table”. A large Fraunces headline sits beside a tactile fan of real photos inside a softly extruded cabinet. A CSS 3D rainbow curls above the table, not a stock purple/blue mesh gradient. Scroll gently separates layers, raises the cabinet and rotates its viewing plane; all transforms respect reduced motion and never obscure content.

**Personality:** art-room editorial, warm natural materials, optimistic and precise. No glassmorphism dashboard, generic SaaS cards, invented mascot, licensed cartoon illustration, confetti cannon, unbounded motion or autoplay.

**References:** supplied Sensify Me rainbow/handprint logo, actual Sensify Me activity setups and children’s picture-book editorial rhythm. Flat paper, ink, sunlight and small physical depths differentiate it from unrelated brands.

## Typography
- Fraunces 600 (headlines) and Fraunces italic 600 (accent words), local files and SIL OFL text.
- DM Sans 400/700 (interface/body), local files and SIL OFL text.
- Display: `clamp(3.2rem,7.7vw,7rem)`, 0.96 line-height; section titles `clamp(2.25rem,4.5vw,4.5rem)`.
- Body 16–18px, 1.65 line-height; prose max 64ch; labels 12–14px.
- `font-display: swap`; local assets prevent third-party font requests. Total font payload ~253KB across all four files; only regular body and display roman are render-critical.

## Tokens
- Canvas `#fffaf3`, paper `#ffffff`, ink `#163c37`, muted `#536761`.
- Coral `#e86558`, aqua `#81cdc5`, butter `#f2ca68`, lilac `#cbc0ea`, leaf `#37785d`.
- No gradient backgrounds; flat pastel blocks are allowed.
- Spacing 4/8/12/16/24/32/48/64/96/128px.
- Borders: 1px solid ink at 18%; radius 18/28px; hard offset shadows 7px 7px 0 ink.
- Container: min(1240px, calc(100% - 48px)); mobile gutter 20px.
- One strong ink/coral action per visual section; secondary actions use outline/text.

## Components
| Component | Decision | Status |
|---|---|---|
| Header | Semantic logo link, clear nav, enquiry CTA, 44px menu target, Escape/outside close. | implemented |
| Discovery scene | CSS-perspective paper cabinet with genuine local photography, CSS rainbow, scroll rAF and transform-only motion. | implemented |
| Service tabs | Actual `tablist` / arrow-key operation, labelled panels, evidence-driven copy. | implemented |
| Explorer | Search and category filter; accessible labelled controls; visible count; useful empty/reset state. | implemented |
| Pack card | Uses real Spidey reel cover, no pack ingredients, stock or price. All actions ask for a quote. | implemented |
| Reel gallery | Public Facebook links, original captions, not copied videos/music, no engagement counts. | implemented |
| FAQ | Native `details` elements exposing known answers and missing details. | implemented |
| Enquiry | Explicit consent and validation; exact JSON schema; UUID; busy/success/error states; Facebook recovery link. | implemented |
| Motion | Tasteful transform/opacity reveals and 3D scene only; no pointer follower, scroll hijack or text scramble. | implemented |

## UX Audit Findings
| Issue | Heuristic | Severity (0-4) | Fix | Status |
|---|---|---|---|---|
| Unknown prices tempt guesswork | Error prevention | 4 | “Price on enquiry” everywhere; no purchase button. | shipped |
| Third-party theme names could imply affiliation | Match real world | 3 | Explicit unofficial-name/IP note near Spidey content. | shipped |
| Motion may overwhelm children/adults | User control | 3 | Reduced-motion media query and user disable-motion toggle. | shipped |
| Missing child-specific fit details | Recognition rather than recall | 3 | Invite ages, sensitivities/allergies and venue in notes; never claim allergy-safe. | shipped |
| Form endpoint not tested live | Honest feedback | 4 | Blocked external submit in local QA; test exact request and recovery only. Launch needs production verification. | remaining launch check |
| Unsupported device JS | Flexibility | 1 | HTML content is actually present, tabs initial open, CSS progressive enhancement. | shipped |

## Microinteraction Inventory
| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
| 3D scroll | Desktop + motion allowed only; bounded transforms in rAF. | Disabled under reduced motion/toggle/mobile. | implemented |
| Filter | Input updates count and hides nonmatching cards. | Empty-state reset. | implemented |
| Pack enquiry | Carries requested pack/service to select and focuses next missing field. | No transaction or cart. | implemented |
| Form | Persist non-sensitive choices only; request ID freshly generated each submission. | No localStorage of child information, email or phone. | implemented |
| Image accents | Mild transform on hover/focus only. | Never required to access content. | implemented |
