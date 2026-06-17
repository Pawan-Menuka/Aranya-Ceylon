import type { CatalogSpice } from "./types";
import { CATALOG } from "./catalog-data";

// Recipes dataset (ported from recipes-data.js), typed. Richer than journal
// posts: timings, yield, difficulty, grouped ingredients, numbered method, tips,
// and the catalog spice names each recipe features (for "shop the spices").
// The demo set is the SSG/ISR fallback; live recipes would map onto this shape.
export interface IngredientGroup {
  group?: string;
  items: string[];
}
export interface Recipe {
  slug: string;
  title: string;
  dek: string;
  course: string;
  accent: string;
  slot: string;
  featured: boolean;
  time: { prep: number; cook: number };
  serves: number;
  difficulty: string;
  intro: string;
  spices: string[];
  ingredients: IngredientGroup[];
  method: string[];
  tips: string[];
}

export const RECIPE_COURSES = ["All", "Curries & Mains", "Sweet & Bakes", "Drinks", "Sides & Basics"];

export const RECIPES: Recipe[] = [
  {
    slug: "black-pork-curry",
    title: "Sri Lankan Black Pork Curry",
    dek: "The deep, almost-burnt backbone of a hill-country curry comes from roasting whole spices until they're dark as coffee. Smoky, rich and unmistakably Ceylon.",
    course: "Curries & Mains", accent: "#3C3A36", slot: "rec-blackpork", featured: true,
    time: { prep: 25, cook: 75 }, serves: 4, difficulty: "Medium",
    intro: "Black curry gets its name from the colour of the roasted spice, not the meat. The trick is to dry-roast the whole spices well past golden, then grind and bloom them. Don't rush the roast; it is the entire dish.",
    spices: ["Ceylon Curry Powder", "Black Peppercorns", "Whole Cloves", "Ceylon Cinnamon Quills", "Ground Turmeric"],
    ingredients: [
      { group: "For the black spice", items: ["3 tbsp Ceylon curry powder", "1 tbsp black peppercorns", "6 whole cloves", "1 quill Ceylon cinnamon, snapped", "2 tsp raw rice (optional, for body)"] },
      { group: "For the curry", items: ["800g pork shoulder, in 4cm cubes", "1 tsp ground turmeric", "2 onions, finely sliced", "4 garlic cloves, minced", "Thumb of ginger, minced", "1 sprig curry leaves", "1 stalk lemongrass, bruised", "400ml coconut milk", "2 tbsp coconut or vegetable oil", "Tamarind paste & salt, to taste"] },
    ],
    method: [
      "Dry-roast the curry powder, peppercorns, cloves, cinnamon and rice in a heavy pan over medium heat, stirring constantly, until the mix turns the colour of dark coffee and smells nutty — 6–8 minutes. Cool, then grind to a powder.",
      "Toss the pork with the turmeric and a good pinch of salt; set aside while you build the base.",
      "Heat the oil and fry the onion with the curry leaves and lemongrass until deep golden, 8–10 minutes. Add the garlic and ginger and cook another minute.",
      "Stir in the black roasted spice and cook for 30 seconds until fragrant, then add the pork and turn to coat in the dark masala.",
      "Pour in the coconut milk plus a splash of water to barely cover. Bring to a gentle simmer, cover, and cook low for 60–75 minutes until the pork is spoon-tender.",
      "Uncover for the last 15 minutes to reduce to a clinging sauce. Sharpen with a little tamarind, check the salt, and rest 10 minutes before serving with rice.",
    ],
    tips: [
      "Roasting the spice past golden is the point — take it darker than feels comfortable, then trust it.",
      "No tamarind? A squeeze of lime at the end lifts the richness just as well.",
      "Better the next day: the black masala keeps deepening overnight.",
    ],
  },
  {
    slug: "garam-masala-roast-chicken",
    title: "Kandyan Garam Masala Roast Chicken",
    dek: "A whole chicken rubbed with hand-ground garam masala and turmeric, roasted until the skin is lacquered and the spice has soaked into every joint.",
    course: "Curries & Mains", accent: "#7A3E22", slot: "rec-roastchicken", featured: false,
    time: { prep: 15, cook: 80 }, serves: 4, difficulty: "Easy",
    intro: "Proof that Ceylon spice belongs well beyond the curry pot. The garam masala — warm with clove, cardamom and cinnamon — turns a humble roast into something that perfumes the whole house.",
    spices: ["Kandyan Garam Masala", "Ground Turmeric", "Black Peppercorns"],
    ingredients: [
      { items: ["1 whole chicken, about 1.6kg", "2 tbsp Kandyan garam masala", "1 tsp ground turmeric", "1 tsp coarsely cracked black pepper", "3 tbsp softened butter or ghee", "1 lemon, halved", "4 garlic cloves, smashed", "Sea salt"] },
    ],
    method: [
      "Heat the oven to 200°C (180°C fan). Pat the chicken thoroughly dry.",
      "Mash the garam masala, turmeric, pepper and a good pinch of salt into the soft butter to make a paste.",
      "Loosen the skin over the breast and push half the spiced butter underneath; rub the rest all over the outside.",
      "Put the lemon halves and garlic in the cavity, tie the legs, and set the bird breast-up in a roasting tin.",
      "Roast for 75–85 minutes, basting once halfway, until the juices run clear and the skin is deep amber.",
      "Rest, loosely covered, for 15 minutes before carving — the spice settles and the juices redistribute.",
    ],
    tips: [
      "Salt the bird and apply the rub a few hours ahead (or overnight) for the deepest flavour.",
      "Spoon the spiced pan juices over rice or roast potatoes — none of it should go to waste.",
    ],
  },
  {
    slug: "ceylon-cinnamon-rolls",
    title: "Ceylon Cinnamon Rolls",
    dek: "Soft, pull-apart rolls with a true-cinnamon filling that perfumes rather than just heats — finished with a whisper of cardamom and nutmeg.",
    course: "Sweet & Bakes", accent: "#B5651D", slot: "rec-cinnamonrolls", featured: false,
    time: { prep: 30, cook: 25 }, serves: 12, difficulty: "Medium",
    intro: "Most cinnamon rolls lean on hard cassia for a blunt heat. Swap in ground Ceylon cinnamon and the whole tray changes — honeyed, floral, almost citrus, with the warmth in the background where it belongs.",
    spices: ["Ceylon Cinnamon, Ground", "Green Cardamom Pods", "Whole Nutmeg"],
    ingredients: [
      { group: "Dough", items: ["500g strong white flour", "7g instant yeast", "60g caster sugar", "250ml warm milk", "1 egg", "60g soft butter", "1 tsp salt", "Seeds of 4 cardamom pods, ground"] },
      { group: "Filling", items: ["100g soft butter", "120g soft brown sugar", "2 tbsp ground Ceylon cinnamon", "A few rasps of fresh nutmeg"] },
    ],
    method: [
      "Mix the flour, yeast, sugar, salt and ground cardamom. Add the warm milk, egg and butter, then knead 8–10 minutes to a smooth, soft dough.",
      "Cover and prove until doubled, about 1 hour.",
      "Beat the filling ingredients to a spreadable paste. Roll the dough into a large rectangle, about 30 × 40cm.",
      "Spread the filling to the edges, roll up tightly from the long side, and cut into 12 even pieces.",
      "Nestle the rolls into a lined tin, cover, and prove 30–40 minutes until puffy.",
      "Bake at 180°C for 22–25 minutes until golden. Cool slightly, then glaze or dust as you like.",
    ],
    tips: [
      "Grind the cardamom fresh from pods just before mixing — pre-ground loses its lift fast.",
      "A cream-cheese glaze suits the floral cinnamon better than a heavy sugar icing.",
    ],
  },
  {
    slug: "golden-milk",
    title: "Golden Milk, Done Properly",
    dek: "Turmeric needs fat and a pinch of pepper to give up its gold. A five-minute evening ritual worth getting right.",
    course: "Drinks", accent: "#D99A1C", slot: "rec-goldenmilk", featured: false,
    time: { prep: 3, cook: 6 }, serves: 2, difficulty: "Easy",
    intro: "The science is simple: curcumin, the active compound in turmeric, is fat-soluble and far better absorbed alongside piperine from black pepper. So the two old kitchen habits — simmer in milk, add a pinch of pepper — turn out to be exactly right.",
    spices: ["Ground Turmeric", "Black Peppercorns", "Ceylon Cinnamon Quills", "Ground Ginger"],
    ingredients: [
      { items: ["400ml milk of choice", "1 tsp ground turmeric", "Small pinch of freshly ground black pepper", "1/2 tsp ground ginger", "1 small quill Ceylon cinnamon", "1–2 tsp honey or maple, to taste", "1 tsp coconut oil or ghee (optional)"] },
    ],
    method: [
      "Warm the milk in a small pan with the turmeric, pepper, ginger and cinnamon quill.",
      "Bring to a bare simmer and let it steep, whisking, for 4–5 minutes — don't let it boil hard.",
      "Take off the heat, stir in the fat if using, and sweeten to taste.",
      "Discard the cinnamon quill, froth if you like, and pour. Best sipped slowly, warm.",
    ],
    tips: [
      "The pinch of pepper isn't optional — it's what makes the turmeric worth drinking.",
      "A little fat (coconut oil, ghee, or whole milk) noticeably improves absorption and texture.",
    ],
  },
  {
    slug: "ceylon-masala-chai",
    title: "Ceylon Masala Chai",
    dek: "Cardamom and clove lead, cinnamon and ginger follow, a single peppercorn keeps it honest. Built on strong Ceylon tea, the way the hill country takes it.",
    course: "Drinks", accent: "#7C9A5A", slot: "rec-chai", featured: false,
    time: { prep: 5, cook: 12 }, serves: 4, difficulty: "Easy",
    intro: "A proper chai is decocted, not steeped — the whole spices and tea simmered hard with milk so the oils actually come out. Bruise the cardamom, crack the cinnamon, and give it time on the heat.",
    spices: ["Green Cardamom Pods", "Whole Cloves", "Ceylon Cinnamon Quills", "Ground Ginger", "Black Peppercorns"],
    ingredients: [
      { items: ["6 green cardamom pods, bruised", "4 whole cloves", "1 quill Ceylon cinnamon, snapped", "1 tsp ground ginger (or a thumb, sliced)", "1 black peppercorn", "3 tsp strong Ceylon black tea", "500ml water", "300ml milk", "Sugar or jaggery, to taste"] },
    ],
    method: [
      "Crush the cardamom, cloves, cinnamon and peppercorn lightly in a mortar to open them up.",
      "Simmer the spices in the water for 5 minutes to build a fragrant decoction.",
      "Add the tea and simmer 2 minutes more, then pour in the milk and your sweetener.",
      "Bring back to a rolling simmer and let it climb the pan once or twice — this is what makes it chai.",
      "Strain into cups and serve scalding hot.",
    ],
    tips: [
      "Bruising the whole spices first releases far more aroma than adding them whole.",
      "Jaggery (kithul or palm) instead of sugar gives a rounder, more caramel note.",
    ],
  },
  {
    slug: "roasted-ceylon-curry-powder",
    title: "Roasted Ceylon Curry Powder, From Scratch",
    dek: "The dark, toasty house blend behind every Sri Lankan curry — made in ten minutes from whole spices you already trust. A kitchen basic worth owning.",
    course: "Sides & Basics", accent: "#9A5B22", slot: "rec-currypowder", featured: false,
    time: { prep: 5, cook: 10 }, serves: 0, difficulty: "Easy",
    intro: "Sri Lankan curry powder is roasted dark, which sets it apart from the pale Indian blends. Toast the whole seeds until properly browned, grind, and you'll have a jar that makes everything taste like the hill country. Makes about one small jar.",
    spices: ["Black Peppercorns", "Whole Cloves", "Ceylon Cinnamon Quills", "Ground Turmeric"],
    ingredients: [
      { items: ["4 tbsp coriander seeds", "2 tbsp cumin seeds", "1 tbsp fennel seeds", "1 tsp black peppercorns", "6 whole cloves", "1 quill Ceylon cinnamon, snapped", "10 fresh curry leaves (optional)", "1 tsp ground turmeric (added after roasting)"] },
    ],
    method: [
      "Put a dry, heavy pan over medium heat and add the coriander, cumin, fennel, peppercorns, cloves and cinnamon.",
      "Stir constantly as the seeds pale, then tan, then turn a deep, even brown and smell toasty — 8–10 minutes. If using curry leaves, add them for the last minute to crisp.",
      "Tip out onto a plate to stop the cooking and cool completely.",
      "Grind to a fine powder, then stir through the ground turmeric off the heat.",
      "Store in an airtight jar away from light; use within a couple of months for the best aroma.",
    ],
    tips: [
      "Roast in small batches and grind fresh — the whole point is aroma you can't buy pre-ground.",
      "Take it darker than you think for a true 'black curry' base; keep it lighter for vegetables and fish.",
    ],
  },
];

// ---- helpers ----
export function recipeTotal(r: Recipe): number {
  return (r.time.prep || 0) + (r.time.cook || 0);
}
export function fmtMins(m: number): string {
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), mm = m % 60;
  return h + " hr" + (mm ? " " + mm : "");
}
export function fmtMinsLong(m: number): string {
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), mm = m % 60;
  return h + " hr" + (mm ? " " + mm + " min" : "");
}
export function recipeServes(r: Recipe): string {
  return r.serves > 0 ? "Serves " + r.serves : "Makes 1 jar";
}
export function getRecipe(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug);
}
// Resolve a recipe's spice names to catalog products (for shop-the-spices).
export function recipeSpices(r: Recipe): CatalogSpice[] {
  return (r.spices || []).map((name) => CATALOG.find((p) => p.name === name)).filter((p): p is CatalogSpice => !!p);
}
