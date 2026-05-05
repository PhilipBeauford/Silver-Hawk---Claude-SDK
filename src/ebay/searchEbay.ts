import { getEbayAccessToken } from "./getEbayAccessToken.js";
import { normalizeEbayItem } from "./normalizeEbayItem.js";
import type { NormalizedListing, RawEbayListing } from "../types/listing.js";

type EbaySearchResponse = {
  itemSummaries?: RawEbayListing[];
};

export async function searchEbay(query: string, limit = 10): Promise<NormalizedListing[]> {
  const token = await getEbayAccessToken();

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    sort: "newlyListed",
  });

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`eBay search failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as EbaySearchResponse;

  return (data.itemSummaries ?? [])
    .map(normalizeEbayItem)
    .filter((item): item is NormalizedListing => item !== null);
}