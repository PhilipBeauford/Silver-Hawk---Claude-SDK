# Silver Hawk

An eBay sterling silver commodity intelligence agent powered by Claude AI. Silver Hawk searches eBay listings, estimates sterling silver content and price-per-gram, and returns AI-driven deal ratings to surface underpriced buying opportunities.

---

## What It Does

1. **Searches eBay** for sterling silver items via Playwright browser automation
2. **Normalizes listing data** — extracts price, shipping, title, and image URL
3. **Sends listings to Claude** with a domain-expert system prompt encoding precious-metals pricing rules
4. **Returns structured JSON** with deal ratings (`STRONG BUY`, `MAYBE`, `PASS`, `NEEDS MORE INFO`), estimated grams of sterling, price-per-gram, risk notes, and optional seller follow-up messages
5. **Logs token usage and cost** (input, output, cache read/write) for every run

---

## Architecture

```
eBay (browser)
      │
searchEbayWithPlaywright.ts   ← Playwright scrapes listing cards
      │
normalizeEbayItem.ts          ← Flattens raw DOM data into typed objects
      │
NormalizedPlaywrightListing[]
      │
Claude Agent SDK (query)      ← Streams response against silverHawkSystemPrompt
      │
JSON deal analysis            ← Parsed and printed to console
```

An alternate eBay Browse API path (`src/ebay/`) exists alongside the Playwright path but is not currently wired into the main flow.

---

## Deal Rating Rules (embedded in system prompt)

| Price per gram | Rating |
|---|---|
| ≤ $1.20 | STRONG BUY |
| $1.21 – $1.50 | GOOD |
| $1.51 – $2.00 | MAYBE |
| > $2.00 | PASS |

Special rules apply for shakers, Fisher Sterling pieces, and listings with missing weight data. See [src/prompts/silverHawkSystemPrompt.ts](src/prompts/silverHawkSystemPrompt.ts) for the full ruleset.

---

## Project Structure

```
src/
├── index.ts                          Entry point — orchestrates search → AI → output
├── browsers/
│   └── searchEbayWithPlaywright.ts   Browser automation (Playwright/Chrome)
├── ebay/
│   ├── getEbayAccessToken.ts         OAuth2 token cache for eBay API
│   ├── normalizeEbayItem.ts          eBay API response → NormalizedListing
│   └── searchEbay.ts                 eBay Browse API search
├── prompts/
│   └── silverHawkSystemPrompt.ts     Domain-expert system prompt
├── tools/
│   └── evaluateListing.ts            Local deal-rating helper (mirrors AI rules)
└── types/
    └── listing.ts                    Shared TypeScript types
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install Playwright browser

```bash
npx playwright install chromium
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional — only needed if using the eBay Browse API path
EBAY_CLIENT_ID=your_ebay_app_id
EBAY_CLIENT_SECRET=your_ebay_cert_id
EBAY_MARKETPLACE_ID=EBAY_US
```

Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com).  
Get eBay API credentials at [developer.ebay.com](https://developer.ebay.com).

---

## Running

```bash
npm run dev
```

The agent will open a Chrome window, search eBay for `"sterling silver shakers"`, send the top 10 listings to Claude, and print a JSON deal analysis along with token usage and estimated cost.

---

## Claude Output Format

```json
[
  {
    "title": "Vintage Reed & Barton Sterling Shaker",
    "rating": "STRONG BUY",
    "totalCost": 34.99,
    "estimatedSterlingGrams": 280,
    "pricePerGram": 1.12,
    "riskNotes": ["Condition not specified — verify no cracks"],
    "sellerMessage": null
  }
]
```

---

## Cost Tracking

Every run logs Claude token usage with estimated costs based on Sonnet 4.6 pricing:

```
Tokens used — input: 2400 | output: 800 | cache_write: 1800 | cache_read: 0
Estimated cost: $0.0198
```

The system prompt is long and static — it benefits from [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), which reduces cost on repeated runs.

---

## Dependencies

| Package | Purpose |
|---|---|
| `@anthropic-ai/claude-agent-sdk` | Streaming Claude agent query API |
| `@anthropic-ai/sdk` | Anthropic base SDK |
| `playwright` | Chrome browser automation |
| `dotenv` | Environment variable loading |
| `tsx` | TypeScript execution (dev) |

---

## Creating a Pull Request with Claude

Silver Hawk uses Claude Code (the AI CLI) for development. Here's how to open a PR through Claude:

### Prerequisites
- Remote must be set to HTTPS (not SSH):
  ```bash
  git remote set-url origin https://github.com/PhilipBeauford/Silver-Hawk---Claude-SDK.git
  ```
- `gh` CLI installed and authenticated (or use the GitHub URL Claude provides)

### Steps

1. **Make your changes** — edit files as needed with Claude's help

2. **Say `gh pr create`** in the Claude chat — Claude will:
   - Commit any unstaged changes with a descriptive message
   - Push the branch to origin (`git push -u origin <branch>`)
   - Create the PR against `main` with a structured summary

3. **If `gh` is unavailable**, Claude will provide a direct GitHub URL to open the PR manually — e.g.:
   ```
   https://github.com/PhilipBeauford/Silver-Hawk---Claude-SDK/pull/new/<branch-name>
   ```

### Notes
- Claude works on whichever branch is currently checked out
- PR descriptions will not include Claude branding
- You will be prompted to approve the push before it happens

### gh CLI PATH fix (Windows)
If `gh` isn't found when Claude runs commands, add this to `.claude/settings.json`:
```json
"env": {
  "PATH": "C:\\Program Files\\GitHub CLI;$PATH"
}
```

---

## Known Limitations

- Search term (`"sterling silver shakers"`) is hardcoded in [src/index.ts](src/index.ts) — no CLI argument support yet
- Playwright runs with `headless: false` (visible browser window) — set to `true` for production/CI
- The eBay Browse API search path is implemented but not used in the main flow
- `src/tools/searchListings.ts` and `src/utils/` are empty stubs
