import type { GiftSet } from "./gifts-data";

// Demo gift sets: the fallback when the API has none. Kept apart from
// gifts-data so the storefront gifts client never bundles them (audit #54).
export const GIFTS: GiftSet[] = [
  {
    id: "classic", name: "The Ceylon Classic", featured: true,
    tagline: "The four cornerstones of a Sri Lankan pantry",
    blurb: "Hand-rolled cinnamon, hill-country cardamom, Kegalle cloves and estate peppercorns — the spices every Ceylon kitchen is built on, presented in our signature ribboned box.",
    badge: "Bestselling gift", jar: "50g",
    color: "#B5651D", base: "#C2772E", deep: "#7E481A", surface: "#F3E7D4",
    usd: "$28.50", lkr: "Rs 4,250",
    contents: ["Ceylon Cinnamon Quills", "Green Cardamom Pods", "Whole Cloves", "Black Peppercorns"],
  },
  {
    id: "curry", name: "The Curry Night", featured: false,
    tagline: "Everything for a proper black-curry table",
    blurb: "Our roasted Ceylon curry powder and Kandyan garam masala, with turmeric and ginger to round the pot — a full night's cooking, boxed.",
    badge: null, jar: "50g",
    color: "#9A5B22", base: "#AC6C2D", deep: "#6E3F16", surface: "#EFE2CE",
    usd: "$25.50", lkr: "Rs 3,800",
    contents: ["Ceylon Curry Powder", "Kandyan Garam Masala", "Ground Turmeric", "Ground Ginger"],
  },
  {
    id: "baker", name: "The Baker's Box", featured: false,
    tagline: "Warm, sweet spices for the oven",
    blurb: "Ground cinnamon, whole nutmeg, delicate mace and green cardamom — the quiet backbone of every good bake, from spiced loaves to festive puddings.",
    badge: "New", jar: "50g",
    color: "#C0531F", base: "#D06A2E", deep: "#8F3A14", surface: "#F4E0D2",
    usd: "$36.00", lkr: "Rs 5,450",
    contents: ["Ceylon Cinnamon, Ground", "Whole Nutmeg", "Mace Blades", "Green Cardamom Pods"],
  },
  {
    id: "connoisseur", name: "The Connoisseur", featured: false,
    tagline: "Six single-origin spices, at their finest",
    blurb: "A larger keepsake box for the serious cook — six of our most prized lots, from rare mace blades to the bestselling roasted curry powder, each traceable to its estate.",
    badge: "Limited", jar: "50g",
    color: "#6B4226", base: "#7A4A2A", deep: "#462914", surface: "#EBDDCD",
    usd: "$49.00", lkr: "Rs 7,400",
    contents: ["Ceylon Cinnamon Quills", "Green Cardamom Pods", "Mace Blades", "Whole Nutmeg", "Black Peppercorns", "Ceylon Curry Powder"],
  },
  {
    id: "taster", name: "The Taster", featured: false,
    tagline: "A first taste of the forest",
    blurb: "Three icons to begin with — sweet Ceylon cinnamon, golden turmeric and hill-country pepper. The easiest way to send someone down the rabbit hole.",
    badge: null, jar: "50g",
    color: "#D99A1C", base: "#E2A62B", deep: "#A8740F", surface: "#F6E9C9",
    usd: "$17.50", lkr: "Rs 2,600",
    contents: ["Ceylon Cinnamon Quills", "Ground Turmeric", "Black Peppercorns"],
  },
];
