import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { silverHawkSystemPrompt } from "./prompts/silverHawkSystemPrompt.js";
import { searchEbayWithPlaywright } from "./browsers/searchEbayWithPlaywright.js";
import type { NormalizedPlaywrightListing } from "./types/listing.js";

const anthropic = new Anthropic();


function parseMoney(text: string | null): number | null {
  if (!text) return null;
  const match = text.replace(",", "").match(/\$([\d.]+)/);
  return match ? Number(match[1]) : null;
}

async function main() {

  // 1. Get live listings from playwright
  const listings = await searchEbayWithPlaywright("sterling silver shakers", 10);
  console.dir(listings, { depth: null });

  // 2: Normalize the listings
  const normalizedListings: NormalizedPlaywrightListing[] = listings.map((item) => {
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
    - Do NOT include sellerMessage.

    Listings:
    ${JSON.stringify(normalizedListings, null, 2)}
  `;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: silverHawkSystemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const { usage } = response;
  // Sonnet 4.6 pricing: $3/MTok in, $15/MTok out, $3.75/MTok cache write, $0.30/MTok cache read
  const cost = (
    (usage.input_tokens * 3.0) +
    (usage.output_tokens * 15.0) +
    ((usage.cache_creation_input_tokens ?? 0) * 3.75) +
    ((usage.cache_read_input_tokens ?? 0) * 0.30)
  ) / 1_000_000;
  console.error(`tokens  in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0}`);
  console.error(`est. cost  $${cost.toFixed(5)}`);

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const result = JSON.parse(rawText);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
