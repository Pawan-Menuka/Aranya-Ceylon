import type { ProductView } from "./api/types";

// Offline fallback so the catalog still renders when the API is unreachable
// (e.g. Neon asleep in dev). Mirrors the seed catalog; USD pricing shown.
export const DEMO_PRODUCTS: ProductView[] = [
  { id: "d1", slug: "ceylon-cinnamon-quills", name: "Ceylon Cinnamon Quills", latin: "Cinnamomum verum", origin: "Matale Hills, Sri Lanka", rating: 4.9, color: "#B5651D", badge: "Bestseller", price: "$14.50", currency: "USD", weights: ["50g", "100g", "250g"], category: "Whole Spices", featured: true, imageUrl: null },
  { id: "d2", slug: "green-cardamom-pods", name: "Green Cardamom Pods", latin: "Elettaria cardamomum", origin: "Kandy District, Sri Lanka", rating: 4.8, color: "#7C9A5A", badge: "GI Certified", price: "$18.00", currency: "USD", weights: ["50g", "100g", "250g"], category: "Whole Spices", featured: true, imageUrl: null },
  { id: "d3", slug: "whole-cloves", name: "Whole Cloves", latin: "Syzygium aromaticum", origin: "Kegalle, Sri Lanka", rating: 4.7, color: "#6B4226", badge: null, price: "$11.25", currency: "USD", weights: ["50g", "100g", "250g"], category: "Whole Spices", featured: false, imageUrl: null },
  { id: "d4", slug: "black-peppercorns", name: "Black Peppercorns", latin: "Piper nigrum", origin: "Hill Country, Sri Lanka", rating: 4.8, color: "#3C3A36", badge: "Bestseller", price: "$9.90", currency: "USD", weights: ["50g", "100g", "250g"], category: "Whole Spices", featured: true, imageUrl: null },
  { id: "d5", slug: "ground-turmeric", name: "Ground Turmeric", latin: "Curcuma longa", origin: "Southern Province, Sri Lanka", rating: 4.9, color: "#D99A1C", badge: "GI Certified", price: "$8.50", currency: "USD", weights: ["50g", "100g", "250g"], category: "Ground", featured: false, imageUrl: null },
  { id: "d6", slug: "ceylon-curry-powder", name: "Ceylon Curry Powder", latin: "Roasted estate blend", origin: "Blended in Kandy, Sri Lanka", rating: 4.9, color: "#9A5B22", badge: "Bestseller", price: "$13.75", currency: "USD", weights: ["50g", "100g", "250g"], category: "Blends", featured: true, imageUrl: null },
];
