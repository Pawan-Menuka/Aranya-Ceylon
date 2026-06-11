/* Aranya Ceylon — Product Detail: gallery + buy-box (part 1).
   Reuses shared.jsx (Seal, Stars, Badge, SpicePhoto, Icon) + aranya.css primitives.
   Exports: PDContent, Breadcrumb, Gallery, BuyBox to window. */
const { useState: pdState } = React;

/* ---- per-product editorial content (keyed by spice name; generic fallback) ---- */
const PD_CONTENT = {
  "Ceylon Cinnamon": {
    tagline: "True cinnamon — paper-thin quills, hand-rolled at the source.",
    storyTitle: "Why true cinnamon tastes like nothing else",
    story: [
      "Cut only from <em>Cinnamomum verum</em>, the true cinnamon native to the wet hills of Matale, our quills are a world apart from the hard cassia that fills most supermarket jars. The inner bark is peeled in long ribbons while still supple, then rolled by hand into fragile, multi-layered quills that snap clean and dissolve to silk on the tongue.",
      "What you taste is warmth without bite — honeyed and floral, edged with clove and a whisper of citrus, never the blunt heat of cassia. Coumarin sits at a fraction of a percent, low enough to fold generously into daily cooking. This is cinnamon as the island has graded it for export since the days of the spice routes.",
    ],
    quote: "Grade your bark by the candle, not the colour — the truest quill lets the light through.",
    quoteBy: "Matale peeler's proverb",
    flavour: [["Aroma", 95], ["Sweetness", 84], ["Warmth", 70], ["Citrus", 48], ["Woody", 38]],
    specs: [
      ["Botanical name", "Cinnamomum verum"], ["Origin", "Matale Hills, Sri Lanka"],
      ["Harvest", "May – September (wet season peel)"], ["Grade", "ALBA — finest, thinnest quill"],
      ["Form", "Whole hand-rolled quills"], ["Cut", "5\" quills · also milled to order"],
      ["Certification", "GI Protected · Organic (EU/USDA)"], ["Shelf life", "24 months, sealed & cool"],
    ],
    pairings: ["Coconut & jaggery", "Black tea", "Slow-braised beef", "Apple & pear", "Rice pudding", "Dark chocolate", "Red wine", "Cardamom"],
    uses: [
      ["Sweet bakes", "A single quill steeped in milk perfumes custards, kiribath and rice pudding without graininess."],
      ["Hill-country curries", "Drop a quill whole into beef or chicken curry; it unfurls its oils slowly through the braise."],
      ["Brewed & warmed", "Snap into tea, mulled wine or arrack toddy — it dissolves far softer than cassia ever will."],
    ],
  },

  "Green Cardamom": {
    tagline: "Bright green pods, picked just shy of ripe, sealed before the oils can fade.",
    storyTitle: "The pod that has to be picked by hand",
    story: [
      "Cardamom hides low in the shade of the Kandyan forest, each pod ripening on its own clock, so the harvest is walked plant by plant and picked by hand — often the same plant three or four times a season. Snip it a touch early and the pod stays a vivid grass-green, locking the volatile oils inside before sun or heat can drive them off.",
      "Crack one open and the seeds are near-black and sticky with resin. The flavour is cool and almost eucalyptic up front, then turns sweet, citrus-floral and faintly piney — the camphor note that makes it as at home in a Sinhala chicken curry as in cardamom buns and spiced coffee. Whole pods keep that intensity for a year; ground, it begins to flatten within weeks, which is why we ship the pods sealed and let you grind to order.",
    ],
    quote: "Pick it green and you keep the perfume; wait for gold and it has already half escaped.",
    quoteBy: "Kandy estate picker",
    flavour: [["Aroma", 96], ["Citrus", 78], ["Sweetness", 60], ["Camphor", 66], ["Warmth", 52]],
    specs: [
      ["Botanical name", "Elettaria cardamomum"], ["Origin", "Kandy District, Sri Lanka"],
      ["Harvest", "August – February (hand-picked in passes)"], ["Grade", "AGEB — bold green, 7mm+"],
      ["Form", "Whole green pods"], ["Cut", "Whole pods · seeds milled to order"],
      ["Certification", "GI Protected · Organic (EU/USDA)"], ["Shelf life", "18 months whole, sealed & cool"],
    ],
    pairings: ["Black coffee", "Basmati rice", "Chicken curry", "Saffron & milk", "Orange & honey", "Cardamom buns", "Chai", "Pistachio"],
    uses: [
      ["Bruise & bloom", "Press pods with the flat of a knife and toast in ghee to open the curry's aroma from the very first minute."],
      ["Sweet & milky", "Steep cracked pods in warming milk, kheer or ice-cream base, then lift them out before serving."],
      ["Grind fresh", "Husk and grind only the seeds you need — the powder loses its top-notes within days of milling."],
    ],
  },

  "Whole Cloves": {
    tagline: "Sun-dried flower buds, picked at the blush of pink, heavy with oil.",
    storyTitle: "A spice that is really an unopened flower",
    story: [
      "A clove is a flower bud caught at the last possible moment — picked while still closed and faintly pink at Kegalle's lower elevations, then sun-dried on mats until it darkens to deep mahogany and rattles dry in the hand. Timing is everything: a day too late and the bud opens, the oil thins, and the spice loses the punch it is prized for.",
      "Press a good clove with a fingernail and it should weep a little oil — that eugenol is what gives cloves their warm, sweet, almost medicinal heat and their faint numbing tingle on the tongue. A pinch carries enormous distance, which is why they perfume everything from Sri Lankan beef curry to mulled wine and clove-studded hams. Stored whole and away from light, they hold their fire for years.",
    ],
    quote: "A clove that does not bleed oil under the nail was dried a day too long.",
    quoteBy: "Kegalle grower",
    flavour: [["Aroma", 92], ["Warmth", 88], ["Sweetness", 58], ["Pungency", 80], ["Woody", 46]],
    specs: [
      ["Botanical name", "Syzygium aromaticum"], ["Origin", "Kegalle, Sri Lanka"],
      ["Harvest", "December – February (picked at pink bud)"], ["Grade", "Hand-sorted, headed buds"],
      ["Form", "Whole sun-dried buds"], ["Cut", "Whole · milled to order"],
      ["Certification", "GI Protected · Organic (EU/USDA)"], ["Shelf life", "36 months whole, sealed & cool"],
    ],
    pairings: ["Beef & game", "Mulled wine", "Baked ham", "Cinnamon & cardamom", "Orange", "Rice pilau", "Dark stocks", "Apple"],
    uses: [
      ["Stud & braise", "Push a few whole into onion or ham and lift them out after cooking — they give heat without grit."],
      ["Toast for curry powder", "Dry-roast with coriander and cumin, then grind: the backbone of a Sri Lankan black curry blend."],
      ["Infuse slowly", "Drop two or three into mulled wine, stock or rice as it simmers; one clove too many will dominate."],
    ],
  },

  "Whole Nutmeg": {
    tagline: "Whole seeds in their lacy red mace, grated fresh for ten times the aroma.",
    storyTitle: "One fruit, two spices",
    story: [
      "Nutmeg arrives wrapped in a secret: split the apricot-like fruit grown across Sabaragamuwa and you find the brown seed cradled in a scarlet lace of mace — two distinct spices from a single pod. The seeds are cured slowly in the shade for weeks until the kernel rattles loose inside its shell, then cracked and sorted whole so none of the oil is lost to pre-grinding.",
      "Grated fresh, nutmeg is a different spice entirely from the dusty pre-ground tin — warm, sweet and woody with a resinous, almost piney depth that blooms the instant it hits heat. A few passes over a microplane is all a béchamel, a custard or a pumpkin curry needs. Kept whole, a single seed lasts years; ground, that aroma is mostly gone within a month.",
    ],
    quote: "Buy it whole and grate it warm — pre-ground nutmeg is just the memory of the spice.",
    quoteBy: "Sabaragamuwa curer",
    flavour: [["Aroma", 90], ["Warmth", 76], ["Sweetness", 64], ["Woody", 70], ["Resinous", 58]],
    specs: [
      ["Botanical name", "Myristica fragrans"], ["Origin", "Sabaragamuwa, Sri Lanka"],
      ["Harvest", "Year-round, peak June – August"], ["Grade", "Sound, whole — 8+ per 10g"],
      ["Form", "Whole cured seeds"], ["Cut", "Whole seed · grate fresh"],
      ["Certification", "GI Protected · Organic (EU/USDA)"], ["Shelf life", "36 months whole, sealed & cool"],
    ],
    pairings: ["Béchamel & gratin", "Spinach & greens", "Custard & eggnog", "Pumpkin", "Lamb", "Dark rum", "Potato", "Cinnamon"],
    uses: [
      ["Grate to finish", "A few passes over a microplane onto white sauce, mash or custard at the very end keeps the aroma alive."],
      ["Warm the dairy", "Nutmeg loves fat — milk, cream and butter carry it best, blooming as the dish heats."],
      ["Curry & spice blends", "A small grating deepens Sri Lankan meat curries and homemade garam-style blends without taking over."],
    ],
  },

  "Black Peppercorns": {
    tagline: "Vine-ripened berries, sun-dried whole until the skin wrinkles black and hot.",
    storyTitle: "The king of spices, grown in the mist",
    story: [
      "Pepper climbs the shade trees of the hill country on long vines, the berries ripening in tight green spikes that are picked just as the first few flush red. Dried whole in the sun, the skins shrink and blacken around the seed, trapping the piperine and aromatic oils that make hill-country pepper hotter and more fragrant than the bulk pepper of the lowlands.",
      "There is heat here, but it arrives with company — pine, citrus, wood and a floral lift that you only notice when the corns are cracked fresh rather than bought as tired pre-ground dust. That is the whole case for buying it whole: piperine fades fast once the berry is broken, so a few twists from the mill over the finished plate carry far more punch than a spoon of powder ever could.",
    ],
    quote: "Crack it at the table — pepper ground yesterday is already half asleep.",
    quoteBy: "Hill Country smallholder",
    flavour: [["Pungency", 94], ["Aroma", 80], ["Citrus", 54], ["Woody", 62], ["Floral", 44]],
    specs: [
      ["Botanical name", "Piper nigrum"], ["Origin", "Hill Country, Sri Lanka"],
      ["Harvest", "January – March (sun-dried whole)"], ["Grade", "FAQ-bold, 550+ g/l density"],
      ["Form", "Whole black peppercorns"], ["Cut", "Whole · cracked to order"],
      ["Certification", "GI Protected · Organic (EU/USDA)"], ["Shelf life", "36 months whole, sealed & cool"],
    ],
    pairings: ["Beef steak", "Eggs", "Strawberry", "Hard cheese", "Cream sauces", "Cured meats", "Pineapple", "Citrus"],
    uses: [
      ["Crack to finish", "A coarse grind over steak, eggs or fresh fruit at the last second keeps the floral top-notes intact."],
      ["Toast then grind", "Dry-roast whole corns before grinding into curry powders to round the heat and deepen the aroma."],
      ["Whole in the pot", "Drop a spoon of whole corns into stocks, pickles and slow braises for warmth without sharp bite."],
    ],
  },

  "Ground Turmeric": {
    tagline: "Boiled, sun-dried and stone-milled rhizomes — deep gold, high in curcumin.",
    storyTitle: "The gold that has to be cured before it can be ground",
    story: [
      "Turmeric does not become turmeric in the ground — the freshly dug rhizomes from the Southern Province are first boiled, then sun-dried for a week or more until they turn hard, brittle and deep orange-gold inside. Only then are they stone-milled to the fine, fragrant powder that stains everything it touches, the curing step that fixes the colour and concentrates the curcumin we test each lot for.",
      "Good turmeric is earthy and warm with a faintly bitter, peppery edge and a mustard-gold colour so saturated it tints oil on contact. It is the quiet base note of almost every Sri Lankan curry — bloomed in hot oil before anything else goes in — as much as it is the golden-milk and wellness spice the world now reaches for. Bought fresh and milled small, it keeps both its colour and its gentle bite.",
    ],
    quote: "Bloom it in oil first — raw turmeric stirred in late only tastes of dust.",
    quoteBy: "Southern Province miller",
    flavour: [["Earthy", 88], ["Warmth", 62], ["Bitterness", 58], ["Pungency", 50], ["Aroma", 66]],
    specs: [
      ["Botanical name", "Curcuma longa"], ["Origin", "Southern Province, Sri Lanka"],
      ["Harvest", "January – March (cured & stone-milled)"], ["Grade", "High-curcumin, 3.5%+"],
      ["Form", "Stone-ground powder"], ["Cut", "Fine powder"],
      ["Certification", "GI Protected · Organic (EU/USDA)"], ["Shelf life", "18 months, sealed & cool"],
    ],
    pairings: ["Coconut milk", "Lentils & dhal", "Rice", "Cauliflower", "Ginger & garlic", "Golden milk", "Eggs", "White fish"],
    uses: [
      ["Bloom in oil", "Stir into hot oil with onions at the start of a curry so the colour and earthiness develop before the rest goes in."],
      ["Golden milk", "Whisk a small spoon into warm milk with pepper and honey — black pepper helps the body take up the curcumin."],
      ["Stain & season", "A pinch turns rice, dhal and roast vegetables a warm gold while adding a gentle, savoury depth."],
    ],
  },
};
function pdContent(spice) {
  return PD_CONTENT[spice.name] || {
    tagline: spice.latin + " — single-origin, shipped at peak aroma.",
    storyTitle: "Single-origin, shipped at peak aroma",
    story: [
      "Sourced from " + spice.origin + " and graded for export, this " + spice.name.toLowerCase() + " reaches you within weeks of harvest — not years of warehousing. Aroma is the whole point, and aroma fades, so we move fast and ship small.",
      "Single-origin means a single character: no blending, no bulking, no anonymity. What grew on one hillside arrives in one jar.",
    ],
    quote: "Spice, as the forest intended.",
    quoteBy: "Aranya Ceylon",
    flavour: [["Aroma", 90], ["Sweetness", 55], ["Warmth", 60], ["Citrus", 45], ["Woody", 50]],
    specs: [
      ["Botanical name", spice.latin], ["Origin", spice.origin],
      ["Harvest", "Seasonal, hand-picked"], ["Grade", "Export select"],
      ["Form", "Whole, milled to order"], ["Certification", "GI Protected · Organic"],
      ["Shelf life", "24 months, sealed & cool"], ["Packed", "Resealable kraft pouch"],
    ],
    pairings: ["Rice", "Coconut", "Black tea", "Slow braises", "Root vegetables", "Citrus"],
    uses: [
      ["Everyday cooking", "Bloom in oil at the start of a dish to release its essential oils."],
      ["Finishing", "Grind fresh over the plate to keep the volatile top-notes alive."],
      ["Infusions", "Steep gently in warm liquid — never boil hard, or the aromatics flash off."],
    ],
  };
}

/* ---- price helpers: data price is the 100g price; derive 50g / 250g ---- */
const PD_MULT = { "50g": 0.6, "100g": 1, "250g": 2.3 };
function pdParse(str) { return parseFloat(str.replace(/[^0-9.]/g, "")); }
function pdFmt(spice, market, n) {
  if (market === "local") return "Rs " + Math.round(n).toLocaleString("en-US");
  return "$" + n.toFixed(2);
}
function pdPrice(spice, market, weight) {
  const base = pdParse(market === "local" ? spice.lkr : spice.usd);
  return pdFmt(spice, market, base * PD_MULT[weight]);
}
/* real variant pricing: look up from spice.variants (live API); fall back to multiplier */
function pdPriceReal(spice, market, wStr) {
  const currency = market === "local" ? "LKR" : "USD";
  const w = parseInt(wStr);
  const v = (spice.variants || []).find((v) => v.weight === w && v.currency === currency)
         || (spice.variants || []).find((v) => v.weight === w);
  if (v) return pdFmt(spice, market, parseFloat(v.price));
  return pdPrice(spice, market, wStr);
}

/* ============ Breadcrumb ============ */
function Breadcrumb({ spice }) {
  const sep = <span style={{ color: "var(--line)", margin: "0 9px" }}>/</span>;
  const link = (t) => <a href="#" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".02em" }}>{t}</a>;
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 40px 0", display: "flex", alignItems: "center" }}>
      {link("Shop")}{sep}{link("Whole Spices")}{sep}
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{spice.name}</span>
    </div>
  );
}

/* ============ Gallery — main photo + thumbnail rail ============ */
function Gallery({ spice }) {
  // build subtle visual variants so thumbs read as different shots
  const variants = [
    spice,
    { ...spice, base: spice.deep, deep: spice.color },
    { ...spice, surface: "#EFE7D8", base: spice.color, deep: spice.deep },
    { ...spice, base: spice.surface, deep: spice.base, surface: spice.surface },
  ];
  const labels = ["Whole quills", "Detail", "Milled", "In the jar"];
  const [i, setI] = pdState(0);
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* thumbnail rail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 78, flex: "0 0 auto" }}>
        {variants.map((v, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={labels[k]} style={{
            padding: 0, border: k === i ? "2px solid var(--brand)" : "1px solid var(--line)", borderRadius: 5,
            overflow: "hidden", cursor: "pointer", background: "none", boxShadow: k === i ? "var(--shadow-sm)" : "none" }}>
            <SpicePhoto spice={v} ratio="1 / 1" label={false} />
          </button>
        ))}
      </div>
      {/* main image */}
      <div style={{ position: "relative", flex: 1, borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        <SpicePhoto spice={variants[i]} ratio="1 / 1" label={true} />
        <div style={{ position: "absolute", top: 16, left: 16 }}><Badge kind={spice.badge} solid /></div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: spice.color }} />
        <div style={{ position: "absolute", bottom: 14, right: 16, fontFamily: "var(--font-ui)", fontSize: 11,
          fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>{labels[i]}</div>
      </div>
    </div>
  );
}

/* ============ Quantity stepper ============ */
function Qty({ q, setQ }) {
  const btn = (t, fn, dis) => (
    <button onClick={fn} disabled={dis} aria-label={t === "−" ? "Decrease" : "Increase"} style={{
      width: 42, height: 46, border: 0, background: "none", cursor: dis ? "default" : "pointer",
      fontFamily: "var(--font-ui)", fontSize: 19, color: dis ? "var(--line)" : "var(--ink)", lineHeight: 1 }}>{t}</button>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, background: "#fff" }}>
      {btn("−", () => setQ(Math.max(1, q - 1)), q <= 1)}
      <span style={{ width: 34, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700 }}>{q}</span>
      {btn("+", () => setQ(Math.min(99, q + 1)), false)}
    </div>
  );
}

/* ============ BuyBox — purchase panel ============ */
function BuyBox({ spice, market }) {
  const c = pdContent(spice);
  const weights = spice.weights && spice.weights.length ? spice.weights : ["50g", "100g", "250g"];
  const [weight, setWeight] = pdState(() => weights.includes("100g") ? "100g" : weights[0]);
  const [grind, setGrind] = pdState("Whole");
  const [q, setQ] = pdState(1);
  const [saved, setSaved] = pdState(false);
  const [added, setAdded] = pdState(false);
  const onAdd = () => {
    if (window.AranyaCart) window.AranyaCart.add(spice, weight, grind, q);
    if (window.__openCart) window.__openCart();
    setAdded(true); setTimeout(() => setAdded(false), 1400);
  };
  const isLocal = market === "local";
  const accent = isLocal ? "var(--brand)" : "var(--accent)";

  return (
    <div className="aranya" style={{ maxWidth: 480 }}>
      {/* origin + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 9, background: spice.color }} />
        <span className="eyebrow" style={{ color: "var(--muted)" }}>{spice.origin}</span>
      </div>
      <h1 className="disp" style={{ fontSize: 46, color: "var(--ink)", margin: 0, lineHeight: 1.02, letterSpacing: ".005em" }}>{spice.name}</h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 19, color: "var(--muted)", margin: "4px 0 16px" }}>{spice.latin}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Stars rating={spice.rating} reviews={spice.reviews} size={16} />
        <a href="#reviews" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>Read reviews</a>
      </div>

      <p className="prose" style={{ fontSize: 16.5, color: "var(--ink)", margin: "0 0 22px", maxWidth: 460 }}>{c.tagline}</p>

      <div style={{ height: 1, background: "var(--line)", margin: "0 0 22px" }} />

      {/* price */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 22 }}>
        <span className="disp" style={{ fontSize: 42, color: "var(--ink)", lineHeight: .9, fontWeight: 600 }}>{pdPriceReal(spice, market, weight)}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600, paddingBottom: 5 }}>/ {weight} · {isLocal ? "incl. tax" : "duty-free export"}</span>
      </div>

      {/* weight */}
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow" style={{ color: "var(--ink)", marginBottom: 10 }}>Weight</div>
        <div style={{ display: "flex", gap: 10 }}>
          {weights.map((w) => {
            const on = w === weight;
            return (
              <button key={w} onClick={() => setWeight(w)} style={{
                flex: 1, padding: "12px 8px", borderRadius: 7, cursor: "pointer", textAlign: "center",
                border: on ? "1.5px solid " + accent : "1px solid var(--line)", background: on ? (isLocal ? "rgba(15,110,86,.06)" : "rgba(186,117,23,.07)") : "#fff",
                transition: "all .15s" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: on ? accent : "var(--ink)" }}>{w}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{pdPriceReal(spice, market, w)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* grind */}
      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ color: "var(--ink)", marginBottom: 10 }}>Cut</div>
        <div className={"seg " + (isLocal ? "local" : "intl")}>
          {["Whole", "Ground"].map((g) => (
            <button key={g} className={g === grind ? "on" : ""} onClick={() => setGrind(g)}>{g === "Whole" ? "Whole quills" : "Freshly ground"}</button>
          ))}
        </div>
      </div>

      {/* qty + CTA */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <Qty q={q} setQ={setQ} />
        <button onClick={onAdd} className={isLocal ? "btn btn-local" : "btn btn-intl"} style={{ flex: 1 }}>
          {added ? "Added to basket ✓" : "Add to Cart — " + pdPriceReal(spice, market, weight)}
        </button>
        <button onClick={() => setSaved(!saved)} aria-label="Save" style={{
          width: 46, height: 46, flex: "0 0 auto", borderRadius: 6, border: "1.5px solid " + (saved ? accent : "var(--line)"),
          background: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? accent : "none"} stroke={saved ? accent : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* trust microcopy */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        {[
          ["Ships in 24 hours", isLocal ? "Island-wide courier, 1–3 days" : "Tracked & insured worldwide"],
          [isLocal ? "Free over Rs 5,000" : "Free shipping over $60", "Sealed at peak aroma"],
          ["GI Protected origin", "Verified single-estate harvest"],
        ].map((t) => (
          <div key={t[0]} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{t[0]}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>· {t[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { pdContent, pdPrice, Breadcrumb, Gallery, BuyBox });
