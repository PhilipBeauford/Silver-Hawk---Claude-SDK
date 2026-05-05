import { query } from "@anthropic-ai/claude-agent-sdk";
import { silverHawkSystemPrompt } from "./prompts/silverHawkSystemPrompt.js";

async function main() {
  const prompt = `
    Analyze these fake listings and tell me whether each is worth pursuing based on the silver content and price. Use the deal rules and guidelines in the system prompt to evaluate each listing.:

    Title: Vintage small sterling silver salt and pepper shakers - not weighted
    Price: $38
    Shipping: $7
    Claimed weight: 20g total
    Notes: Seller says "not weighted" in description.

    Title: Vintage Fisher sterling silver weighted base salt and pepper shakers
    Price: $58
    Shipping: $7
    Claimed weight: 117g total for both shakers
    Notes: Seller says "weighted base" in description.

  `;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: silverHawkSystemPrompt,
    },
  })) {
    console.log(message);
  }
}

main().catch(console.error);