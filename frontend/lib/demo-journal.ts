// Journal fallback fixtures — served when the live /blog API is unreachable
// (mirrors lib/demo-data.ts for the catalog). Bodies are markdown; the article
// page renders them through the same MDX pipeline as live posts. Ported from
// the prototype's journal-data.js.
import type { JournalPostView } from "./api/types";

export const DEMO_JOURNAL: JournalPostView[] = [
  {
    slug: "true-cinnamon",
    title: "True cinnamon, and why it ruins you for the supermarket jar",
    dek: "Once you've tasted a hand-rolled Ceylon quill dissolve to silk in warm milk, the hard cassia in most kitchens never tastes the same again.",
    category: "Spice Notes",
    tags: ["Spice Notes"],
    date: "May 28, 2026",
    publishedAt: "2026-05-28T00:00:00.000Z",
    accent: "#B5651D",
    featured: true,
    readTime: "6 min",
    seoTitle: null,
    seoDesc:
      "Once you've tasted a hand-rolled Ceylon quill dissolve to silk in warm milk, the hard cassia in most kitchens never tastes the same again.",
    content: `There is a moment, the first time you steep a real Ceylon quill in hot milk, when you realise you have been lied to for years. The bark does not just flavour the milk — it *perfumes* it, honeyed and floral, with a whisper of clove and citrus underneath. Then it dissolves, leaving no grit, no blunt heat, nothing to chew around. That is true cinnamon, and it is a different plant from what fills most jars.

## Cassia is not cinnamon

Most of the world's "cinnamon" is cassia — a hardier, cheaper bark from a different tree, darker and thicker, with a coarse heat driven by high levels of a compound called coumarin. It has its uses. But it is to Ceylon cinnamon what cooking wine is to Burgundy: related, and not the same conversation.

> Grade your bark by the candle, not the colour — the truest quill lets the light through.
> — *A Matale peeler's proverb*

## How to tell the difference

True cinnamon quills are pale tan, thin as parchment, and rolled in many fragile layers like a cigar. Snap one and it crumbles. Cassia is reddish-brown, hard, and curls into a single thick scroll. If it fights your spice grinder, it is cassia.

The flavour follows the form. Ceylon is delicate and complex — built for sweet bakes, slow braises, and anything milky. Cassia is loud and one-note — fine for a cinnamon roll that is mostly sugar anyway. Cook with the real thing once and the difference stops being a marketing claim and becomes the plainest thing in the world.`,
  },
  {
    slug: "cardamom-by-hand",
    title: "Why cardamom has to be picked by hand, three times a season",
    dek: "The greenest pods hold the loudest oils — but they ripen on their own clock, so the harvest is walked plant by plant.",
    category: "Sourcing",
    tags: ["Sourcing"],
    date: "May 14, 2026",
    publishedAt: "2026-05-14T00:00:00.000Z",
    accent: "#7C9A5A",
    featured: false,
    readTime: "5 min",
    seoTitle: null,
    seoDesc:
      "The greenest pods hold the loudest oils — but they ripen on their own clock, so the harvest is walked plant by plant.",
    content: `Cardamom hides low in the shade of the Kandyan forest, and it refuses to ripen all at once. Each pod keeps its own schedule, which means a single plant is picked over and over across a season — three or four passes, sometimes more.

## Picked green on purpose

Snip the pod a touch early and it stays a vivid grass-green, locking the volatile oils inside before sun or heat can drive them off. Wait for gold and much of the perfume has already escaped. The greenest pods cost the most to harvest and are worth every rupee.

> Pick it green and you keep the perfume; wait for gold and it has already half escaped.
> — *A Kandy estate picker*

This is why machine harvest never took: a machine cannot tell a ready pod from its neighbour. Only a hand can, and only an experienced one.`,
  },
  {
    slug: "ceylon-black-curry",
    title: "A Sri Lankan black curry that starts with a dry pan",
    dek: "The deep, almost-burnt backbone of a hill-country curry comes from roasting whole spices until they're dark — here's how.",
    category: "Recipes",
    tags: ["Recipes"],
    date: "April 30, 2026",
    publishedAt: "2026-04-30T00:00:00.000Z",
    accent: "#3C3A36",
    featured: false,
    readTime: "8 min",
    seoTitle: null,
    seoDesc:
      "The deep, almost-burnt backbone of a hill-country curry comes from roasting whole spices until they're dark — here's how.",
    content: `Sri Lankan black curry gets its name and its character from one step home cooks elsewhere skip: roasting the whole spices in a dry pan until they are genuinely dark — well past golden, just short of burnt. It smells alarming and tastes extraordinary.

## The roast

Coriander, cumin and fennel go into a dry pan over medium heat with a few whole cloves, a snapped quill of cinnamon and a spoon of black peppercorns. Stir constantly. They will pale, then tan, then turn the colour of strong coffee. That is where you stop.

> Toast it until you think you've gone too far — then trust it.
> — *The Aranya kitchen*

Grind the cooled spices, bloom them in oil with curry leaves and onion, and build your curry from there. The roast is the dish; everything after is just carrying it.`,
  },
  {
    slug: "name-means-forest",
    title: "Aranya means the forest",
    dek: "On a three-thousand-year-old trade, a Sanskrit word for wild woodland, and why a spice company would name itself after trees.",
    category: "Heritage",
    tags: ["Heritage"],
    date: "March 8, 2026",
    publishedAt: "2026-03-08T00:00:00.000Z",
    accent: "#0F6E56",
    featured: false,
    readTime: "4 min",
    seoTitle: null,
    seoDesc:
      "On a three-thousand-year-old trade, a Sanskrit word for wild woodland, and why a spice company would name itself after trees.",
    content: `*Aranya* is a Sanskrit word for wild woodland — the forest as it grows untended, before anyone draws a fence around it. It is an old word, and it carries an old idea: that the best things are grown in their own place, on their own terms.

## A three-thousand-year-old trade

Ceylon has traded spices for as long as ships have rounded the island. Cinnamon from here reached ancient Egypt; pepper and cardamom moved along the same routes. The forest gave, and the world came for it.

We took the name because it is the truest description of what we do: we go to where the spice already wants to grow, and we get out of its way.`,
  },
];
