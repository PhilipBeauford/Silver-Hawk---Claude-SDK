import { query } from "@anthropic-ai/claude-agent-sdk";
import { silverHawkSystemPrompt } from "./prompts/silverHawkSystemPrompt.js";

async function main() {
  const prompt = `
    Analyze these fake listings and tell me whether each is worth pursuing based on the silver content and price. Use the deal rules and guidelines in the system prompt to evaluate each listing.:

    Title: Vintage small sterling silver salt and pepper shakers - not weighted
    Price: $25
    Shipping: $7
    Claimed weight: 20g total
    Notes: Seller says "not weighted" in description.

    Title: Vintage Fisher sterling silver weighted base large dish 4" diameter 1" tall
    Price: $138
    Shipping: $10
    Claimed weight: 316g total
    Notes: Seller says "weighted base" in description.

  `;

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
