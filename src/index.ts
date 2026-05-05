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

  for await (const message of query({
    prompt,
    options: { systemPrompt: silverHawkSystemPrompt },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) rawText += block.text;
      }
    }
  }

  const result = JSON.parse(rawText);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
