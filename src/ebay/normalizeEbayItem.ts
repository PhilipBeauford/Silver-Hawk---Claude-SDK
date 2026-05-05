import type { RawEbayListing, NormalizedListing } from "../types/listing.js";

export function normalizeEbayItem(item: RawEbayListing): NormalizedListing | null {
  const price = Number(item.price?.value ?? NaN);

  if (Number.isNaN(price)) return null;

  const shipping = Number(item.shippingOptions?.[0]?.shippingCost?.value ?? 0);

  return {
    source: "ebay",
    sourceId: item.itemId,
    title: item.title,
    url: item.itemWebUrl ?? null,
    price,
    shipping,
    totalCost: price + shipping,
    condition: item.condition ?? null,
    imageUrl: item.image?.imageUrl ?? null,
    notes: [],
  };
}