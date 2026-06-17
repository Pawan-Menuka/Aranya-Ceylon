import type { Spice, Market } from "./types";

// Product-detail editorial content (ported from product-detail.jsx), keyed by
// spice name with a generic fallback. In production a live Product's own
// `description` (MDX/long-form) takes precedence for the story; this curated
// content stands in for fields the API doesn't carry (flavour bars, specs,
// pairings, uses) and as the demo fallback.
export interface PDContent {
  tagline: string;
  storyTitle: string;
  story: string[];
  quote: string;
  quoteBy: string;
  flavour: [string, number][];
  specs: [string, string][];
  pairings: string[];
  uses: [string, string][];
}

const PD_CONTENT: Record<string, PDContent> = {
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
      ["Form", "Whole hand-rolled quills"], ["Cut", '5" quills · also milled to order'],
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

export function pdContent(spice: Spice): PDContent {
  const exact = PD_CONTENT[spice.name];
  if (exact) return exact;
  // match by leading word ("Ceylon Cinnamon Quills" -> "Ceylon Cinnamon")
  const key = Object.keys(PD_CONTENT).find((k) => spice.name.startsWith(k.split(" ").slice(0, 2).join(" ")));
  if (key) return PD_CONTENT[key];
  return {
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

// Price helpers — the data price is the 100g price; derive 50g / 250g.
const PD_MULT: Record<string, number> = { "50g": 0.6, "100g": 1, "250g": 2.3 };
function pdParse(str: string): number {
  return parseFloat(String(str).replace(/[^0-9.]/g, "")) || 0;
}
export function pdPrice(spice: Spice, market: Market, weight: string): string {
  const base = pdParse(market === "local" ? spice.lkr : spice.usd) * (PD_MULT[weight] || 1);
  return market === "local" ? "Rs " + Math.round(base).toLocaleString("en-US") : "$" + base.toFixed(2);
}

// Demo reviews (ported). Live reviews come from product.reviews when present.
export interface PDReview {
  name: string;
  loc: string;
  rating: number;
  title: string;
  body: string;
}
export const PD_REVIEWS: PDReview[] = [
  { name: "Priya M.", loc: "London, UK", rating: 5, title: "The real thing, finally", body: "After years of cassia I'd forgotten cinnamon could taste floral. The quills crumble to nothing in milk. Bought the 250g and already need more." },
  { name: "Daniel R.", loc: "Berlin, DE", rating: 5, title: "Aroma fills the room", body: "Opened the pouch and the whole kitchen turned warm and sweet. You can tell it was packed recently — nothing flat about it." },
  { name: "Anoushka F.", loc: "Colombo, LK", rating: 4, title: "Lovely, ships fast", body: "Grew up with this but never this graded. Used it in kiribath for new year and the family noticed. Knocking one star only for the price — but it's worth it." },
];
