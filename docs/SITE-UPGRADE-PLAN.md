# AgentKip Site Upgrade Proposal

## Goal

Turn AgentKip from a restrained, card-heavy product catalog into a vivid,
high-trust product front door: warm charcoal and cream, flat vintage pastels,
real app proof, and a clear private-beta path. The design is early-80s
consumer-tech editorial—not arcade, neon, or synthwave.

## Design system

- Keep charcoal `#262624` as the canonical ground and cream `#F0EEE6` as the
  alternate mode.
- Use seafoam, sky, dusty rose, lilac, coral, terracotta `#D9785F`, and cocoa
  `#6B4B3E` in large, flat fields. Do not use yellow as a page-scale accent.
- Use oversized typography, cropped circles, orbit lines, offset blocks,
  stripes, ruled diagrams, flat print patterns, and occasional hard-edged
  shadows. Do not use gradients, glass effects, neon, or repeated bento grids.
- Repair cream-mode contrast: charcoal/cocoa ink, darker functional links,
  dark text on pastel buttons, and theme-aware mark strokes.
- Remove the unused display font; retain the SF-style system stack.
- Replace the current gradient focus treatment with a solid 2px focus ring.
- Add `PageHeader` for the single route-level `h1`; keep `SectionHeader` for
  internal `h2` sections.
- Make `KipButton` a true link-or-button primitive so disabled actions have no
  destination. Add a release-aware CTA component for external beta access.

## Real app walkthrough

Replace the CSS-drawn handset with an `InteractiveProductWalkthrough` using
sanitized real AgentKip captures:

1. Capture home, compose, running response, Live Activity, and completed
   result states.
2. Save optimized WebP assets under `public/product/walkthrough/`.
3. Present only the 9:19.5 app screen, including native status treatment from
   the capture. Do not draw hardware, camera cutouts, buttons, or fake UI.
4. On desktop, pair the screen with colorful step controls and annotations; on
   mobile, show the screen nearly full width with controls below it.
5. Make both named step buttons and real screen hotspots advance the local
   walkthrough state. Include keyboard support, visible focus, a polite status
   announcement, reduced-motion behavior, and a static first-screen fallback.
6. Preload the first image and lazy-load later states. Captures must contain no
   personal information, secrets, or provider credentials.

Generated art may frame the walkthrough, but generated or redrawn product UI
never ships.

## Page work

| Route | Change | Why |
| --- | --- | --- |
| `/` | Colorful layered hero and real-app walkthrough; condense to outcome, proof, ownership, trust, and beta access. | Make the first visit feel specific and memorable. |
| `/get` | Status-first beta access, disabled external download until a valid approved destination exists, no generic store link, separated advanced server setup. | Keep release claims honest. |
| `/ios` | Three visual chapters: glanceable state, native actions, and private on-device work. | Replace the dense feature inventory with product evidence. |
| `/compare` | Keep the sourced desktop table; add a mobile ledger, last-reviewed signal, and next action. | Preserve trust without forcing horizontal scroll. |
| `/use-cases` | Editorial story strips grouped by everyday, work, and phone-native jobs; remove empty proof placeholders. | Do not imply proof that is not present. |
| `/security` | Flat trust-boundary schematic separating phone, encrypted transport, Noggin, and providers. | Make the security model understandable and precise. |
| `/docs/deploy` | Vintage technical-manual treatment with contents rail, phases, warnings, verified commands, and health-check next step. | Improve scanability without changing the deployment contract. |
| `/faq` | Group questions, add deep links and route links, and emit FAQ structured data. | Make answers easier to find and index. |
| `/gallery` | Preserve the URL but remove it from primary discovery and the sitemap while it lacks real media; show one honest empty state. | Avoid placeholder proof. |
| `/roadmap`, `/changelog` | Ruled status lanes, factual update labels, and cross-links under Updates. | Communicate progress without promises. |
| `/kip` | Brand-system specimen with palette, orbit states, typography, patterns, and a real `h1`. | Turn the brand page into a visual regression fixture. |
| `/contact`, `/privacy`, `/terms` | Improve hierarchy, reading measure, focus, anchors, and subtle flat-color accents; preserve current contracts and require factual review for legal copy. | Keep support and legal pages polished without widening scope. |

The account, authentication, admin, billing, API, database, and provider-backed
surfaces are regression-only and out of scope.

## Shell, metadata, and accessibility

- Use Product, How it works, Security, and Updates as primary navigation;
  group secondary links in an accessible Explore disclosure and use “Join
  private beta” for the internal `/get` CTA.
- Add skip navigation, active-link semantics, disclosure state and Escape
  handling, mobile focus management, accessible tabs, copy-status
  announcements, and form error associations.
- Add canonical metadata, a flat Open Graph image, preview-only `noindex`,
  WebSite and FAQ structured data, and truthful sitemap dates.
- Do not add dependencies, change package files, mutate stored admin content,
  or change provider configuration.

## Execution order

1. Establish the approved visual references for charcoal, cream, the home
   composition, product storytelling, and trust/docs pages.
2. Build tokens, themes, shared primitives, navigation, metadata, and patterns.
3. Build the homepage and real-screen walkthrough.
4. Build conversion and trust pages: `/get`, `/ios`, comparison, use cases,
   and security.
5. Build documentation, updates, brand, support, legal, and Gallery state.
6. Open one permanent draft PR after the first validated implementation push;
   add the Vercel Preview URL to its description and report it after each
   implementation round.

## Acceptance gates

- Before every push: `npm run lint`, `npm run typecheck`, and `npm run build`.
- Verify all public routes at 390px and 1440px; verify key product pages at
  320px, 768px, and 1024px.
- Check charcoal and cream modes, keyboard-only interaction, reduced motion,
  200% zoom, heading order, focus return, walkthrough hotspots, and mobile
  comparison behavior.
- Test invite, incomplete-beta, approved-beta, and store release states; no
  external download link is enabled before its release contract is met.
- Confirm no gradient functions, secrets, legacy-name denylist matches,
  placeholder product UI, or protected-path changes appear in the diff.
- Target preview Lighthouse scores of LCP below 2.5 seconds, INP below 200 ms,
  and CLS below 0.1.

## Collaboration rules

- Work only on `codex/site-upgrade`.
- Fetch and rebase onto current `origin/main` before continuing when upstream
  changes land.
- Keep the PR draft permanently. Never merge, mark ready, enable auto-merge,
  push to `main`, force-push, hard-reset, or alter live provider settings.
