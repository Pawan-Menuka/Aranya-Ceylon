// Generated editorial photography in public/images. Keep these paths explicit so
// a missing asset never turns an unrelated dynamic slot into a broken image.
export const SLOT_IMAGES: Record<string, string> = {
  "story-sourcing": "/images/home/story-sourcing.webp",
  "cat-cinnamon": "/images/categories/cat-cinnamon.webp",
  "cat-whole": "/images/categories/cat-whole.webp",
  "cat-ground": "/images/categories/cat-ground.webp",
  "cat-cardamom": "/images/categories/cat-cardamom.webp",
  "cat-gift": "/images/categories/cat-gift.webp",
  "cat-whole-spices": "/images/categories/cat-whole-spices.webp",
  "cat-ground-powders": "/images/categories/cat-ground-powders.webp",
  "cat-estate-blends": "/images/categories/cat-estate-blends.webp",
  "col-best": "/images/categories/col-best.webp",
  "col-new": "/images/categories/col-new.webp",
  "col-gift": "/images/categories/col-gift.webp",
  "about-hero": "/images/about/about-hero.webp",
  "about-origin": "/images/about/about-origin.webp",
  "about-grower-1": "/images/about/about-grower-1.webp",
  "about-grower-2": "/images/about/about-grower-2.webp",
  "about-grower-3": "/images/about/about-grower-3.webp",
  "about-region": "/images/about/about-region.webp",
  "gift-hero": "/images/gifts/gift-hero.webp",
  "occ-housewarming": "/images/gifts/occasions/housewarming.webp",
  "occ-festive": "/images/gifts/occasions/festive.webp",
  "occ-thankyou": "/images/gifts/occasions/thank-you.webp",
  "occ-cook": "/images/gifts/occasions/for-the-cook.webp",
  "wholesale-hero": "/images/wholesale/wholesale-hero.webp",
  "contact-map": "/images/contact/contact-map.webp",
  "rec-blackpork": "/images/recipes/black-pork-curry.webp",
  "rec-roastchicken": "/images/recipes/garam-masala-roast-chicken.webp",
  "rec-cinnamonrolls": "/images/recipes/ceylon-cinnamon-rolls.webp",
  "rec-goldenmilk": "/images/recipes/golden-milk.webp",
  "rec-chai": "/images/recipes/ceylon-masala-chai.webp",
  "rec-currypowder": "/images/recipes/roasted-ceylon-curry-powder.webp",
  "post-cinnamon": "/images/journal/true-cinnamon/cover.webp",
  "post-cinnamon-detail": "/images/journal/true-cinnamon/hand-rolled-quills.webp",
  "post-cardamom": "/images/journal/cardamom-by-hand/cover.webp",
  "post-cardamom-body": "/images/journal/cardamom-by-hand/three-pass-harvest.webp",
  "post-process": "/images/journal/from-peel-to-pouch/cover.webp",
  "post-process-body": "/images/journal/from-peel-to-pouch/sealed-at-source.webp",
  "post-pepper": "/images/journal/pepper-in-the-mist/cover.webp",
  "post-pepper-body": "/images/journal/pepper-in-the-mist/sun-dried-pepper.webp",
  "post-heritage": "/images/journal/aranya-means-the-forest/cover.webp",
  "post-heritage-body": "/images/journal/aranya-means-the-forest/mixed-spice-garden.webp",
};

const PRODUCT_FILES: Record<string, readonly string[]> = {
  "ceylon-cinnamon-quills": ["01-primary", "02-detail", "03-milled", "04-packaging"],
  "ceylon-cinnamon-ground": ["01-primary", "02-detail", "03-process", "04-packaging"],
  "ground-turmeric": ["01-primary", "02-detail", "03-process", "04-packaging"],
  "white-peppercorns": ["01-primary", "02-detail", "03-cracked", "04-packaging"],
  "mace-blades": ["01-primary", "02-detail", "03-origin", "04-packaging"],
  "ground-ginger": ["01-primary", "02-detail", "03-process", "04-packaging"],
  "ceylon-curry-powder": ["01-primary", "02-detail", "03-ingredients", "04-packaging"],
  "kandyan-garam-masala": ["01-primary", "02-detail", "03-ingredients", "04-packaging"],
  "green-cardamom-pods": ["01-primary", "02-detail", "03-crushed", "04-packaging"],
  "whole-cloves": ["01-primary", "02-detail", "03-milled", "04-packaging"],
  "whole-nutmeg": ["01-primary", "02-detail", "03-grated", "04-packaging"],
  "black-peppercorns": ["01-primary", "02-detail", "03-cracked", "04-packaging"],
  "ceylon-true-cinnamon": ["01-primary", "02-detail", "03-milled", "04-packaging"],
  "malabar-black-pepper": ["01-primary", "02-detail", "03-cracked", "04-packaging"],
  "single-estate-ceylon-black-tea": ["01-primary", "02-detail", "03-brewed", "04-packaging"],
};

const PRODUCT_ALIASES: Record<string, string> = {
  "ceylon-cinnamon": "ceylon-cinnamon-quills",
  "green-cardamom": "green-cardamom-pods",
};

export function productImage(slug: string | undefined, index = 0): string | undefined {
  if (!slug) return undefined;
  const key = PRODUCT_ALIASES[slug] || slug;
  const file = PRODUCT_FILES[key]?.[index];
  return file ? `/images/products/${key}/${file}.webp` : undefined;
}

const GIFT_IMAGES: Record<string, string> = {
  classic: "classic",
  curry: "curry-night",
  "curry-night": "curry-night",
  baker: "bakers-box",
  "bakers-box": "bakers-box",
  connoisseur: "connoisseur",
  taster: "taster",
};

export function giftImage(id: string): string | undefined {
  const file = GIFT_IMAGES[id];
  return file ? `/images/gifts/sets/${file}.webp` : undefined;
}

// Older saved cart lines have a name but no slug. Resolve their photo without
// changing the persisted cart format or its pricing fields.
export function imageForName(name: string | undefined, index = 0): string | undefined {
  if (!name) return undefined;
  const giftNames: Record<string, string> = {
    "The Ceylon Classic": "classic",
    "The Curry Night": "curry",
    "The Baker's Box": "baker",
    "The Connoisseur": "connoisseur",
    "The Taster": "taster",
  };
  const gift = giftNames[name];
  if (gift) return index === 0 ? giftImage(gift) : undefined;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return productImage(slug, index);
}
