import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { silverHawkSystemPrompt } from "./prompts/silverHawkSystemPrompt.js";
import { searchEbayWithPlaywright } from "./browsers/searchEbayWithPlaywright.js";
import { openEbayContactForms } from "./browsers/openEbayContactForms.js";
import type { NormalizedPlaywrightListing } from "./types/listing.js";

const anthropic = new Anthropic();


function parseMoney(text: string | null): number | null {
  if (!text) return null;
  const match = text.replace(",", "").match(/\$([\d.]+)/);
  return match ? Number(match[1]) : null;
}

async function main() {

  // 1. Scrape listings — general sterling shakers under $50, Fisher Sterling under $150
  console.log("Scraping general sterling shakers...");
  const generalListings = await searchEbayWithPlaywright("sterling silver shakers", 10, 50);

  console.log("Scraping Fisher Sterling listings...");
  const fisherListings = await searchEbayWithPlaywright("Fisher Sterling shakers", 5, 150);

  // Deduplicate by URL
  const seen = new Set<string>();
  const allListings = [...generalListings, ...fisherListings].filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  console.dir(allListings, { depth: null });

  // 2: Normalize the listings
  const normalizedListings: NormalizedPlaywrightListing[] = allListings.map((item) => {
    const price = parseMoney(item.priceText);
    const shipping = parseMoney(item.shippingText) ?? 0;

    return {
      source: "ebay",
      sourceId: null,
      title: item.title,
      url: item.url,
      price,
      shipping,
      totalCost: price !== null ? price + shipping : null,
      imageUrl: item.imageUrl,
      notes: [],
    };
  });
  console.dir(normalizedListings, { depth: null });

  // 3. Feed normalized listings to the agent with the system prompt - get back ratings and analysis
  const prompt = `
    Analyze these eBay listings and return ONLY valid JSON.

    Important:
    - These are real listings.
    - If weight is not present, DO NOT estimate — use NEEDS MORE INFO.
    - Include the listing url in the output.
    - Write a sellerMessage for any listing rated NEEDS MORE INFO asking specifically about total weight in grams or troy ounces.

    Listings:
    ${JSON.stringify(normalizedListings, null, 2)}
  `;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: silverHawkSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const { usage } = response;
  // Haiku 4.5 pricing: $0.80/MTok in, $4/MTok out, $1/MTok cache write, $0.08/MTok cache read
  const cost = (
    (usage.input_tokens * 0.80) +
    (usage.output_tokens * 4.0) +
    ((usage.cache_creation_input_tokens ?? 0) * 1.0) +
    ((usage.cache_read_input_tokens ?? 0) * 0.08)
  ) / 1_000_000;
  console.error(`tokens  in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0}`);
  console.error(`est. cost  $${cost.toFixed(5)}`);

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  const result = JSON.parse(rawText);
  console.log(JSON.stringify(result, null, 2));

  // 4. Open pre-filled contact forms for listings that need weight info
  const contactRequests = result
    .filter((item: any) => item.sellerMessage && item.url)
    .map((item: any) => ({
      title: item.title,
      listingUrl: item.url,
      message: item.sellerMessage,
    }));

  await openEbayContactForms(contactRequests);
}

main().catch(console.error);
