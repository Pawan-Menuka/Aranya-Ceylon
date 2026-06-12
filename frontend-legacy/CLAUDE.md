# Aranya Ceylon — Project Decisions (source of truth)

Premium Ceylon spice e-commerce. Brand: forest green #0F6E56, secondary #1D9E75,
amber CTA #BA7517, cream bg #FDFAF5, surface #F4F0E8, ink #1A1A1A, muted #5C5248.
Display: Cormorant Garamond. UI/body: Plus Jakarta Sans. Tokens live in `aranya.css`.

Market rule: International = USD, amber CTA. Local (Sri Lanka) = LKR, green CTA.

## Typography — three roles (LOCKED)
- Display/headings = Cormorant Garamond (`--font-display`). Never for UI or <15px.
- UI/functional = Plus Jakarta Sans (`--font-ui`): nav, buttons, prices, badges, labels, captions, eyebrows, microcopy.
- Long-form reading = **Spectral** (`--font-read`, `.prose`): product descriptions, blog posts, about/story narrative ONLY. Warm editorial serif, comfortable at 16–18px. See `Font Study.html`.
- Applied so far: homepage StoryBand narrative + Heritage etymology. Apply `--font-read`/`.prose` to all future long-form prose (Product Detail description, Blog body, About).

## Shared code (reuse on every page)
- `aranya.css` — tokens + primitives (buttons, seg control, grain)
- `spice-data.js` — sample spice data + per-spice colour map (window.SPICES)
- `shared.jsx` — Seal (logo), Stars, Badge, SpicePhoto (photo placeholder), Icon
- `navbar.jsx` — AranyaNavbar (canonical)
- `cards.jsx` — CardB (featured), CardCFinal (default), plus CardA/CardC (archived options)
- `mobile.jsx` — MobileNav (top bar), MobileDrawer (slide-in), CardCMobile (2-up compact)
- `ios-frame.jsx` — device frame for presenting mobile screens

## LOCKED decisions
### Navbar — `AranyaNavbar` (navbar.jsx)
Option B styling (glassy forest overlay) + auto-hide behaviour.
- heroMode={true}: glass overlay over the dark hero; auto-hides while scrolling
  down through the pinned animation, returns SOLID forest on scroll-up / past hero.
- heroMode={false}: solid forest bar on cream pages; hide-on-scroll-down / show-on-up.
- Always light text; market prop drives currency + ship-to.

### Product cards
- **Default catalog card = CardCFinal** (Products, Search, Categories, related).
  Type-led, #F4F0E8 surface, 5px per-spice top stripe, ghost CTA. Brand-compliant.
- **Featured card = CardB** (homepage Featured Harvest, curated collections, blog spotlights).
  Photo-forward, name overlaid on image, slide-up actions. Use selectively, never for whole grids.

### Hero (homepage)
Scroll-driven pinned frame-sequence (192 frames), dark #1A1A1A canvas,
ARANYA/CEYLON brand overlay + scroll indicator. Navbar uses heroMode. See `Hero Scroll Prototype.html`.
(Frames are user-supplied; prototype simulates them with one frame + scroll transforms.)

**Render motion (canonical):** scroll only sets a *target* frame; a continuous rAF loop **lerps** the
rendered frame toward it (`renderedFrame += (target − rendered) × SMOOTHING`), decoupling render cadence
from scroll-event firing for a smooth, premium glide. Tunables: `SCROLL_MULTIPLIER` (scroll room / pace)
and `SMOOTHING` (lower = floatier).

**Two implementations — both on the lerp loop (in sync):**
- `aranyaHero/AranyaHero.jsx` — Next-ready standalone component (`"use client"`, `/hero/desktop|mobile`
  paths). 5× scroll, lerp SMOOTHING 0.08.
- `home-hero.jsx` → `HomeHero` — the component the current CDN prototype homepage renders
  (`aranyaHero/hero_wm/...` paths). Now 5× + eased lerp loop too; its loop also drives the `p` progress
  state (overlay/vignette/scroll-indicator fades) and self-halts when settled to avoid 60fps re-renders.
  In the Next port, prefer consolidating onto a single `AranyaHero`.

## Key reference files
- `Navbar.html` — canonical navbar on cream, both markets
- `Hero Scroll Prototype.html` — hero + auto-hide nav
- `Products in Context.html` — CardB featured row + CardCFinal grid
- `Mobile.html` — mobile nav + drawer, featured carousel, 2-up catalog (in iOS frame)

### Mobile (LOCKED)
- Top bar: hamburger (left) · logo+wordmark (centre) · search + cart (right). Glass over hero, solid forest on scroll/cream.
- Drawer: slides from left, forest green, search + Cormorant nav links + sign-in + market switcher.
- Featured = horizontal snap carousel of CardB. Catalog = 2-up grid of CardCMobile.

### Homepage (`Home.html`) — BUILT
Order: Hero (heroMode nav + one-time MarketStrip) → From the Forest (CardB row) → Browse by
Category (full-bleed editorial tiles, image-slots) → Story band (forest green, sourcing/freshness)
→ What People Love (CardCFinal grid) → Heritage (near-black + Liyawel motif, etymology) →
Newsletter (surface, no popup) → Footer (forest mega).
- Background rhythm: cream home base, forest-green story + footer, near-black heritage, amber spark only.
- `home-common.jsx`: Reveal (scroll-reveal, reduced-motion + in-view + 2.5s failsafe), Liyawel motif, Eyebrow.
- `home-hero.jsx`: HomeHero (pinned frame-sequence; set USE_REAL_FRAMES + FRAME_SRC for real frames), MarketStrip. Now on the canonical 5× eased lerp loop (see Hero section above).
- `home-sections.jsx`: CategoryTiles, StoryBand, Bestsellers. `home-footer.jsx`: Heritage, Newsletter, Footer.
- Real photos drop into <image-slot> (image-slot.js): cat-cinnamon/whole/ground/cardamom/gift, story-sourcing.
- KNOWN: glass nav + reveal sections render fine in real browsers; in-iframe pixel-capture drops
  backdrop-filter child content and resets scroll — verify in real browser / user view, not screenshots.

## Conventions
- React + Babel via pinned CDN script tags. Each component file exports to window via Object.assign.
- Never name a styles object `styles` — prefix per component or use inline styles.
- Photography is styled placeholders (SpicePhoto) until real photos are supplied.
