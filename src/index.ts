import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { silverHawkSystemPrompt } from "./prompts/silverHawkSystemPrompt.js";
import { searchEbayWithPlaywright } from "./browsers/searchEbayWithPlaywright.js";
import type { NormalizedPlaywrightListing } from "./types/listing.js";


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

  // Response handling with token usage tracking
  let rawText = "";
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

  for await (const message of query({
    prompt,
    options: { systemPrompt: silverHawkSystemPrompt },
  })) {
    if (message.type === "assistant" && message.message?.usage) {
      const msgUsage = message.message.usage;
      usage.input      += msgUsage.input_tokens                ?? 0;
      usage.output     += msgUsage.output_tokens               ?? 0;
      usage.cacheRead  += msgUsage.cache_read_input_tokens     ?? 0;
      usage.cacheWrite += msgUsage.cache_creation_input_tokens ?? 0;
    }
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) rawText += block.text;
      }
    }
    if (message.type === "result") {
      // Sonnet 4.6 pricing: $3/MTok in, $15/MTok out, $3.75/MTok cache write, $0.30/MTok cache read
      const cost = (usage.input * 3.0 + usage.output * 15.0 + usage.cacheWrite * 3.75 + usage.cacheRead * 0.30) / 1_000_000;
      console.error(`tokens  in=${usage.input} out=${usage.output} cache_read=${usage.cacheRead} cache_write=${usage.cacheWrite}`);
      console.error(`est. cost  $${cost.toFixed(5)}`);
    }
  }

  const result = JSON.parse(rawText);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
