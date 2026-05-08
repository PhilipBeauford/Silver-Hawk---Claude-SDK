import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import type { PlaywrightEbayListing } from "../types/listing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PROFILE = path.resolve(__dirname, "../../tmp/ebay-session");

export async function searchEtsyWithPlaywright(
  searchTerm: string,
  limit = 8,
  maxPrice = 55
): Promise<PlaywrightEbayListing[]> {
  const context = await chromium.launchPersistentContext(SESSION_PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  const page = await context.newPage();

  await page.goto("https://www.etsy.com", { waitUntil: "domcontentloaded" });

  console.log("\nEtsy browser is open. Log in if prompted, then press Enter to begin the search...");
  await new Promise<void>(resolve => process.stdin.once("data", resolve));

  const url = `https://www.etsy.com/search?q=${encodeURIComponent(searchTerm)}&order=date_desc&max_price=${maxPrice}&explicit=1`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-listing-id]");

  const listings = await page.locator("[data-listing-id]").evaluateAll((items, limit) => {
    return items.slice(0, Number(limit)).map((item) => {
      const linkEl = item.querySelector("a[href*='/listing/']") as HTMLAnchorElement | null;
      const titleEl = item.querySelector("h3");
      const priceEl = item.querySelector(".currency-value");
      const imgEl = item.querySelector("img") as HTMLImageElement | null;

      return {
        title: titleEl?.textContent?.trim() ?? "",
        url: linkEl?.href ?? null,
        priceText: priceEl ? `$${priceEl.textContent?.trim()}` : null,
        shippingText: null,
        imageUrl: imgEl?.src ?? null,
      };
    });
  }, limit);

  await context.close();

  return listings.filter((item) => item.title && item.url);
}
