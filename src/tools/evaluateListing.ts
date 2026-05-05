import type { Listing } from "../types/listing.js";

export function evaluateListing(listing: Listing) {
  const totalCost = listing.price + listing.shipping;

  if (!listing.estimatedSterlingGrams) {
    return {
      rating: "NEEDS_MORE_INFO",
      reason: "No usable weight estimate.",
      sellerMessage:
        "Hi, what is the total weight?",
    };
  }

  const pricePerGram = totalCost / listing.estimatedSterlingGrams;

  let rating: "STRONG_BUY" | "GOOD" |"MAYBE" | "PASS";

  if (pricePerGram <= 1.2) rating = "STRONG_BUY";
  else if (pricePerGram > 1.2 && pricePerGram <= 1.5) rating = "GOOD";
  else if (pricePerGram > 1.5 && pricePerGram <= 2.0) rating = "MAYBE";
  else rating = "PASS";

  return {
    rating,
    totalCost,
    pricePerGram: Number(pricePerGram.toFixed(2)),
  };
}