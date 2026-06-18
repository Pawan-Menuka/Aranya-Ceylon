/* Aranya Ceylon — Journal dataset.
   Sample editorial posts. Each: slug, title, dek, category, author/role, date,
   readTime, accent (spice colour for the stripe/tint), slot (image-slot id),
   featured flag, and `body` blocks for the article page:
     {t:"h", text}      section heading
     {t:"p", text}      paragraph (may include <em>)
     {t:"quote", text, by}  pull quote
     {t:"img", id, cap} image-slot with caption
   Posts without a body fall back to a shared template on the article page. */
window.JOURNAL_CATEGORIES = ["All", "Sourcing", "Recipes", "Spice Notes", "Heritage"];

window.JOURNAL = [
  {
    slug: "true-cinnamon",
    title: "True cinnamon, and why it ruins you for the supermarket jar",
    dek: "Once you've tasted a hand-rolled Ceylon quill dissolve to silk in warm milk, the hard cassia in most kitchens never tastes the same again.",
    category: "Spice Notes", author: "Devika R.", role: "Head of Sourcing",
    date: "May 28, 2026", readTime: "6 min", accent: "#B5651D", slot: "post-cinnamon", featured: true,
    body: [
      { t: "p", text: "There is a moment, the first time you steep a real Ceylon quill in hot milk, when you realise you have been lied to for years. The bark does not just flavour the milk — it <em>perfumes</em> it, honeyed and floral, with a whisper of clove and citrus underneath. Then it dissolves, leaving no grit, no blunt heat, nothing to chew around. That is true cinnamon, and it is a different plant from what fills most jars." },
      { t: "h", text: "Cassia is not cinnamon" },
      { t: "p", text: "Most of the world's \"cinnamon\" is cassia — a hardier, cheaper bark from a different tree, darker and thicker, with a coarse heat driven by high levels of a compound called coumarin. It has its uses. But it is to Ceylon cinnamon what cooking wine is to Burgundy: related, and not the same conversation." },
      { t: "quote", text: "Grade your bark by the candle, not the colour — the truest quill lets the light through.", by: "A Matale peeler's proverb" },
      { t: "h", text: "How to tell the difference" },
      { t: "p", text: "True cinnamon quills are pale tan, thin as parchment, and rolled in many fragile layers like a cigar. Snap one and it crumbles. Cassia is reddish-brown, hard, and curls into a single thick scroll. If it fights your spice grinder, it is cassia." },
      { t: "img", id: "post-cinnamon-detail", cap: "Hand-rolled quills, peeled in the wet season above Matale." },
      { t: "p", text: "The flavour follows the form. Ceylon is delicate and complex — built for sweet bakes, slow braises, and anything milky. Cassia is loud and one-note — fine for a cinnamon roll that is mostly sugar anyway. Cook with the real thing once and the difference stops being a marketing claim and becomes the plainest thing in the world." },
    ],
  },
  {
    slug: "cardamom-by-hand",
    title: "Why cardamom has to be picked by hand, three times a season",
    dek: "The greenest pods hold the loudest oils — but they ripen on their own clock, so the harvest is walked plant by plant.",
    category: "Sourcing", author: "Nuwan F.", role: "Field Buyer",
    date: "May 14, 2026", readTime: "5 min", accent: "#7C9A5A", slot: "post-cardamom", featured: false,
    body: [
      { t: "p", text: "Cardamom hides low in the shade of the Kandyan forest, and it refuses to ripen all at once. Each pod keeps its own schedule, which means a single plant is picked over and over across a season — three or four passes, sometimes more." },
      { t: "h", text: "Picked green on purpose" },
      { t: "p", text: "Snip the pod a touch early and it stays a vivid grass-green, locking the volatile oils inside before sun or heat can drive them off. Wait for gold and much of the perfume has already escaped. The greenest pods cost the most to harvest and are worth every rupee." },
      { t: "quote", text: "Pick it green and you keep the perfume; wait for gold and it has already half escaped.", by: "A Kandy estate picker" },
      { t: "p", text: "This is why machine harvest never took: a machine cannot tell a ready pod from its neighbour. Only a hand can, and only an experienced one." },
    ],
  },
  {
    slug: "ceylon-black-curry",
    title: "A Sri Lankan black curry that starts with a dry pan",
    dek: "The deep, almost-burnt backbone of a hill-country curry comes from roasting whole spices until they're dark — here's how.",
    category: "Recipes", author: "Aranya Kitchen", role: "",
    date: "April 30, 2026", readTime: "8 min", accent: "#3C3A36", slot: "post-blackcurry", featured: false,
    body: [
      { t: "p", text: "Sri Lankan black curry gets its name and its character from one step home cooks elsewhere skip: roasting the whole spices in a dry pan until they are genuinely dark — well past golden, just short of burnt. It smells alarming and tastes extraordinary." },
      { t: "h", text: "The roast" },
      { t: "p", text: "Coriander, cumin and fennel go into a dry pan over medium heat with a few whole cloves, a snapped quill of cinnamon and a spoon of black peppercorns. Stir constantly. They will pale, then tan, then turn the colour of strong coffee. That is where you stop." },
      { t: "quote", text: "Toast it until you think you've gone too far — then trust it.", by: "The Aranya kitchen" },
      { t: "p", text: "Grind the cooled spices, bloom them in oil with curry leaves and onion, and build your curry from there. The roast is the dish; everything after is just carrying it." },
    ],
  },
  {
    slug: "from-peel-to-pouch",
    title: "From peel to pouch: the three weeks that decide everything",
    dek: "Aroma fades, so we move fast. A look at how a quill gets from a hillside above Matale to a sealed pouch on your shelf.",
    category: "Sourcing", author: "Devika R.", role: "Head of Sourcing",
    date: "April 12, 2026", readTime: "7 min", accent: "#1D9E75", slot: "post-process", featured: false,
  },
  {
    slug: "pepper-in-the-mist",
    title: "The king of spices, grown in the mist",
    dek: "Hill-country pepper is hotter and more floral than the lowland bulk — and the difference is mostly altitude and patience.",
    category: "Spice Notes", author: "Nuwan F.", role: "Field Buyer",
    date: "March 26, 2026", readTime: "5 min", accent: "#54504A", slot: "post-pepper", featured: false,
  },
  {
    slug: "name-means-forest",
    title: "Aranya means the forest",
    dek: "On a three-thousand-year-old trade, a Sanskrit word for wild woodland, and why a spice company would name itself after trees.",
    category: "Heritage", author: "Devika R.", role: "Head of Sourcing",
    date: "March 8, 2026", readTime: "4 min", accent: "#0F6E56", slot: "post-heritage", featured: false,
  },
  {
    slug: "golden-milk",
    title: "Golden milk, done properly",
    dek: "Turmeric needs fat and a pinch of pepper to give up its gold. A five-minute evening ritual worth getting right.",
    category: "Recipes", author: "Aranya Kitchen", role: "",
    date: "Feb 20, 2026", readTime: "4 min", accent: "#D99A1C", slot: "post-goldenmilk", featured: false,
  },
];
