import type { NormalizedPlaywrightListing } from "../types/listing.js";

const BASE_URL = "https://openapi.etsy.com";

interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  url: string;
  price: EtsyMoney;
  quantity: number;
}

interface EtsyListingWithImages extends EtsyListing {
  images?: Array<{ url_570xN: string }>;
}

interface EtsySearchResponse {
  count: number;
  results: EtsyListing[];
}

interface EtsyBatchResponse {
  results: EtsyListingWithImages[];
}

function getApiKey(): string | null {
  const keystring = process.env.ETSY_KEYSTRING;
  const secret = process.env.ETSY_SHARED_SECRET;
  if (!keystring || !secret || keystring === "your_etsy_keystring") return null;
  return `${keystring}:${secret}`;
}

export async function searchEtsyWithApi(
  searchTerm: string,
  limit = 8,
  maxPrice = 55
): Promise<NormalizedPlaywrightListing[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("Etsy credentials not set — skipping Etsy search.");
    return [];
  }

  // Fetch extra results to account for price filtering
  const fetchLimit = Math.min(limit * 3, 100);

  const params = new URLSearchParams({
    keywords: searchTerm,
    limit: String(fetchLimit),
    sort_on: "score",
    sort_order: "desc",
  });

  const searchRes = await fetch(`${BASE_URL}/v3/application/listings/active?${params}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!searchRes.ok) {
    throw new Error(`Etsy search failed: ${searchRes.status} ${await searchRes.text()}`);
  }

  const searchData = (await searchRes.json()) as EtsySearchResponse;

  const filtered = searchData.results
    .filter((l) => {
      const price = l.price.amount / l.price.divisor;
      return price <= maxPrice && l.quantity > 0;
    })
    .slice(0, limit);

  if (filtered.length === 0) return [];

  // Batch-fetch images
  const ids = filtered.map((l) => l.listing_id).join(",");
  const imageMap = new Map<number, string | null>();

  const batchRes = await fetch(
    `${BASE_URL}/v3/application/listings/batch?listing_ids=${ids}&includes=Images`,
    { headers: { "x-api-key": apiKey } }
  );

  if (batchRes.ok) {
    const batchData = (await batchRes.json()) as EtsyBatchResponse;
    for (const listing of batchData.results) {
      imageMap.set(listing.listing_id, listing.images?.[0]?.url_570xN ?? null);
    }
  }

  return filtered.map((l) => {
    const price = l.price.amount / l.price.divisor;
    return {
      source: "etsy" as const,
      sourceId: String(l.listing_id),
      title: l.title,
      url: l.url,
      price,
      shipping: 0,
      totalCost: price,
      imageUrl: imageMap.get(l.listing_id) ?? null,
      notes: [],
    };
  });
}
