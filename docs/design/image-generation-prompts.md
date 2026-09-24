# Aranya Ceylon — Website Image Generation Prompts

This document covers the current dummy photography, `ImageSlot` placements, synthetic `SpicePhoto` product art, synthetic `GiftBox` art, and placeholder Cloudinary seed images found in the project. Each `Path:` is the recommended final asset path in `aranya-next/public`; it is deliberately outside the prompt so the prompt can be pasted directly into ChatGPT image generation.

## Shared art direction

Aranya Ceylon is a premium, contemporary Sri Lankan spice house: editorial rather than rustic-cliché, tactile and human, grounded in the Central Highlands. Across the set, favour honest natural texture, warm cream, sunlit amber, cinnamon, turmeric gold, muted coral, tea green, mist blue and charcoal alongside the existing forest green. Use restrained contrast, subtle film grain and believable imperfections. People should look Sri Lankan and be shown with dignity in natural working moments. Avoid tropical-tourism clichés, excessive green grading, generic stock-photo smiles, colonial imagery, clutter, visible third-party brands, watermarks and generated text.

Generate photographic assets at high resolution. Preserve generous crop safety because the same image may be reframed responsively. Unless a prompt explicitly requests otherwise, render no typography, logos, labels, borders or watermarks inside the image; the website supplies its own overlays.

## 1. Homepage

### #1 -> 1.1 From forest to kitchen — sourcing portrait

**Path:** `aranya-next/public/images/home/story-sourcing.webp`
**Slot ID:** `story-sourcing`
**Placement:** Homepage, “From Forest to Kitchen” story band; portrait 4:5.

```text
Use case: photorealistic-natural
Asset type: premium spice-store homepage editorial photograph
Primary request: a candid Sri Lankan cinnamon grower gathering freshly peeled Ceylon cinnamon quills on a small hillside estate above Matale
Scene/backdrop: layered spice garden at about 1,200 metres, damp earth, cinnamon trees and soft highland mist; authentic working farm rather than a manicured plantation
Subject: one adult Sri Lankan grower in practical, modest work clothes, hands naturally arranging pale delicate quills in a shallow woven basket
Style/medium: high-end documentary food and travel photography, realistic skin and fabric texture, subtle fine film grain
Composition/framing: vertical 4:5, three-quarter portrait, subject slightly off-centre, hands and cinnamon clearly visible, quiet background depth, crop-safe edges
Lighting/mood: diffused early-morning light after rain; intimate, fresh and quietly proud
Color palette: warm cinnamon tan, muted indigo fabric, wet umber soil, mist blue and restrained leaf green
Constraints: culturally and botanically plausible Sri Lanka; natural unposed expression; no text, logo or watermark
Avoid: staged stock-photo smile, tourist costume, tea-picking basket, jungle fantasy, heavy green tint, oversaturation
```

## 2. Category and collection photography

### #2 -> 2.1 Cinnamon & Bark

**Path:** `aranya-next/public/images/categories/cat-cinnamon.webp`
**Slot ID:** `cat-cinnamon`
**Placement:** Homepage category accordion; responsive tall/wide crop.

```text
Use case: photorealistic-natural
Asset type: ecommerce category banner
Primary request: an abundant but refined composition of genuine Ceylon cinnamon quills and thin curled bark shards
Scene/backdrop: pale hand-plastered surface with a softly blurred cinnamon grove beyond
Subject: fragile many-layered tan quills, a peeler's small brass knife and a few fresh cinnamon leaves
Style/medium: premium editorial still-life photography with true natural texture
Composition/framing: adaptable wide composition with the subject concentrated through the middle and lower third; strong crop safety for a narrow accordion panel
Lighting/mood: warm raking morning light, aromatic and artisanal
Color palette: honey tan, warm cream, muted copper and small fresh-green accents
Constraints: botanically accurate Ceylon cinnamon, no packaging, no text, no logo, no watermark
Avoid: thick dark cassia sticks, Christmas styling, star anise, visual clutter
```

### #3 -> 2.2 Whole Spices

**Path:** `aranya-next/public/images/categories/cat-whole.webp`
**Slot ID:** `cat-whole`
**Placement:** Homepage category accordion; responsive tall/wide crop.

```text
Use case: photorealistic-natural
Asset type: ecommerce category banner
Primary request: a tactile harvest-table arrangement of premium whole Sri Lankan spices
Scene/backdrop: dark warm stone table in an airy spice house
Subject: cinnamon quills, green cardamom pods, cloves, nutmeg, mace and black peppercorns in low hand-thrown bowls, each ingredient clearly recognisable
Style/medium: contemporary food editorial photography, refined but not sterile
Composition/framing: layered central sweep with important objects kept away from outer edges for flexible accordion crops
Lighting/mood: directional window light with soft shadows; rich, aromatic and confident
Color palette: charcoal, clove brown, cardamom sage, cinnamon copper, mace coral and cream
Constraints: realistic proportions and spice morphology; no text, labels, logos or watermark
Avoid: market-stall chaos, unrelated spices, excessive props, oversaturated orange grading
```

### #4 -> 2.3 Ground & Powders

**Path:** `aranya-next/public/images/categories/cat-ground.webp`
**Slot ID:** `cat-ground`
**Placement:** Homepage category accordion; responsive tall/wide crop.

```text
Use case: photorealistic-natural
Asset type: ecommerce category banner
Primary request: jewel-like mounds of freshly stone-milled Sri Lankan spice powders
Scene/backdrop: matte warm-cream worktop with subtle milling dust and one dark stone mortar
Subject: distinct mounds of turmeric gold, cinnamon ochre, ginger sand and roasted curry umber, with small whole-spice cues beside each
Style/medium: premium macro food photography, tactile and realistic
Composition/framing: graphic diagonal arrangement through the centre, enough negative space and crop safety for narrow and wide layouts
Lighting/mood: clean side light that reveals fine powder texture; bright, modern and appetising
Color palette: turmeric yellow, burnt sienna, pale ginger, deep roasted brown and warm cream
Constraints: powders remain separate and believable; no text, packaging, logo or watermark
Avoid: rainbow pigment appearance, smoke clouds, messy spills, artificial gloss
```

### #5 -> 2.4 Cardamom & Pods

**Path:** `aranya-next/public/images/categories/cat-cardamom.webp`
**Slot ID:** `cat-cardamom`
**Placement:** Homepage category accordion; responsive tall/wide crop.

```text
Use case: photorealistic-natural
Asset type: ecommerce category banner
Primary request: fresh green cardamom pods being sorted by hand immediately after harvest in Kandy District
Scene/backdrop: shaded forest-garden worktable with soft foliage bokeh
Subject: vivid but natural green ribbed pods in a shallow woven tray, one Sri Lankan worker's hands gently grading them, a few cardamom leaves
Style/medium: intimate documentary food photography with macro detail
Composition/framing: central subject band, hands entering naturally from one side, adaptable to narrow vertical and landscape crops
Lighting/mood: cool filtered daylight balanced by warm skin and basket tones; fresh and fragrant
Color palette: cardamom sage, celadon, woven straw, warm brown and soft cream
Constraints: accurate cardamom pods; no text, packaging, logo or watermark
Avoid: peas, coffee berries, tea leaves, neon green, staged manicure
```

### #6 -> 2.5 Gift Sets — homepage category

**Path:** `aranya-next/public/images/categories/cat-gift.webp`
**Slot ID:** `cat-gift`
**Placement:** Homepage category accordion; responsive tall/wide crop.

```text
Use case: product-mockup
Asset type: ecommerce category banner
Primary request: an open premium spice gift box revealing a coordinated collection of small spice jars and pouches
Scene/backdrop: warm cream linen on a dark walnut table, minimal celebratory setting
Subject: forest-green rigid keepsake box, subtle blind-embossed botanical motif with no readable words, antique-gold cord, cinnamon quills, cardamom, cloves and pepper visible in elegant containers
Style/medium: luxurious editorial product photography, handcrafted rather than corporate
Composition/framing: three-quarter top view, box centred in the crop-safe middle, ribbon trailing gently
Lighting/mood: soft festive window light, generous and intimate
Color palette: forest green, antique gold, cream, cinnamon tan and small jewel-toned spice accents
Constraints: coherent packaging family; no readable text, external brands, logo or watermark
Avoid: Christmas-only styling, glossy plastic, excessive green props, generic hamper basket
```

### #7 -> 2.6 Whole Spices — category landing feature

**Path:** `aranya-next/public/images/categories/cat-whole-spices.webp`
**Slot ID:** `cat-whole-spices`
**Placement:** Categories page, 4:3 preparation feature.

```text
Use case: photorealistic-natural
Asset type: ecommerce category feature image
Primary request: close editorial view of a Sri Lankan spice merchant opening fresh sacks of whole cinnamon quills, cloves, nutmeg, cardamom and black pepper
Scene/backdrop: clean contemporary Kandy spice house with limewashed walls and timber shelves softly out of focus
Subject: hands lifting a scoop of mixed harvest from neatly separated natural-fibre sacks; whole ingredients remain clearly identifiable
Style/medium: premium documentary retail photography, realistic and tactile
Composition/framing: landscape 4:3, action centred with a clear lower band for the website overlay
Lighting/mood: warm daylight and gentle shadow, abundant but orderly
Color palette: jute, cream, charcoal, cinnamon and cardamom green
Constraints: Sri Lankan context, hygienic premium presentation; no text, labels, logos or watermark
Avoid: bazaar clutter, colonial décor, costume, oversaturated colour
```

### #8 -> 2.7 Ground & Powders — category landing feature

**Path:** `aranya-next/public/images/categories/cat-ground-powders.webp`
**Slot ID:** `cat-ground-powders`
**Placement:** Categories page, 4:3 preparation feature.

```text
Use case: photorealistic-natural
Asset type: ecommerce category feature image
Primary request: a small-batch stone-milling scene with freshly ground Ceylon spices
Scene/backdrop: airy artisan spice workshop in Sri Lanka, clean stone mill and pale plaster walls
Subject: Sri Lankan miller checking turmeric-gold and cinnamon-brown powders in shallow brass trays, powder textures crisp and separated
Style/medium: high-end documentary food photography, authentic working moment
Composition/framing: landscape 4:3, waist-level view, main action central with darker lower edge for UI overlays
Lighting/mood: bright side light through a window; precise, fresh and craft-focused
Color palette: warm cream, stone grey, turmeric gold, cinnamon ochre and muted workwear blue
Constraints: plausible food-safe workspace; no readable text, branding or watermark
Avoid: industrial factory, clouds of airborne powder, unsafe handling, staged smile
```

### #9 -> 2.8 Estate Blends — category landing feature

**Path:** `aranya-next/public/images/categories/cat-estate-blends.webp`
**Slot ID:** `cat-estate-blends`
**Placement:** Categories page, 4:3 preparation feature.

```text
Use case: photorealistic-natural
Asset type: ecommerce category feature image
Primary request: hand blending a dark-roasted Ceylon curry powder in a wide traditional bowl
Scene/backdrop: refined Kandy test kitchen with timber, stone and brass details
Subject: cook's hands folding aromatic ground spices together; nearby small dishes of coriander seed, cumin, cinnamon, pepper, clove and turmeric explain the blend
Style/medium: cinematic culinary editorial photograph with realistic powder detail
Composition/framing: landscape 4:3, shallow three-quarter overhead angle, central mixing gesture, crop-safe border
Lighting/mood: moody amber side light with controlled contrast; slow, expert and aromatic
Color palette: roasted umber, turmeric gold, copper, charcoal and cream
Constraints: no flames or floating particles; no text, branding or watermark
Avoid: generic curry dish, oversaturated red powder, cluttered restaurant kitchen
```

### #10 -> 2.9 Bestsellers collection

**Path:** `aranya-next/public/images/categories/col-best.webp`
**Slot ID:** `col-best`
**Placement:** Categories page collection tile, 5:4.

```text
Use case: product-mockup
Asset type: ecommerce collection tile
Primary request: a confident tabletop grouping of Aranya Ceylon's four signature spices: cinnamon quills, green cardamom, black peppercorns and golden turmeric
Scene/backdrop: dark honed stone with one folded cream linen
Subject: four restrained premium containers with ingredients spilling naturally beside them; cohesive forest-green, cream and antique-gold packaging with blank labels
Style/medium: polished food product photography with real material texture
Composition/framing: 5:4 landscape, tight hero cluster in the centre and upper half, clear darker lower third for website copy
Lighting/mood: sculpted warm studio light, bestselling confidence without ostentation
Color palette: cream, charcoal, spice gold, cinnamon and small forest-green accents
Constraints: no readable text, logo, external brand or watermark
Avoid: identical green objects, supermarket pack styling, excessive props
```

### #11 -> 2.10 New Arrivals collection

**Path:** `aranya-next/public/images/categories/col-new.webp`
**Slot ID:** `col-new`
**Placement:** Categories page collection tile, 5:4.

```text
Use case: product-mockup
Asset type: ecommerce collection tile
Primary request: recently harvested mace blades and a fresh small-batch garam masala presented as new additions to a premium spice range
Scene/backdrop: pale travertine table with a soft mist-blue paper backdrop
Subject: sculptural coral-red mace blades, a small dark-roasted blend bowl, two elegant blank-label spice packs and a dated harvest tag turned away from camera
Style/medium: contemporary editorial product photography, fresh and design-forward
Composition/framing: 5:4, asymmetrical central arrangement, open upper background and darker lower edge for copy
Lighting/mood: crisp morning studio light with delicate shadows; surprising and new
Color palette: coral, terracotta, mist blue, warm cream and restrained forest green
Constraints: spices anatomically accurate; no readable text, logo or watermark
Avoid: green-and-brown monotony, confetti, novelty props, artificial CGI sheen
```

### #12 -> 2.11 Gift Sets collection

**Path:** `aranya-next/public/images/categories/col-gift.webp`
**Slot ID:** `col-gift`
**Placement:** Categories page collection tile, 5:4.

```text
Use case: product-mockup
Asset type: ecommerce collection tile
Primary request: three sizes of elegant Sri Lankan spice gift boxes ready to be given
Scene/backdrop: softly textured warm-cream studio with a slim walnut plinth
Subject: forest-green keepsake boxes, one open and two tied with antique-gold cord, glimpses of colourful spices and cotton message cards without writing
Style/medium: premium catalogue photography with handcrafted paper, linen and glass texture
Composition/framing: landscape 5:4, tiered central group with clean silhouette and lower-third contrast
Lighting/mood: soft celebratory glow, tasteful and generous
Color palette: deep forest, cream, aged gold, coral and turmeric accents
Constraints: packaging must match the other gift-set prompts; no readable text, logo or watermark
Avoid: Christmas-only décor, generic wicker hamper, glossy luxury cliché
```

## 3. About page

### #13 -> 3.1 About hero — spice as the forest intended

**Path:** `aranya-next/public/images/about/about-hero.webp`
**Slot ID:** `about-hero`
**Placement:** About page full-viewport hero; responsive landscape/mobile crop.

```text
Use case: photorealistic-natural
Asset type: full-viewport brand-story hero
Primary request: a wide, cinematic view into a biodiverse Sri Lankan forest spice estate in the Central Highlands just after rain
Scene/backdrop: cinnamon, cardamom and pepper growing beneath layered canopy, a narrow earthen path disappearing into mist, subtle human-scale cultivation
Subject: one distant Sri Lankan grower walking the path with a modest woven harvest basket, secondary to the landscape
Style/medium: premium environmental documentary photography, natural realism, subtle film grain
Composition/framing: wide 16:9 master with the key path and figure in the central safe zone; calm upper and lower areas for large website typography; resilient to portrait crop
Lighting/mood: first sunlight filtering through retreating mist; mysterious, alive and hopeful
Color palette: mist blue, moss and tea greens, wet umber, pale cinnamon and touches of warm gold
Constraints: ecologically and geographically plausible; no text, logo or watermark
Avoid: fantasy jungle, oversaturated emerald grade, tea-estate monoculture, dramatic tourist vista
```

### #14 -> 3.2 Founder / origin portrait

**Path:** `aranya-next/public/images/about/about-origin.webp`
**Slot ID:** `about-origin`
**Placement:** About page “How it began,” portrait 4:5.

```text
Use case: photorealistic-natural
Asset type: founder-story editorial portrait
Primary request: an understated portrait of a Sri Lankan spice-house founder walking a Matale hillside with a local cinnamon grower
Scene/backdrop: small mixed-crop estate, cinnamon trees, distant blue hills and a simple field notebook
Subject: two adults in practical contemporary clothing, caught mid-conversation while examining a delicate cinnamon quill; collaborative, equal and unposed
Style/medium: intimate documentary portrait photography, realistic skin, weather and fabric texture
Composition/framing: vertical 4:5, figures from knee up, hands and quill visible, gentle background depth
Lighting/mood: late-afternoon diffused sun, thoughtful and personal
Color palette: soft denim blue, cream, cinnamon tan, muted green and warm skin tones
Constraints: culturally respectful; no fashion posing, text, logo or watermark
Avoid: saviour narrative, staged handshake, business suit, plantation-owner imagery
```

### #15 -> 3.3 Matale cinnamon peelers

**Path:** `aranya-next/public/images/about/about-grower-1.webp`
**Slot ID:** `about-grower-1`
**Placement:** About page growers grid, landscape 4:3.

```text
Use case: photorealistic-natural
Asset type: documentary grower card
Primary request: Sri Lankan cinnamon peelers at work in Matale, carefully shaving and rolling fresh inner bark into delicate Ceylon quills
Scene/backdrop: shaded open-sided family workshop beside a small hillside grove
Subject: two experienced adult artisans seated at a clean timber bench, specialised peeling knives and thin bark layers clearly visible
Style/medium: honest editorial documentary photography with tactile hand detail
Composition/framing: landscape 4:3, close enough to read the craft, faces and hands naturally included
Lighting/mood: soft daylight, concentrated and quietly skilled
Color palette: pale bark, warm timber, soft white clothing and gentle green background
Constraints: accurate Ceylon cinnamon process; no text, logo or watermark
Avoid: thick cassia, posed group portrait, poverty framing, tourist costume
```

### #16 -> 3.4 Kandy cardamom pickers

**Path:** `aranya-next/public/images/about/about-grower-2.webp`
**Slot ID:** `about-grower-2`
**Placement:** About page growers grid, landscape 4:3.

```text
Use case: photorealistic-natural
Asset type: documentary grower card
Primary request: Sri Lankan cardamom pickers selectively harvesting ripe green pods by hand in a shaded Kandy forest garden
Scene/backdrop: cardamom plants growing low beneath a humid mixed canopy
Subject: two adult growers in practical contemporary field clothes, one crouching to pick pods close to the base while the other sorts a small woven tray
Style/medium: natural documentary photography, realistic plants, skin and damp fabric
Composition/framing: landscape 4:3, immersive eye-level view through leaves, faces and harvesting action unobstructed
Lighting/mood: cool dappled light, patient and fresh
Color palette: cardamom sage, deep leaf green, earth brown, muted coral fabric accent
Constraints: botanically plausible harvest technique; no text, logo or watermark
Avoid: tea plucking, high branches, staged smiles, neon foliage
```

### #17 -> 3.5 Southern Province turmeric curers

**Path:** `aranya-next/public/images/about/about-grower-3.webp`
**Slot ID:** `about-grower-3`
**Placement:** About page growers grid, landscape 4:3.

```text
Use case: photorealistic-natural
Asset type: documentary grower card
Primary request: Sri Lankan turmeric curers spreading freshly boiled turmeric rhizomes to dry in the Southern Province
Scene/backdrop: clean sunlit courtyard beside a modest processing shed, woven drying mats and tropical shade at the edge
Subject: two adult workers turning brilliant ochre rhizomes by hand, natural work clothes and authentic tools
Style/medium: editorial documentary photography with vivid but true food colour
Composition/framing: landscape 4:3, low three-quarter angle with patterned turmeric foreground and human action central
Lighting/mood: clear morning sun softened by haze; industrious and optimistic
Color palette: turmeric gold, terracotta, sky blue, cream and restrained leaf green
Constraints: believable curing workflow and clean handling; no text, logo or watermark
Avoid: piles of ground powder, exoticising costume, oversaturation, stock-photo pose
```

### #18 -> 3.6 Central Highlands region

**Path:** `aranya-next/public/images/about/about-region.webp`
**Slot ID:** `about-region`
**Placement:** About page full-width “The land” landscape band.

```text
Use case: photorealistic-natural
Asset type: wide environmental brand-story image
Primary request: sweeping but intimate view across Sri Lanka's Central Highlands where mixed spice gardens climb misty slopes
Scene/backdrop: layered ridgelines, cloud pockets, cinnamon and pepper vines among native shade trees, small roofs barely visible
Style/medium: large-format landscape photography with realistic atmospheric depth
Composition/framing: panoramic landscape, gently rising foreground, open misty centre for overlaid heading, key detail kept within the middle 70 percent
Lighting/mood: luminous dawn after rainfall, contemplative and timeless
Color palette: blue-grey mist, varied natural greens, umber earth and a thin amber horizon
Constraints: no people required; no text, logo or watermark
Avoid: postcard saturation, tea monoculture, drone-shot sterility, fantasy mountains
```

## 4. Gifts page

### #19 -> 4.1 Gifts hero

**Path:** `aranya-next/public/images/gifts/gift-hero.webp`
**Slot ID:** `gift-hero`
**Placement:** Gifts page full-viewport hero; responsive landscape/mobile crop.

```text
Use case: ads-marketing
Asset type: premium gifting landing-page hero
Primary request: a warm candid moment of one person handing another a beautifully wrapped Sri Lankan spice gift box across an elegant dining table
Scene/backdrop: contemporary home at dusk with linen, ceramics and soft amber practical lights; subtly festive but season-neutral
Subject: only the recipients' natural hands and partial figures, a forest-green keepsake spice box tied with antique-gold cord as the focal point, an open companion box showing colourful spice jars
Style/medium: cinematic lifestyle product photography, sophisticated and human
Composition/framing: wide 16:9 master, gift centred in the safe zone, ample dark calm space above and below for hero copy, portrait-crop safe
Lighting/mood: warm pools of light with gentle shadow, generous and intimate
Color palette: warm cream, amber, oxblood, forest green and antique gold
Constraints: packaging consistent across all gift prompts; no readable text, external logo or watermark
Avoid: Christmas clichés, bows covering the box, forced smiles, luxury excess, all-green set
```

### #20 -> 4.2 The Ceylon Classic gift set

**Path:** `aranya-next/public/images/gifts/sets/classic.webp`
**Current placeholder:** `GiftBox` for gift set `classic`
**Placement:** Featured gift and gift-set card; generate 5:4 with safe 4:3 crop.

```text
Use case: product-mockup
Asset type: premium ecommerce gift-set product image
Primary request: an open “Ceylon Classic” keepsake box containing four coordinated 50 g spice jars: Ceylon cinnamon quills, green cardamom pods, whole cloves and black peppercorns
Scene/backdrop: warm-cream seamless studio surface with a small folded linen accent
Subject: forest-green rigid box with blind-embossed leaf motif, antique-gold cord, cream dividers, four clear glass jars with embossed brass-toned lids and blank cream labels; ingredients visibly distinct
Style/medium: high-end catalogue product photography, realistic glass, paper and spice texture
Composition/framing: three-quarter top-down, landscape 5:4, complete box and ribbon visible, generous padding, crop-safe for 4:3
Lighting/mood: softbox daylight with sculpted highlights and subtle grounded shadow
Color palette: forest green, cream, antique gold, cinnamon tan, cardamom green and pepper charcoal
Constraints: exactly four jars; coherent package system; no readable text, logo or watermark
Avoid: plastic, floating objects, messy spills, Christmas décor
```

### #21 -> 4.3 The Curry Night gift set

**Path:** `aranya-next/public/images/gifts/sets/curry-night.webp`
**Current placeholder:** `GiftBox` for gift set `curry`
**Placement:** Gift-set card, 4:3.

```text
Use case: product-mockup
Asset type: premium ecommerce gift-set product image
Primary request: an open spice gift box for a Sri Lankan curry night containing four coordinated 50 g jars: dark-roasted Ceylon curry powder, Kandyan garam masala, golden turmeric and pale ground ginger
Scene/backdrop: warm cream studio with a small dark-stone tasting spoon and no other clutter
Subject: forest-green rigid keepsake box, antique-gold cord, cream dividers and four glass jars with blank labels; powder colours clearly different
Style/medium: refined catalogue product photography with believable material texture
Composition/framing: landscape 4:3, three-quarter top-down, entire box and contents visible with padding
Lighting/mood: warm directional studio light, aromatic and convivial
Color palette: roasted umber, turmeric gold, ginger sand, forest green, cream and aged brass
Constraints: exactly four jars; packaging matches the Ceylon Classic set; no readable text, logo or watermark
Avoid: prepared curry, red chilli dominance, floating spice, plastic packs
```

### #22 -> 4.4 The Baker's Box gift set

**Path:** `aranya-next/public/images/gifts/sets/bakers-box.webp`
**Current placeholder:** `GiftBox` for gift set `baker`
**Placement:** Gift-set card, 4:3.

```text
Use case: product-mockup
Asset type: premium ecommerce gift-set product image
Primary request: an open baker's spice box containing four coordinated 50 g jars: ground Ceylon cinnamon, whole nutmeg, delicate coral mace blades and green cardamom pods
Scene/backdrop: pale travertine studio surface with one folded dusty-rose linen and a tiny brass measuring spoon
Subject: forest-green rigid keepsake box with antique-gold cord and cream dividers; four clear jars with blank labels and clearly recognisable contents
Style/medium: elegant contemporary catalogue photography, tactile and appetising
Composition/framing: landscape 4:3, three-quarter top view, whole product silhouette visible with breathing room
Lighting/mood: gentle morning light, warm and creative
Color palette: cinnamon, coral, cardamom sage, cream, forest green and brass
Constraints: exactly four jars; packaging consistent with other sets; no baked goods, readable text, logo or watermark
Avoid: Christmas styling, flour mess, candy colours, glossy plastic
```

### #23 -> 4.5 The Connoisseur gift set

**Path:** `aranya-next/public/images/gifts/sets/connoisseur.webp`
**Current placeholder:** `GiftBox` for gift set `connoisseur`
**Placement:** Gift-set card, 4:3.

```text
Use case: product-mockup
Asset type: premium ecommerce gift-set product image
Primary request: a larger open connoisseur's spice case containing six coordinated 50 g jars: Ceylon cinnamon quills, green cardamom, mace blades, whole nutmeg, black peppercorns and roasted Ceylon curry powder
Scene/backdrop: dark walnut studio table with a warm-grey plaster backdrop
Subject: deep forest-green keepsake case, fine cream dividers, antique-gold cord and six glass jars with brass-toned lids and blank labels; each spice visible and distinct
Style/medium: quietly luxurious catalogue photography with realistic glass, wood, paper and spice surfaces
Composition/framing: landscape 4:3, measured three-quarter top view, full larger box centred with clean negative space
Lighting/mood: controlled museum-like side light, rare and collected rather than flashy
Color palette: forest, walnut, cream, aged gold, coral mace and spice neutrals
Constraints: exactly six jars; package family matches other gift sets; no readable text, logo or watermark
Avoid: jewellery-box excess, black glossy packaging, crowded props
```

### #24 -> 4.6 The Taster gift set

**Path:** `aranya-next/public/images/gifts/sets/taster.webp`
**Current placeholder:** `GiftBox` for gift set `taster`
**Placement:** Gift-set card, 4:3.

```text
Use case: product-mockup
Asset type: premium ecommerce gift-set product image
Primary request: a compact introductory spice gift box containing three coordinated 50 g jars: delicate Ceylon cinnamon quills, golden ground turmeric and black peppercorns
Scene/backdrop: warm-cream studio with one turmeric-coloured cotton ribbon accent
Subject: compact forest-green keepsake box, antique-gold cord, cream dividers and three clear glass jars with blank labels; ingredients distinct and inviting
Style/medium: bright polished catalogue photography with handcrafted material detail
Composition/framing: landscape 4:3, three-quarter top-down, complete box centred with generous padding
Lighting/mood: clear welcoming daylight, accessible but premium
Color palette: turmeric yellow, cinnamon tan, charcoal, cream, forest green and aged gold
Constraints: exactly three jars; packaging consistent with other sets; no readable text, logo or watermark
Avoid: childish starter-kit styling, plastic, excessive props, spice clouds
```

### #25 -> 4.7 Housewarming occasion

**Path:** `aranya-next/public/images/gifts/occasions/housewarming.webp`
**Slot ID:** `occ-housewarming`
**Placement:** Gifts-by-occasion tile, portrait 3:4.

```text
Use case: ads-marketing
Asset type: portrait gifting occasion tile
Primary request: a premium spice gift box arriving in a beautiful but lived-in new kitchen during a housewarming
Scene/backdrop: contemporary Sri Lankan or globally neutral kitchen with unpacked ceramics and warm daylight
Subject: one person setting the forest-green Ceylon Classic box beside a new wooden spice shelf, hands mid-action, cinnamon and cardamom glimpsed inside
Style/medium: natural editorial lifestyle photography
Composition/framing: vertical 3:4, gift and hands in central safe zone, visually quiet lower area for website overlay
Lighting/mood: optimistic morning light, welcoming and useful
Color palette: warm plaster, pale wood, blue-grey ceramic, forest green and spice amber
Constraints: no readable text, logo or watermark
Avoid: real-estate-showroom sterility, posed faces, key props, all-green styling
```

### #26 -> 4.8 Festive & holidays occasion

**Path:** `aranya-next/public/images/gifts/occasions/festive.webp`
**Slot ID:** `occ-festive`
**Placement:** Gifts-by-occasion tile, portrait 3:4.

```text
Use case: ads-marketing
Asset type: portrait gifting occasion tile
Primary request: a season-neutral festive table with the Baker's Box being untied before a shared meal
Scene/backdrop: linen-covered table, candles, citrus leaves, dried orange and understated deep-red textile; no culturally exclusive holiday symbols
Subject: natural hands loosening antique-gold cord around a forest-green spice box, cardamom, cinnamon, nutmeg and mace visible inside
Style/medium: cinematic lifestyle food photography, elegant and intimate
Composition/framing: vertical 3:4, box central, warm lights receding upward, darker lower third for site copy
Lighting/mood: candlelit amber evening, celebratory without excess
Color palette: oxblood, amber, cream, forest green and coral mace
Constraints: no readable text, logo or watermark
Avoid: Christmas tree, snow, tinsel, cultural costume, overdecorated table
```

### #27 -> 4.9 Thank-you occasion

**Path:** `aranya-next/public/images/gifts/occasions/thank-you.webp`
**Slot ID:** `occ-thankyou`
**Placement:** Gifts-by-occasion tile, portrait 3:4.

```text
Use case: ads-marketing
Asset type: portrait gifting occasion tile
Primary request: a small spice gift left as a heartfelt thank-you on a sunlit desk
Scene/backdrop: tactile home workspace with warm cream paper, a ceramic cup and a single coral flower
Subject: compact forest-green Taster box tied with gold cord, a blank handwritten-style cotton card tucked beneath, one person's hand just leaving frame
Style/medium: quiet editorial still-life photography with a human trace
Composition/framing: vertical 3:4, gift centred slightly high, uncluttered darker lower region for website copy
Lighting/mood: soft late-afternoon sunlight, sincere and lovely
Color palette: cream, apricot, coral, forest green, turmeric gold and walnut
Constraints: card has no visible writing; no readable text, logo or watermark
Avoid: generic greeting-card typography, bouquet overload, luxury jewellery styling
```

### #28 -> 4.10 For the cook occasion

**Path:** `aranya-next/public/images/gifts/occasions/for-the-cook.webp`
**Slot ID:** `occ-cook`
**Placement:** Gifts-by-occasion tile, portrait 3:4.

```text
Use case: ads-marketing
Asset type: portrait gifting occasion tile
Primary request: a keen home cook opening the Curry Night spice box beside an active mise en place for Sri Lankan black curry
Scene/backdrop: refined lived-in kitchen, dark stone counter, curry leaves, coconut and an unlit clay pot
Subject: cook's natural hands lifting a jar of roasted curry powder from the forest-green box; face optional and secondary
Style/medium: dynamic culinary editorial photography, authentic and tactile
Composition/framing: vertical 3:4, box and hands central, ingredients form a subtle frame, clean lower region for site copy
Lighting/mood: moody side light, anticipatory and serious about flavour
Color palette: roasted brown, curry-leaf green, coconut cream, clay red and antique gold
Constraints: no flames, readable text, external brands, logo or watermark
Avoid: chef whites, commercial kitchen, red-chilli cliché, clutter
```

## 5. Wholesale page

### #29 -> 5.1 Wholesale hero

**Path:** `aranya-next/public/images/wholesale/wholesale-hero.webp`
**Slot ID:** `wholesale-hero`
**Placement:** Wholesale page full-viewport hero; responsive landscape/mobile crop.

```text
Use case: photorealistic-natural
Asset type: B2B landing-page hero
Primary request: premium bulk Ceylon spices being quality-checked and packed by hand at a clean Sri Lankan spice house
Scene/backdrop: airy contemporary warehouse-workshop with limewashed walls, stacked natural-fibre sacks and timber pallets, not an industrial factory
Subject: two Sri Lankan staff inspecting long delicate cinnamon quills over an open food-safe sack; cardamom and pepper sacks recede softly behind
Style/medium: cinematic documentary commercial photography with realistic working detail
Composition/framing: wide 16:9 master, workers and cinnamon in central safe zone, generous calm upper and lower regions for hero copy, mobile crop safe
Lighting/mood: directional morning light and soft airborne haze, capable, transparent and premium
Color palette: jute, cinnamon, cream, charcoal, muted blue workwear and restrained forest green
Constraints: hygienic plausible bulk handling, dignified workers; no readable sack markings, logos or watermark
Avoid: dirty warehouse, colonial warehouse aesthetic, staged handshake, excessive green tint
```

## 6. Contact page

### #30 -> 6.1 Kandy spice house location image

**Path:** `aranya-next/public/images/contact/contact-map.webp`
**Slot ID:** `contact-map`
**Placement:** Contact page “Visit the spice house” card, 4:3; an HTML map pin overlays the centre.

```text
Use case: photorealistic-natural
Asset type: contact-page location image
Primary request: street-level exterior photograph of a refined independent spice house in Kandy, Sri Lanka
Scene/backdrop: walkable Kandy street with warm plaster façade, shaded arcade, subtle tropical planting and a glimpse of hills; contemporary and locally grounded
Subject: inviting small storefront with timber-framed windows, spice jars visible inside and a blank hanging sign; a few natural pedestrians for scale
Style/medium: architectural editorial photography, realistic and welcoming
Composition/framing: landscape 4:3, façade centred but leave the exact centre visually calm for the website's map-pin overlay; straight verticals and crop-safe edges
Lighting/mood: soft late-morning daylight after rain, approachable and real
Color palette: ochre plaster, dark timber, cream, muted teal and leafy accents
Constraints: no readable address or invented brand text; no logo, vehicle plates or watermark
Avoid: fake satellite map, colonial nostalgia, tourist souvenir shop, empty CGI architecture
```

## 7. Recipe photography

Each recipe uses one master image for its listing card, related-recipe card and full-width detail hero. Generate a wide 16:9 master with the plated dish in the central 60 percent so it also survives the 3:2 and 16:11 crops. Keep the lower portion dark and calm enough for white hero copy.

### #31 -> 7.1 Sri Lankan Black Pork Curry

**Path:** `aranya-next/public/images/recipes/black-pork-curry.webp`
**Slot ID:** `rec-blackpork`
**Placement:** Recipes index and `/recipes/black-pork-curry` hero.

```text
Use case: photorealistic-natural
Asset type: editorial recipe hero and card
Primary request: authentic Sri Lankan black pork curry, deeply roasted and nearly ebony-brown, served with simple white rice
Scene/backdrop: dark stone dining table with a clay curry pot, a few curry leaves and a broken Ceylon cinnamon quill; no decorative ingredient scatter
Subject: spoon-tender pork shoulder in a thick glossy black masala, visible caramelised onion and curry leaves, appetising steam kept subtle
Style/medium: premium natural food photography, realistic home-cooked texture rather than restaurant perfection
Composition/framing: wide 16:9, hero bowl centred in the middle 60 percent, three-quarter table angle, safe for tighter card crops, calm dark lower third
Lighting/mood: moody side light with warm highlights, smoky and generous
Color palette: charcoal, roasted umber, coconut white, curry-leaf green and clay red
Constraints: culturally plausible plating; no cutlery brand, text, logo or watermark
Avoid: bright red curry, excessive oil, floating steam effects, generic Indian thali styling
```

### #32 -> 7.2 Kandyan Garam Masala Roast Chicken

**Path:** `aranya-next/public/images/recipes/garam-masala-roast-chicken.webp`
**Slot ID:** `rec-roastchicken`
**Placement:** Recipes index and `/recipes/garam-masala-roast-chicken` hero.

```text
Use case: photorealistic-natural
Asset type: editorial recipe hero and card
Primary request: whole roast chicken lacquered deep amber with Kandyan garam masala and turmeric, rested and ready to carve
Scene/backdrop: warm plaster dining setting, dark roasting tray, charred lemon halves, garlic and a restrained scatter of curry leaves
Subject: crisp naturally blistered skin, visible spice crust and pan juices, wholesome rather than over-styled
Style/medium: premium cookbook photography with believable food texture
Composition/framing: wide 16:9, bird centred within the middle 60 percent, low three-quarter angle, clean darker lower area and crop-safe sides
Lighting/mood: golden late-afternoon side light, celebratory and comforting
Color palette: deep amber, turmeric gold, lemon, dark bronze and cream
Constraints: no text, logo or watermark
Avoid: raw-looking joints, burnt-black skin, holiday turkey styling, excessive garnish
```

### #33 -> 7.3 Ceylon Cinnamon Rolls

**Path:** `aranya-next/public/images/recipes/ceylon-cinnamon-rolls.webp`
**Slot ID:** `rec-cinnamonrolls`
**Placement:** Recipes index and `/recipes/ceylon-cinnamon-rolls` hero.

```text
Use case: photorealistic-natural
Asset type: editorial recipe hero and card
Primary request: a tray of soft pull-apart Ceylon cinnamon rolls with delicate spirals, light cream-cheese glaze and a whisper of cardamom
Scene/backdrop: pale stone breakfast table with rumpled cream linen, one cinnamon quill and a few opened cardamom pods
Subject: warm golden rolls, one gently pulled apart to reveal a moist fine crumb and true-cinnamon filling
Style/medium: airy premium baking photography, tactile and natural
Composition/framing: wide 16:9, tray and hero roll within central safe zone, shallow overhead angle, clean sides for alternate crops
Lighting/mood: soft morning window light, tender and inviting
Color palette: honey, cinnamon, ivory, pale sage and dusty blue
Constraints: no text, packaging, logo or watermark
Avoid: heavy white icing blanket, dark cassia sticks, Christmas props, artificial perfection
```

### #34 -> 7.4 Golden Milk, Done Properly

**Path:** `aranya-next/public/images/recipes/golden-milk.webp`
**Slot ID:** `rec-goldenmilk`
**Placement:** Recipes index and `/recipes/golden-milk` hero.

```text
Use case: photorealistic-natural
Asset type: editorial recipe hero and card
Primary request: two cups of properly made golden milk, richly turmeric-yellow with a fine natural froth
Scene/backdrop: quiet evening table in warm cream and muted indigo, small brass saucepan, cinnamon quill and a pepper mill softly out of focus
Subject: one handmade ceramic cup in crisp focus, second cup behind, tiny black-pepper flecks and realistic milk texture
Style/medium: intimate wellness food photography without wellness-ad clichés
Composition/framing: wide 16:9, cups in the central 55 percent, eye-level three-quarter angle, generous calm shadows for text overlays and crop safety
Lighting/mood: low warm lamplight, soothing evening ritual
Color palette: turmeric gold, indigo, cream, walnut and brass
Constraints: no text, logo or watermark
Avoid: bright green foliage, latte art, medicine imagery, powder explosion
```

### #35 -> 7.5 Ceylon Masala Chai

**Path:** `aranya-next/public/images/recipes/ceylon-masala-chai.webp`
**Slot ID:** `rec-chai`
**Placement:** Recipes index and `/recipes/ceylon-masala-chai` hero.

```text
Use case: photorealistic-natural
Asset type: editorial recipe hero and card
Primary request: strong Ceylon masala chai being poured through a small strainer into simple ceramic cups
Scene/backdrop: hill-country kitchen table with dark timber, a brushed-metal saucepan and a folded muted-coral cloth
Subject: caramel-coloured milky tea in motion, bruised green cardamom, cloves, thin Ceylon cinnamon and one peppercorn nearby
Style/medium: candid premium food photography, authentic and tactile
Composition/framing: wide 16:9, pour arc and cups contained in central safe zone, crop-safe sides, darker lower band for hero copy
Lighting/mood: cool misty morning window light balanced with warm tea, lively and comforting
Color palette: caramel, charcoal, cardamom green, muted coral and cream
Constraints: anatomically natural hand if visible; no text, logo or watermark
Avoid: ornate generic chai glass, star-anise decoration, impossible splash, café branding
```

### #36 -> 7.6 Roasted Ceylon Curry Powder, From Scratch

**Path:** `aranya-next/public/images/recipes/roasted-ceylon-curry-powder.webp`
**Slot ID:** `rec-currypowder`
**Placement:** Recipes index and `/recipes/roasted-ceylon-curry-powder` hero.

```text
Use case: photorealistic-natural
Asset type: editorial recipe hero and card
Primary request: freshly roasted Ceylon curry powder being ground from whole spices in a heavy stone mortar
Scene/backdrop: clean dark-stone worktop in a Sri Lankan home kitchen, cooling pan of toasted coriander, cumin, fennel, pepper, cloves and cinnamon
Subject: a mound of deep brown aromatic powder, pestle mid-action in natural hands, small turmeric-gold accent added after roasting
Style/medium: premium process-focused food photography with crisp seed and powder texture
Composition/framing: wide 16:9, mortar and hand central, shallow overhead angle, generous crop safety and calm darker lower third
Lighting/mood: focused warm side light, practical and aromatic
Color palette: toasted umber, black pepper, turmeric gold, stone grey and warm skin
Constraints: ingredients plausible and recognisable; no text, logo or watermark
Avoid: red chilli mound, airborne powder cloud, decorative star anise, rustic clutter
```

## 8. Journal photography

The five journal cover images are reused for the journal index, search results, related cards and article heroes. Generate each as a wide 16:9 master with strong centre crop safety. The current fallback articles also contain one 16:9 supporting image each.

### #37 -> 8.1 True cinnamon — cover

**Path:** `aranya-next/public/images/journal/true-cinnamon/cover.webp`
**Slot ID:** `post-cinnamon`
**Placement:** Journal card/search result and `/journal/true-cinnamon` hero.

```text
Use case: photorealistic-natural
Asset type: editorial journal cover and article hero
Primary request: a hand holding an exceptionally delicate many-layered Ceylon cinnamon quill up to soft window light, showing its parchment-thin structure
Scene/backdrop: quiet Matale peeling workshop, timber bench and pale bark softly out of focus
Subject: translucent tan quill and experienced Sri Lankan peeler's hand in crisp focus
Style/medium: literary food-documentary photography with fine film grain and honest hand texture
Composition/framing: wide 16:9, quill and hand centred within the middle 55 percent, spacious dark-to-warm background for responsive crops and white hero type
Lighting/mood: luminous side light, revelatory and intimate
Color palette: honey tan, parchment, warm umber and subdued teal shadow
Constraints: true Ceylon quill, no text, logo or watermark
Avoid: thick cassia stick, Christmas styling, manicure-ad hand, ingredient scatter
```

### #38 -> 8.2 True cinnamon — supporting detail

**Path:** `aranya-next/public/images/journal/true-cinnamon/hand-rolled-quills.webp`
**Slot ID:** `post-cinnamon-detail`
**Placement:** Inline figure in the true-cinnamon article, 16:9.

```text
Use case: photorealistic-natural
Asset type: inline editorial documentary photograph
Primary request: freshly hand-rolled Ceylon cinnamon quills drying during the wet season above Matale
Scene/backdrop: open-sided artisan shed overlooking a rain-softened hillside
Subject: rows of pale fragile quills on breathable woven racks, a peeler's hands aligning one row, droplets and damp atmosphere outside
Style/medium: natural process documentary photography with precise material detail
Composition/framing: landscape 16:9, leading rows of quills, hands at one-third, full-width article crop
Lighting/mood: soft overcast wet-season light, patient and quietly beautiful
Color palette: pale cinnamon, woven straw, rain grey, moss and warm skin
Constraints: accurate thin layered quills; no text, logo or watermark
Avoid: thick dark sticks, industrial conveyor, posed worker, dramatic artificial rain
```

### #39 -> 8.3 Cardamom by hand — cover

**Path:** `aranya-next/public/images/journal/cardamom-by-hand/cover.webp`
**Slot ID:** `post-cardamom`
**Placement:** Journal card/search result and `/journal/cardamom-by-hand` hero.

```text
Use case: photorealistic-natural
Asset type: editorial journal cover and article hero
Primary request: selective hand-picking of ripe green cardamom pods low on the plant in a shaded Kandy forest garden
Scene/backdrop: humid layered understory with mist and soft leaf depth
Subject: Sri Lankan grower's weathered hand pinching one ripe ribbed pod while immature pods remain on the stem
Style/medium: immersive macro documentary photography, realistic botanical detail
Composition/framing: wide 16:9, hand and ripe pod central, foliage creates a natural frame, dark calm edges for responsive cards and hero copy
Lighting/mood: cool filtered daylight with a small luminous highlight on the pod, patient and exacting
Color palette: cardamom green, deep teal shadow, earth and warm skin
Constraints: botanically accurate cardamom; no text, logo or watermark
Avoid: tea leaves, peas, high-tree picking, neon green, staged smile
```

### #40 -> 8.4 Cardamom by hand — supporting image

**Path:** `aranya-next/public/images/journal/cardamom-by-hand/three-pass-harvest.webp`
**Slot ID:** `post-cardamom-body`
**Placement:** Inline fallback figure in the cardamom article, 16:9.

```text
Use case: photorealistic-natural
Asset type: inline editorial documentary photograph
Primary request: a cardamom grower sorting one day's hand-picked pods into ripeness grades on a woven tray
Scene/backdrop: simple shaded field station beside a Kandy forest garden
Subject: green pods ranging subtly from immature to ideal harvest stage, natural hands separating them into three small groups, harvest notebook with no visible writing
Style/medium: clear documentary still life with a human presence
Composition/framing: landscape 16:9, overhead three-quarter view, hands and three grades arranged legibly
Lighting/mood: soft canopy light, methodical and fresh
Color palette: varied natural greens, woven straw, muted blue cloth and warm skin
Constraints: no text, logo or watermark
Avoid: infographic labels, artificial colour coding, factory sorting line
```

### #41 -> 8.5 From peel to pouch — cover

**Path:** `aranya-next/public/images/journal/from-peel-to-pouch/cover.webp`
**Slot ID:** `post-process`
**Placement:** Journal card/search result and `/journal/from-peel-to-pouch` hero.

```text
Use case: photorealistic-natural
Asset type: editorial journal cover and article hero
Primary request: the journey from fresh cinnamon bark to sealed premium spice pouch shown in one authentic packing-table moment
Scene/backdrop: clean small-batch Kandy spice house with drying quills behind and a hand sealer at the edge
Subject: Sri Lankan packer weighing pale Ceylon cinnamon quills into a matte cream-and-forest pouch with a blank label, harvest crate nearby
Style/medium: modern documentary commercial photography, transparent and process-led
Composition/framing: wide 16:9, hands, scale and pouch in central safe zone, depth leading back to quills, calm shadowed areas for article type
Lighting/mood: crisp morning window light, fast-moving but careful
Color palette: cream, forest, pale cinnamon, steel grey and muted coral workwear
Constraints: plausible food-safe process; no readable text, brand mark or watermark
Avoid: giant factory, plastic bulk packaging, floating timeline graphics, staged grin
```

### #42 -> 8.6 From peel to pouch — supporting image

**Path:** `aranya-next/public/images/journal/from-peel-to-pouch/sealed-at-source.webp`
**Slot ID:** `post-process-body`
**Placement:** Inline fallback figure in the process article, 16:9.

```text
Use case: photorealistic-natural
Asset type: inline editorial process photograph
Primary request: close view of harvest-fresh Ceylon cinnamon pouches being sealed and batch-checked within days of peeling
Scene/backdrop: immaculate small production bench, compact heat sealer, quills and kraft cartons
Subject: gloved food-safe hands closing one matte cream pouch with forest-green side gussets and a blank batch card
Style/medium: refined process documentary photography with honest operational detail
Composition/framing: landscape 16:9, seal line and hands sharply visible, orderly diagonal rhythm of finished pouches
Lighting/mood: neutral bright task light softened by daylight, efficient and trustworthy
Color palette: cream, forest green, steel, kraft and cinnamon tan
Constraints: no readable text, logo or watermark
Avoid: sterile pharmaceutical lab, huge conveyor, fake digital interface
```

### #43 -> 8.7 Pepper in the mist — cover

**Path:** `aranya-next/public/images/journal/pepper-in-the-mist/cover.webp`
**Slot ID:** `post-pepper`
**Placement:** Journal card/search result and `/journal/pepper-in-the-mist` hero.

```text
Use case: photorealistic-natural
Asset type: editorial journal cover and article hero
Primary request: black pepper vines climbing living shade trees on a misty Sri Lankan hill-country smallholding
Scene/backdrop: layered highland slope at dawn, wet leaves and drifting low cloud
Subject: mature green pepper clusters in the foreground, one distant grower checking vines, landscape visible through foliage
Style/medium: atmospheric environmental documentary photography, realistic wet texture and subtle grain
Composition/framing: wide 16:9, foreground pepper cluster near centre, deep layers and dark calm lower edge, robust centre crop
Lighting/mood: cool mist pierced by restrained warm dawn, potent and mysterious
Color palette: charcoal green, mist blue, black pepper, wet bark and muted amber
Constraints: botanically accurate pepper vines and clusters; no text, logo or watermark
Avoid: ground pepper, grape-like oversized fruit, fantasy jungle, green monochrome
```

### #44 -> 8.8 Pepper in the mist — supporting image

**Path:** `aranya-next/public/images/journal/pepper-in-the-mist/sun-dried-pepper.webp`
**Slot ID:** `post-pepper-body`
**Placement:** Inline fallback figure in the pepper article, 16:9.

```text
Use case: photorealistic-natural
Asset type: inline editorial process photograph
Primary request: hill-country black pepper berries sun-drying in a thin even layer on raised woven mats
Scene/backdrop: clean highland courtyard after the mist clears, blue ridges softly visible
Subject: wrinkling pepper berries at several drying stages, Sri Lankan grower's hand turning them with a small wooden rake
Style/medium: tactile documentary food photography
Composition/framing: landscape 16:9, low angle across patterned pepper surface toward the hand and hazy hills
Lighting/mood: gentle late-morning sun, patient and fragrant
Color palette: charcoal, deep green, woven straw, faded blue and warm skin
Constraints: no text, logo or watermark
Avoid: huge industrial asphalt yard, burnt berries, artificial black dye, posed portrait
```

### #45 -> 8.9 Aranya means the forest — cover

**Path:** `aranya-next/public/images/journal/aranya-means-the-forest/cover.webp`
**Slot ID:** `post-heritage`
**Placement:** Journal card/search result and `/journal/name-means-forest` hero.

```text
Use case: photorealistic-natural
Asset type: editorial journal cover and article hero
Primary request: an evocative path through a biodiverse Sri Lankan spice forest where cinnamon, pepper and cardamom grow together beneath shade trees
Scene/backdrop: Central Highlands after rainfall, old roots, leaf litter, subtle signs of careful cultivation and no grand architecture
Subject: forest itself as protagonist, with a small woven harvest basket resting beside the path and a distant human silhouette for scale
Style/medium: poetic environmental documentary photograph, realistic and restrained
Composition/framing: wide 16:9, path curves through central safe zone, layered canopy leaves calm dark space for white hero copy, crop-safe centre
Lighting/mood: soft shafts of morning light through mist, ancient yet living
Color palette: varied natural greens, umber, mist blue, cinnamon tan and quiet gold
Constraints: no text, religious symbols, logo or watermark
Avoid: fantasy temple, generic rainforest waterfall, oversaturated green, colonial imagery
```

### #46 -> 8.10 Aranya means the forest — supporting image

**Path:** `aranya-next/public/images/journal/aranya-means-the-forest/mixed-spice-garden.webp`
**Slot ID:** `post-heritage-body`
**Placement:** Inline fallback figure in the heritage article, 16:9.

```text
Use case: photorealistic-natural
Asset type: inline environmental documentary photograph
Primary request: close environmental portrait of a mixed Sri Lankan spice garden demonstrating forest-style agriculture
Scene/backdrop: one frame naturally includes cinnamon saplings, cardamom understory and pepper vines on living supports
Subject: Sri Lankan grower walking a narrow contour path and lightly checking the plants, secondary to the layered ecosystem
Style/medium: clear magazine documentary photography, realistic botany and land texture
Composition/framing: landscape 16:9, layered foreground-to-background depth, central path and natural visual flow
Lighting/mood: diffused post-rain daylight, balanced and regenerative
Color palette: leaf greens with umber earth, pale bark, muted blue clothing and touches of sunlight
Constraints: no text, logo or watermark
Avoid: plantation monoculture, diagram labels, staged eco-ad pose, wilderness-without-cultivation look
```

## 9. Product catalogue and four-view galleries

For each product, `01-primary.webp` is the reusable master for product cards, homepage features, search, related products, recipe recommendations, basket, checkout and account thumbnails, as well as gallery view one. Keep every primary subject inside the middle 70 percent so a square master can also be cropped to 4:5. Views two through four populate the remaining product-detail thumbnails and main gallery. All four images should feel like one shoot.

### 9.1 Ceylon Cinnamon Quills

#### #47 -> Primary product image

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-quills/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `ceylon-cinnamon-quills`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: a sculptural bundle of genuine pale Ceylon cinnamon quills, showing their fragile many-layered construction
Scene/backdrop: matte warm-cream seamless surface with one muted terracotta plane
Style/medium: premium square product photography, realistic bark fibres and gentle film grain
Composition/framing: 1:1, centred crop-safe bundle with a few fine curls at its base, generous padding and a clean silhouette
Lighting/mood: warm raking daylight with soft grounded shadow; delicate and prized
Color palette: honey tan, parchment, cream and muted terracotta
Constraints: no package, cassia, text, logo or watermark
```

#### #48 -> Macro detail

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-quills/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme close-up of a broken Ceylon cinnamon quill revealing dozens of paper-thin nested bark layers
Scene/backdrop: soft charcoal stone, minimal and out of focus
Style/medium: true macro food photography with crisp fibres and natural imperfections
Composition/framing: square, cut end near centre, diagonal quill leading through frame, crop-safe
Lighting/mood: precise side light, tactile and revealing
Constraints: botanically accurate true cinnamon; no text, logo or watermark
Avoid: thick single-scroll cassia, artificial symmetry
```

#### #49 -> Freshly milled view

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-quills/03-milled.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: freshly milled Ceylon cinnamon as a fine warm-tan powder beside one delicate quill and a small brass scoop
Scene/backdrop: pale honed stone
Style/medium: refined overhead food still life, realistic powder texture
Composition/framing: square, restrained central arrangement with generous clean space
Lighting/mood: soft morning light, aromatic and fresh
Constraints: powder is pale honey-brown, not dark cassia red; no text, logo or watermark
Avoid: ingredient clutter, powder cloud, star anise
```

#### #50 -> In the jar / packaging view

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-quills/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: Ceylon cinnamon quills standing in a clear premium glass spice jar beside its matte cream presentation pouch
Scene/backdrop: warm-grey plaster sweep and slim walnut plinth
Style/medium: high-end square catalogue photography with realistic glass, paper and bark
Composition/framing: centred 1:1 still life, jar dominant, full package silhouette, generous padding
Lighting/mood: controlled softbox highlights, quiet luxury
Color palette: cream, forest-green edge accents, antique brass lid and cinnamon tan
Constraints: blank label with no readable text or logo; packaging must match the gift-set family; no watermark
```

### 9.2 Ceylon Cinnamon, Ground

#### #51 -> Primary product image

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-ground/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `ceylon-cinnamon-ground`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: a velvety mound of freshly ground true Ceylon cinnamon in a low handmade cream bowl, with one thin quill identifying the source
Scene/backdrop: matte dusty-blue and warm-cream studio planes
Style/medium: premium square food product photography, true fine powder texture
Composition/framing: 1:1, bowl and quill centred inside crop-safe middle, clean silhouette and generous padding
Lighting/mood: soft warm side light, delicate rather than fiery
Color palette: pale cinnamon, ivory, dusty blue and a restrained forest accent
Constraints: no package, cassia, text, logo or watermark
```

#### #52 -> Powder macro

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-ground/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: macro view across fine freshly milled Ceylon cinnamon, showing silky grain and a shallow scoop trail
Scene/backdrop: the cinnamon itself fills most of the square frame, cream ceramic edge just visible
Style/medium: realistic macro food photography, subtle natural grain
Composition/framing: square abstract landscape with one crisp ridge through centre
Lighting/mood: low raking light, soft and aromatic
Constraints: natural pale warm-brown colour; no text, logo or watermark
Avoid: desert appearance, glitter, clumps or red chilli colour
```

#### #53 -> Quill-to-powder view

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-ground/03-process.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce process gallery image
Primary request: small stone mortar holding freshly crushed Ceylon cinnamon, with broken thin quills progressing naturally into fine powder
Scene/backdrop: clean pale stone worktop
Style/medium: premium process still life with authentic bark and powder texture
Composition/framing: square, shallow overhead angle, mortar centred and transformation arranged simply around it
Lighting/mood: crisp morning window light, freshly milled and transparent
Constraints: no hands required; no text, logo or watermark
Avoid: visual infographic arrows, thick cassia, messy powder cloud
```

#### #54 -> Packaging view

**Path:** `aranya-next/public/images/products/ceylon-cinnamon-ground/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: pale ground Ceylon cinnamon visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: warm-grey plaster with a muted blue paper accent
Style/medium: high-end square catalogue photography, realistic glass and fine powder
Composition/framing: jar dominant at centre, pouch slightly behind, full silhouettes and generous padding
Lighting/mood: soft clean studio light
Color palette: cream, antique brass, forest-green trim, pale cinnamon and dusty blue
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.3 Ground Turmeric

#### #55 -> Primary product image

**Path:** `aranya-next/public/images/products/ground-turmeric/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `ground-turmeric`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: brilliant freshly ground Sri Lankan turmeric in a low charcoal bowl with one sliced cured rhizome beside it
Scene/backdrop: pale lilac-grey and warm-cream studio planes
Style/medium: premium square food product photography with velvety powder and fibrous root texture
Composition/framing: 1:1, centred crop-safe bowl, restrained clean silhouette and generous margins
Lighting/mood: crisp daylight, luminous and earthy
Color palette: natural turmeric gold, charcoal, pale lilac and cream
Constraints: no package, text, logo or watermark
Avoid: neon yellow, curry mixture, powder explosion, excessive styling
```

#### #56 -> Turmeric macro

**Path:** `aranya-next/public/images/products/ground-turmeric/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: macro landscape across fine ground turmeric with a clean scoop furrow and tiny natural granules
Scene/backdrop: cream ceramic rim barely visible
Style/medium: realistic macro food photography, intense but natural colour
Composition/framing: square, one powder ridge sharply lit through the centre
Lighting/mood: raking side light, vivid and tactile
Constraints: no text, logo or watermark
Avoid: desert dunes, glitter, orange smoke, CGI smoothness
```

#### #57 -> Root-to-powder view

**Path:** `aranya-next/public/images/products/ground-turmeric/03-process.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient-process image
Primary request: cured turmeric fingers and one freshly cut rhizome arranged beside a modest mound of finished golden powder
Scene/backdrop: cool grey stone with a faded coral cloth edge
Style/medium: refined overhead botanical food still life
Composition/framing: square, simple central progression from root to powder with ample clean space
Lighting/mood: bright diffused morning light, transparent and fresh
Constraints: botanically realistic; no infographic arrows, text, logo or watermark
Avoid: ginger mistaken for turmeric, fresh green leaves, clutter
```

#### #58 -> Packaging view

**Path:** `aranya-next/public/images/products/ground-turmeric/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: golden ground turmeric visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: pale lilac-grey plaster sweep
Style/medium: high-end square catalogue photography, realistic glass, paper and powder
Composition/framing: centred jar with pouch behind and one cured rhizome at base, full silhouettes and padding
Lighting/mood: clean softbox light with warm brass highlight
Color palette: turmeric gold, cream, antique brass, pale lilac and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.4 White Peppercorns

#### #59 -> Primary product image

**Path:** `aranya-next/public/images/products/white-peppercorns/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `white-peppercorns`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: ivory-white peppercorns heaped in a low slate-blue ceramic bowl, their natural warm variation clearly visible
Scene/backdrop: muted coral and warm-cream studio planes
Style/medium: premium square food product photography with realistic lightly pitted texture
Composition/framing: 1:1, centred crop-safe bowl, clean silhouette, controlled scatter and generous margins
Lighting/mood: soft clear daylight, subtle and refined
Color palette: ivory, oat, slate blue, muted coral and cream
Constraints: no package, text, logo or watermark
Avoid: chickpeas, coriander seed, bleached pure-white spheres, glossy CGI
```

#### #60 -> White pepper macro

**Path:** `aranya-next/public/images/products/white-peppercorns/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme macro of white peppercorns showing their irregular cream, beige and pale-brown pitted surfaces
Scene/backdrop: cool slate stone
Style/medium: realistic macro food photography with shallow depth
Composition/framing: square, crisp central cluster with gentle falloff
Lighting/mood: raking neutral light, delicate but pungent
Constraints: natural colour variation; no text, logo or watermark
Avoid: salt crystals, chickpeas, uniform plastic beads
```

#### #61 -> Cracked white pepper

**Path:** `aranya-next/public/images/products/white-peppercorns/03-cracked.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: coarsely cracked white pepper in a tiny charcoal mortar with several whole ivory peppercorns nearby
Scene/backdrop: pale warm stone
Style/medium: clean culinary still-life photography
Composition/framing: square, centred mortar and restrained crop-safe scatter
Lighting/mood: soft side light, nuanced and aromatic
Constraints: no black pepper mixed in; no text, logo or watermark
Avoid: fine flour texture, salt, decorative herbs
```

#### #62 -> Packaging view

**Path:** `aranya-next/public/images/products/white-peppercorns/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: white peppercorns visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: slate-blue to warm-cream plaster sweep
Style/medium: high-end square catalogue photography, realistic glass, paper and peppercorn texture
Composition/framing: jar centred, pouch slightly behind, full silhouettes and generous padding
Lighting/mood: bright diffused studio light
Color palette: ivory, slate blue, cream, antique brass and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.5 Mace Blades

#### #63 -> Primary product image

**Path:** `aranya-next/public/images/products/mace-blades/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `mace-blades`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: delicate dried Sri Lankan mace blades arranged like sculptural coral ribbons in a low cream bowl
Scene/backdrop: mist-blue and pale blush studio planes
Style/medium: premium square ingredient photography with crisp lacy aril texture
Composition/framing: 1:1, centred crop-safe bowl, a few intact blades rising for silhouette, generous padding
Lighting/mood: luminous side light, rare and floral
Color palette: coral-red, burnt orange, cream, mist blue and pale blush
Constraints: anatomically accurate mace arils; no package, text, logo or watermark
Avoid: chilli flakes, flower petals, seafood coral, oversaturation
```

#### #64 -> Mace macro

**Path:** `aranya-next/public/images/products/mace-blades/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme close-up of one dried mace blade showing its branching lacy structure and fine wrinkled surface
Scene/backdrop: soft charcoal stone
Style/medium: botanical macro food photography, realistic and precise
Composition/framing: square, single blade arcs through centre with shallow supporting forms
Lighting/mood: focused warm edge light, jewel-like but natural
Constraints: no text, logo or watermark
Avoid: red chilli, saffron threads, flower petal, plastic translucence
```

#### #65 -> Nutmeg-and-mace origin view

**Path:** `aranya-next/public/images/products/mace-blades/03-origin.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce botanical gallery image
Primary request: a freshly opened nutmeg fruit revealing the glossy seed wrapped in vivid red mace, beside several dried coral mace blades
Scene/backdrop: pale honed stone with one natural leaf
Style/medium: premium botanical food still life with accurate anatomy
Composition/framing: square, opened fruit central, dried product forms a restrained arc, crop-safe margins
Lighting/mood: clear diffused daylight, educational and surprising
Constraints: realistic Myristica fragrans fruit; no text, logo or watermark
Avoid: peach, lychee, fantasy fruit, excessive leaves
```

#### #66 -> Packaging view

**Path:** `aranya-next/public/images/products/mace-blades/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: sculptural mace blades visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: mist-blue plaster with a slim pale stone plinth
Style/medium: high-end square catalogue photography, realistic glass, paper and delicate spice
Composition/framing: centred jar, pouch behind, full silhouettes and generous padding
Lighting/mood: soft sculpted studio light
Color palette: coral, cream, antique brass, mist blue and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.6 Ground Ginger

#### #67 -> Primary product image

**Path:** `aranya-next/public/images/products/ground-ginger/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `ground-ginger`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: fine pale-gold ground ginger in a low terracotta bowl with a sliced cured ginger rhizome beside it
Scene/backdrop: dusty teal and warm-cream studio planes
Style/medium: premium square food product photography with realistic fine powder and fibrous root
Composition/framing: 1:1, centred crop-safe bowl, simple silhouette and generous margins
Lighting/mood: bright warm side light, lively and clean
Color palette: ginger sand, terracotta, dusty teal and cream
Constraints: no package, text, logo or watermark
Avoid: turmeric-yellow powder, fresh wet ginger heap, powder explosion
```

#### #68 -> Ginger macro

**Path:** `aranya-next/public/images/products/ground-ginger/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: macro view of fine ground ginger with a small scoop trail, showing warm beige granules and natural variation
Scene/backdrop: cream ceramic edge just visible
Style/medium: realistic macro food photography
Composition/framing: square, crisp central ridge and soft falloff
Lighting/mood: low warm raking light, dry and aromatic
Constraints: pale sandy colour; no text, logo or watermark
Avoid: beach-dune effect, turmeric colour, glitter, clumps
```

#### #69 -> Root-to-powder view

**Path:** `aranya-next/public/images/products/ground-ginger/03-process.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient-process image
Primary request: dried sliced ginger and one fibrous broken rhizome arranged beside freshly milled pale ground ginger
Scene/backdrop: cool pale stone with muted teal cloth edge
Style/medium: refined overhead botanical food still life
Composition/framing: square, clean central progression from root and slices to powder, generous crop-safe space
Lighting/mood: diffused morning light, transparent and fresh
Constraints: no infographic arrows, text, logo or watermark
Avoid: turmeric, lemon, excessive greenery, messy spill
```

#### #70 -> Packaging view

**Path:** `aranya-next/public/images/products/ground-ginger/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: pale ground ginger visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: dusty-teal to warm-cream plaster sweep
Style/medium: high-end square catalogue photography with realistic glass, paper and powder
Composition/framing: centred jar, pouch behind and one dried ginger slice at base, full silhouettes and padding
Lighting/mood: clean softbox daylight
Color palette: ginger sand, cream, antique brass, dusty teal and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.7 Ceylon Curry Powder

#### #71 -> Primary product image

**Path:** `aranya-next/public/images/products/ceylon-curry-powder/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `ceylon-curry-powder`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: dark-roasted Ceylon curry powder in a shallow hammered-brass bowl, rich umber rather than bright red
Scene/backdrop: warm cream and charcoal studio planes with one subtle clay accent
Style/medium: premium square food product photography, realistic toasted powder texture
Composition/framing: 1:1, centred crop-safe bowl, small controlled whole-spice clues and generous margins
Lighting/mood: moody amber side light, deep and complex
Color palette: roasted umber, brass, cream, charcoal and clay
Constraints: no package, prepared curry, text, logo or watermark
Avoid: chilli-red masala, ingredient chaos, powder cloud, generic curry leaves everywhere
```

#### #72 -> Roasted blend macro

**Path:** `aranya-next/public/images/products/ceylon-curry-powder/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: macro view across dark-roasted Ceylon curry powder showing fine grain, toasted flecks and a clean scoop furrow
Scene/backdrop: brass bowl rim softly visible
Style/medium: realistic macro food photography
Composition/framing: square, central ridge in sharp detail with warm falloff
Lighting/mood: raking amber light, smoky and aromatic
Constraints: deep natural brown, no text, logo or watermark
Avoid: burnt ash, cocoa, red chilli colour, glitter
```

#### #73 -> Whole-spice composition

**Path:** `aranya-next/public/images/products/ceylon-curry-powder/03-ingredients.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: the roasted whole-spice foundation of Ceylon curry powder: coriander, cumin, fennel, black pepper, cloves and thin cinnamon beside the finished blend
Scene/backdrop: dark honed stone
Style/medium: disciplined overhead culinary still life
Composition/framing: square, ingredients grouped in a clean circular rhythm around one central bowl, crop-safe
Lighting/mood: warm focused side light, explanatory but editorial
Constraints: only plausible listed ingredients; no text, arrows, logo or watermark
Avoid: star anise, bright chilli, turmeric dominating, messy scatter
```

#### #74 -> Packaging view

**Path:** `aranya-next/public/images/products/ceylon-curry-powder/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: dark Ceylon curry powder visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: charcoal-to-clay plaster sweep
Style/medium: high-end square catalogue photography, realistic glass, paper and powder
Composition/framing: centred jar with pouch behind, full silhouettes, generous padding and grounded shadow
Lighting/mood: controlled warm studio light
Color palette: roasted umber, cream, antique brass, charcoal and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.8 Kandyan Garam Masala

#### #75 -> Primary product image

**Path:** `aranya-next/public/images/products/kandyan-garam-masala/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `kandyan-garam-masala`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: hand-ground Kandyan garam masala in a low matte-black bowl, warm brown with visible fine spice variation
Scene/backdrop: muted burgundy and warm-cream studio planes
Style/medium: premium square food product photography with tactile powder detail
Composition/framing: 1:1, centred crop-safe bowl, a restrained cardamom pod and clove clue, generous margins
Lighting/mood: sculpted warm side light, perfumed and celebratory
Color palette: warm brown, burgundy, cream, charcoal and a cardamom-green accent
Constraints: no package, prepared food, text, logo or watermark
Avoid: bright red curry powder, star anise cliché, excessive ingredient scatter
```

#### #76 -> Blend macro

**Path:** `aranya-next/public/images/products/kandyan-garam-masala/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme macro of freshly hand-ground garam masala showing a fine warm-brown matrix with subtle darker clove and cardamom flecks
Scene/backdrop: matte-black bowl fills the frame
Style/medium: realistic macro food photography
Composition/framing: square, one crisp scoop ridge through centre with shallow depth
Lighting/mood: low amber raking light, warm and floral
Constraints: no text, logo or watermark
Avoid: chilli-red powder, glitter, coarse seed mix, cocoa appearance
```

#### #77 -> Whole-spice composition

**Path:** `aranya-next/public/images/products/kandyan-garam-masala/03-ingredients.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: the aromatic whole-spice foundation of Kandyan garam masala—green cardamom, cloves, thin Ceylon cinnamon, black pepper, cumin and nutmeg—beside the finished blend
Scene/backdrop: pale travertine with one muted burgundy cloth edge
Style/medium: elegant overhead culinary still life
Composition/framing: square, finished bowl central and whole spices arranged with restraint inside crop-safe middle
Lighting/mood: soft warm morning light, layered and fragrant
Constraints: no text, diagram arrows, logo or watermark
Avoid: star anise, bright chilli, ingredient overload, generic Indian styling
```

#### #78 -> Packaging view

**Path:** `aranya-next/public/images/products/kandyan-garam-masala/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: warm-brown Kandyan garam masala visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: muted burgundy-to-warm-grey plaster sweep
Style/medium: high-end square catalogue photography, realistic glass, paper and powder
Composition/framing: centred jar with pouch behind, full silhouettes and generous padding
Lighting/mood: controlled warm studio light with soft brass highlight
Color palette: burgundy, warm brown, cream, antique brass and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```


### 9.9 Green Cardamom Pods

#### #79 -> Primary product image

**Path:** `aranya-next/public/images/products/green-cardamom-pods/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `green-cardamom-pods`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: premium green cardamom pods heaped in a shallow charcoal ceramic bowl with several pods scattered naturally
Scene/backdrop: muted blush plaster and warm-cream studio surface
Style/medium: crisp square food product photography with realistic ribbed pod texture
Composition/framing: 1:1, centred crop-safe bowl, clear silhouette, generous margins
Lighting/mood: cool fresh daylight with warm shadow, floral and lifted
Color palette: natural cardamom sage, charcoal, blush and cream
Constraints: accurate pods, no package, text, logo or watermark
Avoid: peas, neon green, excessive leaves, wet artificial shine
```

#### #80 -> Pod macro

**Path:** `aranya-next/public/images/products/green-cardamom-pods/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: opened green cardamom pod in extreme close-up, showing dark aromatic seeds inside the pale green ribbed husk
Scene/backdrop: soft warm stone
Style/medium: scientifically believable macro food photography
Composition/framing: square, opened pod centred with two closed pods receding softly
Lighting/mood: precise filtered daylight, fresh and perfumed
Constraints: realistic seed scale and pod anatomy; no text, logo or watermark
Avoid: oversized black beads, peas, synthetic colour
```

#### #81 -> Crushed cardamom view

**Path:** `aranya-next/public/images/products/green-cardamom-pods/03-crushed.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: freshly crushed cardamom seeds and split green pods in a small brass mortar
Scene/backdrop: pale cream stone with one muted coral textile corner
Style/medium: premium culinary still-life photography
Composition/framing: square, centred mortar, restrained scatter contained within crop-safe middle
Lighting/mood: warm side light, aromatic and active
Constraints: no unrelated spices, text, logo or watermark
Avoid: ground green powder, decorative overload, floating particles
```

#### #82 -> Packaging view

**Path:** `aranya-next/public/images/products/green-cardamom-pods/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: green cardamom pods visible through a clear glass spice jar beside a matte cream presentation pouch
Scene/backdrop: pale sage-to-cream plaster sweep
Style/medium: high-end square catalogue photography, realistic glass, paper and pods
Composition/framing: centred jar with pouch behind, full clean silhouettes and generous padding
Lighting/mood: bright diffused studio daylight
Color palette: cardamom sage, cream, antique brass and restrained forest-green trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.10 Whole Cloves

#### #83 -> Primary product image

**Path:** `aranya-next/public/images/products/whole-cloves/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `whole-cloves`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: aromatic whole cloves piled in a low pale-stone bowl, each nail-shaped bud crisp and recognisable
Scene/backdrop: warm clay and soft cream studio planes
Style/medium: premium square food product photography with honest dried texture
Composition/framing: 1:1, centred crop-safe bowl with a small controlled scatter and generous margins
Lighting/mood: warm directional light, intense and refined
Color palette: clove brown, cocoa, terracotta and cream
Constraints: no package, text, logo or watermark
Avoid: star anise, coffee beans, burned-black cloves, rustic clutter
```

#### #84 -> Clove macro

**Path:** `aranya-next/public/images/products/whole-cloves/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme macro of several whole cloves showing wrinkled stems and intact flower-bud crowns
Scene/backdrop: muted warm-grey stone
Style/medium: realistic macro food photography with shallow depth of field
Composition/framing: square, one perfect clove diagonal at centre, others form soft rhythm
Lighting/mood: raking amber light, concentrated and tactile
Constraints: botanically accurate; no text, logo or watermark
Avoid: nails, star anise, glossy oil coating
```

#### #85 -> Freshly ground cloves

**Path:** `aranya-next/public/images/products/whole-cloves/03-milled.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: a small mound of freshly ground cloves beside a few whole buds and a dark stone pestle
Scene/backdrop: pale limestone surface
Style/medium: restrained overhead culinary still life
Composition/framing: square, central powder mound with minimal supporting forms and clean space
Lighting/mood: soft side light, warm and potent
Constraints: deep warm-brown powder; no text, logo or watermark
Avoid: cocoa appearance, spice medley, powder clouds
```

#### #86 -> Packaging view

**Path:** `aranya-next/public/images/products/whole-cloves/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: whole cloves visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: warm terracotta-to-cream plaster sweep
Style/medium: high-end square catalogue photography with realistic glass, paper and dried buds
Composition/framing: jar centred, pouch slightly behind, clean full silhouettes and generous padding
Lighting/mood: controlled softbox light and grounded shadow
Color palette: clove brown, cream, antique brass, terracotta and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.11 Whole Nutmeg

#### #87 -> Primary product image

**Path:** `aranya-next/public/images/products/whole-nutmeg/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `whole-nutmeg`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: whole Sri Lankan nutmeg seeds in a shallow dusty-blue ceramic bowl, one seed cut to reveal its marbled interior
Scene/backdrop: warm cream studio surface with muted apricot backdrop
Style/medium: premium square ingredient photography, crisp natural shell texture
Composition/framing: 1:1, centred crop-safe bowl, cut seed faces camera, generous padding
Lighting/mood: soft morning side light, warm and quietly complex
Color palette: nutmeg brown, cream, dusty blue and apricot
Constraints: no package, mace shell around every seed, text, logo or watermark
Avoid: walnuts, acorns, polished wooden balls, clutter
```

#### #88 -> Nutmeg macro

**Path:** `aranya-next/public/images/products/whole-nutmeg/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme macro of a freshly split nutmeg seed showing the intricate cream-and-brown marbled cross-section
Scene/backdrop: charcoal stone
Style/medium: realistic macro food photography, botanical precision
Composition/framing: square, cross-section dominant at centre with intact seed softly behind
Lighting/mood: focused raking light, fascinating and tactile
Constraints: accurate nutmeg anatomy; no text, logo or watermark
Avoid: brain-like exaggeration, chocolate truffle appearance, artificial symmetry
```

#### #89 -> Freshly grated nutmeg

**Path:** `aranya-next/public/images/products/whole-nutmeg/03-grated.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: whole nutmeg being freshly grated on a small fine brass grater, with a delicate mound of warm shavings
Scene/backdrop: pale travertine worktop
Style/medium: premium culinary process still life
Composition/framing: square, grater and nutmeg central, shavings clearly visible, minimal crop-safe arrangement
Lighting/mood: warm window light, fragrant and immediate
Constraints: natural hand optional; no text, logo or watermark
Avoid: cheese grater scale, cinnamon sticks, messy ingredient scatter
```

#### #90 -> Packaging view

**Path:** `aranya-next/public/images/products/whole-nutmeg/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: whole nutmeg seeds visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: dusty-blue and warm-grey plaster sweep
Style/medium: high-end square catalogue photography, realistic glass, paper and seed texture
Composition/framing: centred jar with pouch behind and one split nutmeg at base, full silhouettes and padding
Lighting/mood: soft sculpted studio light
Color palette: nutmeg brown, cream, antique brass, dusty blue and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

### 9.12 Black Peppercorns

#### #91 -> Primary product image

**Path:** `aranya-next/public/images/products/black-peppercorns/01-primary.webp`
**Placement:** All product cards/thumbnails and gallery view 1 for `black-peppercorns`.

```text
Use case: product-mockup
Asset type: reusable ecommerce product hero
Primary request: hill-country black peppercorns heaped in a warm cream ceramic bowl with a small natural scatter
Scene/backdrop: charcoal and muted mist-blue studio planes
Style/medium: premium square food product photography with crisp wrinkled pepper texture
Composition/framing: 1:1, centred crop-safe bowl, strong simple silhouette and generous padding
Lighting/mood: cool directional light with warm edge highlights, sharp and floral
Color palette: charcoal, cream, mist blue and muted bronze
Constraints: no grinder or package, text, logo or watermark
Avoid: coffee beans, perfectly uniform spheres, glossy plastic appearance
```

#### #92 -> Peppercorn macro

**Path:** `aranya-next/public/images/products/black-peppercorns/02-detail.webp`
**Placement:** Product gallery view 2.

```text
Use case: photorealistic-natural
Asset type: ecommerce macro gallery image
Primary request: extreme macro of premium black peppercorns showing varied wrinkled skins and subtle brown-black tones
Scene/backdrop: dark honed stone
Style/medium: realistic macro food photography, shallow depth of field
Composition/framing: square, one peppercorn cluster crisp at centre, natural irregularity
Lighting/mood: raking side light, potent and mineral
Constraints: no text, logo or watermark
Avoid: caviar, coffee beans, wet gloss, uniform CGI repetition
```

#### #93 -> Freshly cracked pepper

**Path:** `aranya-next/public/images/products/black-peppercorns/03-cracked.webp`
**Placement:** Product gallery view 3.

```text
Use case: photorealistic-natural
Asset type: ecommerce ingredient gallery image
Primary request: freshly cracked black pepper in a small stone mortar, revealing pale interiors among dark husks
Scene/backdrop: warm cream limestone
Style/medium: refined culinary process still life
Composition/framing: square, mortar central with pestle resting diagonally and restrained whole peppercorn scatter
Lighting/mood: warm focused window light, immediate and aromatic
Constraints: no text, logo or watermark
Avoid: fine grey dust only, salt, spice medley, floating particles
```

#### #94 -> Packaging view

**Path:** `aranya-next/public/images/products/black-peppercorns/04-packaging.webp`
**Placement:** Product gallery view 4.

```text
Use case: product-mockup
Asset type: premium ecommerce packaging image
Primary request: black peppercorns visible through a clear glass spice jar beside a matte cream pouch
Scene/backdrop: charcoal-to-mist-blue plaster sweep
Style/medium: high-end square catalogue photography with realistic glass, paper and pepper texture
Composition/framing: jar centred, pouch behind, full silhouettes, generous padding and grounded shadow
Lighting/mood: controlled cool studio light with brass highlights
Color palette: charcoal, cream, antique brass, mist blue and forest trim
Constraints: blank labels, no readable text, logo or watermark; packaging matches the range
```

## 10. Legacy `seed.ts` product records

These three active seed records use explicit demo Cloudinary URLs and can appear in the live storefront if `backend/prisma/seed.ts` is used. They are separate from the 12-product catalogue above. The four paths per product cover the same reusable primary plus four-view gallery pattern.

### 10.1 Ceylon True Cinnamon (`ceylon-true-cinnamon`)

#### #95 -> Primary product image

**Path:** `aranya-next/public/images/products/ceylon-true-cinnamon/01-primary.webp`
**Replaces seeded dummy URL:** `https://res.cloudinary.com/demo/image/upload/cinnamon.jpg`

```text
Use case: product-mockup
Asset type: reusable square ecommerce hero
Primary request: delicate true Ceylon cinnamon quills from Matale arranged in a low cream bowl, one bundle tied with plain natural fibre
Scene/backdrop: muted terracotta and warm-cream seamless studio
Style/medium: premium realistic product photography with parchment-thin bark detail
Composition/framing: centred 1:1 crop-safe arrangement with generous padding for 4:5 card crops
Lighting/mood: soft amber side light, delicate and floral
Constraints: no thick cassia, package, readable text, logo or watermark
```

#### #96 -> Macro detail

**Path:** `aranya-next/public/images/products/ceylon-true-cinnamon/02-detail.webp`

```text
Use case: photorealistic-natural
Asset type: square ecommerce macro image
Primary request: extreme macro of true Ceylon cinnamon showing a fragile broken edge and many translucent nested layers
Scene/backdrop: soft charcoal stone
Composition/framing: square, layered cut end at centre, shallow depth of field
Lighting/mood: precise warm raking light
Constraints: botanically accurate; no text, logo or watermark
Avoid: thick single-scroll cassia, polished CGI symmetry
```

#### #97 -> Milled view

**Path:** `aranya-next/public/images/products/ceylon-true-cinnamon/03-milled.webp`

```text
Use case: photorealistic-natural
Asset type: square ecommerce ingredient image
Primary request: freshly milled pale Ceylon cinnamon in a small brass dish beside one thin quill
Scene/backdrop: pale honed stone with a dusty-blue accent
Style/medium: refined overhead food photography with realistic fine powder
Composition/framing: centred square arrangement, restrained and crop-safe
Lighting/mood: soft morning daylight
Constraints: no text, logo or watermark
Avoid: dark red cassia, decorative spice medley
```

#### #98 -> Packaging view

**Path:** `aranya-next/public/images/products/ceylon-true-cinnamon/04-packaging.webp`

```text
Use case: product-mockup
Asset type: premium square ecommerce packaging image
Primary request: true Ceylon cinnamon quills in a clear glass jar beside a matte cream pouch
Scene/backdrop: warm-grey plaster and walnut plinth
Composition/framing: jar centred, pouch behind, full silhouettes and generous padding
Lighting/mood: controlled softbox light, quiet luxury
Color palette: cream, forest trim, antique brass and pale cinnamon
Constraints: blank labels, packaging consistent with the Aranya range; no readable text, logo or watermark
```

### 10.2 Malabar Black Pepper (`malabar-black-pepper`)

#### #99 -> Primary product image

**Path:** `aranya-next/public/images/products/malabar-black-pepper/01-primary.webp`
**Replaces seeded dummy URL:** `https://res.cloudinary.com/demo/image/upload/pepper.jpg`

```text
Use case: product-mockup
Asset type: reusable square ecommerce hero
Primary request: aromatic Malabar black peppercorns heaped in a pale stone bowl with a small pepper vine cutting beside it
Scene/backdrop: charcoal and muted coastal-blue studio planes
Style/medium: premium realistic food product photography with crisp wrinkled texture
Composition/framing: centred 1:1 crop-safe bowl, simple silhouette and generous padding for 4:5 crops
Lighting/mood: cool directional light with warm edge highlights, bold and floral
Constraints: no package, text, logo or watermark
Avoid: coffee beans, glossy uniform spheres, Sri Lankan origin props for this Indian-origin seed item
```

#### #100 -> Macro detail

**Path:** `aranya-next/public/images/products/malabar-black-pepper/02-detail.webp`

```text
Use case: photorealistic-natural
Asset type: square ecommerce macro image
Primary request: extreme macro of premium black peppercorns showing irregular wrinkled skins and brown-black natural variation
Scene/backdrop: dark slate stone
Composition/framing: square, crisp central cluster with shallow depth
Lighting/mood: mineral side light, sharp and tactile
Constraints: no text, logo or watermark
Avoid: caviar, coffee beans, wet gloss, repeated CGI pattern
```

#### #101 -> Cracked view

**Path:** `aranya-next/public/images/products/malabar-black-pepper/03-cracked.webp`

```text
Use case: photorealistic-natural
Asset type: square ecommerce ingredient image
Primary request: freshly cracked Malabar pepper in a dark stone mortar, pale interiors and dark husks clearly visible
Scene/backdrop: warm cream limestone
Style/medium: restrained premium culinary still life
Composition/framing: centred square mortar with pestle diagonal and a controlled peppercorn scatter
Lighting/mood: focused warm window light
Constraints: no salt, text, logo or watermark
Avoid: fine grey dust, spice medley, floating particles
```

#### #102 -> Packaging view

**Path:** `aranya-next/public/images/products/malabar-black-pepper/04-packaging.webp`

```text
Use case: product-mockup
Asset type: premium square ecommerce packaging image
Primary request: Malabar black peppercorns visible in a clear glass jar beside a matte cream pouch
Scene/backdrop: charcoal-to-coastal-blue plaster sweep
Composition/framing: jar centred, pouch behind, full silhouettes and generous padding
Lighting/mood: controlled softbox light with brass highlights
Color palette: charcoal, cream, antique brass, muted blue and forest trim
Constraints: blank labels, packaging consistent with the Aranya range; no readable text, logo or watermark
```

### 10.3 Single Estate Ceylon Black Tea (`single-estate-ceylon-black-tea`)

#### #103 -> Primary product image

**Path:** `aranya-next/public/images/products/single-estate-ceylon-black-tea/01-primary.webp`
**Replaces seeded dummy URL:** `https://res.cloudinary.com/demo/image/upload/tea.jpg`

```text
Use case: product-mockup
Asset type: reusable square ecommerce hero
Primary request: long wiry high-grown Ceylon black tea leaves from the Uva Highlands in a low warm-cream porcelain bowl, with a copper-red cup of brewed tea behind
Scene/backdrop: muted burgundy and mist-blue studio planes
Style/medium: premium realistic tea product photography with crisp twisted-leaf texture
Composition/framing: centred 1:1 crop-safe bowl, cup secondary, generous padding for 4:5 card crops
Lighting/mood: luminous highland morning light, brisk and floral
Color palette: deep tea brown, copper red, cream, mist blue and burgundy
Constraints: no tea bag, package, readable text, logo or watermark
Avoid: green tea leaves, milky chai, tea-estate tourist imagery
```

#### #104 -> Dry-leaf macro

**Path:** `aranya-next/public/images/products/single-estate-ceylon-black-tea/02-detail.webp`

```text
Use case: photorealistic-natural
Asset type: square ecommerce macro image
Primary request: extreme macro of orthodox Ceylon black tea showing twisted whole leaf particles, copper tips and natural dry texture
Scene/backdrop: charcoal ceramic surface
Composition/framing: square, crisp central leaf ridge with shallow falloff
Lighting/mood: cool raking light with warm copper glints
Constraints: no text, logo or watermark
Avoid: uniform tea-bag dust, green leaves, wet gloss, CGI repetition
```

#### #105 -> Brewed liquor view

**Path:** `aranya-next/public/images/products/single-estate-ceylon-black-tea/03-brewed.webp`

```text
Use case: photorealistic-natural
Asset type: square ecommerce tasting image
Primary request: clear bright copper-red Ceylon black tea poured into a thin cream porcelain cup, dry leaves and infused leaves shown in two tiny dishes
Scene/backdrop: pale stone with muted blue-grey cloth edge
Style/medium: refined tea-tasting photography, precise and natural
Composition/framing: square, cup centred and dishes balanced behind, clean crop-safe arrangement
Lighting/mood: bright diffused daylight revealing liquor clarity
Constraints: no milk, lemon, text, logo or watermark
Avoid: chai styling, ornate colonial tea service, dark opaque coffee appearance
```

#### #106 -> Packaging view

**Path:** `aranya-next/public/images/products/single-estate-ceylon-black-tea/04-packaging.webp`

```text
Use case: product-mockup
Asset type: premium square ecommerce packaging image
Primary request: wiry Ceylon black tea visible in a clear glass jar beside a matte cream pouch
Scene/backdrop: mist-blue to muted-burgundy plaster sweep
Composition/framing: jar centred, pouch behind and a small cream tea cup at base, full silhouettes and generous padding
Lighting/mood: clean sculpted studio light
Color palette: tea brown, copper, cream, antique brass, mist blue and forest trim
Constraints: blank labels, packaging consistent with the Aranya range; no readable text, logo or watermark
```

## 11. Future CMS image template

The current journal adapter creates dynamic slot IDs in the form `post-{slug}` and `post-{slug}-body` for future backend posts. Those future subjects cannot be enumerated from the repository, so use this template whenever a new post is added.

**Path:** `aranya-next/public/images/journal/{slug}/cover.webp` or `aranya-next/public/images/journal/{slug}/body.webp`
**Slot ID:** `post-{slug}` or `post-{slug}-body`.

```text
Use case: photorealistic-natural
Asset type: Aranya Ceylon journal [cover hero / inline supporting photograph]
Primary request: [one concrete visual moment that directly expresses the article's central subject]
Scene/backdrop: authentic Sri Lankan spice-growing, cooking or craft context appropriate to the story
Subject: [specific person, ingredient, process or landscape; make the action explicit]
Style/medium: premium literary documentary photography, natural texture, restrained colour and subtle fine film grain
Composition/framing: wide 16:9, key subject inside the middle 60 percent, responsive crop safety; for a cover include calm darker space for white hero typography
Lighting/mood: believable natural light matching the story's emotional tone
Color palette: choose a varied, subject-led palette that harmonises with warm cream, forest green and antique gold without forcing every scene to be green or brown
Constraints: culturally and botanically plausible; no generated text, external branding, logo or watermark
Avoid: generic stock-photo staging, tourism clichés, colonial imagery, excessive colour grading, unrelated props
```

## Audit notes

- Existing hero animation frames and `public/hero/poster.webp` were treated as supplied media, not dummy images.
- SVG motifs, icons, CSS gradients and the procedural grain texture are interface artwork rather than photography placeholders, so they do not need image-generation prompts.
- Repeated uses of the same product, recipe or journal image are intentionally mapped to one master path rather than generating inconsistent duplicates.
- The frontend currently renders `SpicePhoto` instead of reading `Product.images`; implementing these files in the UI will require wiring the recommended paths (or uploaded CDN equivalents) into the product view model.
- `GiftBox` is also procedural at present; the five gift-set prompts above provide the real product photography needed to replace it.
