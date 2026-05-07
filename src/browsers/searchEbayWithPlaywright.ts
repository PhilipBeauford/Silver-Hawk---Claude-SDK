import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import type { PlaywrightEbayListing } from "../types/listing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PROFILE = path.resolve(__dirname, "../../tmp/ebay-session");

export async function searchEbayWithPlaywright(
  searchTerm: string,
  limit = 10,
  maxPrice = 50
): Promise<PlaywrightEbayListing[]> {
  const context = await chromium.launchPersistentContext(SESSION_PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  const page = await context.newPage();

  await page.goto("https://www.ebay.com", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_sop=10&LH_BIN=1&_udhi=${maxPrice}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".s-card");

  const listings = await page.locator(".s-card").evaluateAll((items, limit) => {
    return items.slice(0, Number(limit)).map((item) => {
      const titleEl = item.querySelector(".s-card__title");
      const linkEl = item.querySelector(".s-card__link") as HTMLAnchorElement | null;
      const priceEl = item.querySelector(".s-card__price");
      const shippingEl = item.querySelectorAll(".su-styled-text.secondary.large")[1] ?? null;
      const imgEl = item.querySelector(".s-card__image") as HTMLImageElement | null;

      const rawTitle = titleEl?.textContent?.trim() ?? "";
      const title = rawTitle
        .replace(/^New Listing/, "")
        .replace(/Opens in a new window or tab$/, "")
        .trim();

      return {
        title,
        url: linkEl?.href ?? null,
        priceText: priceEl?.textContent?.trim() ?? null,
        shippingText: shippingEl?.textContent?.trim() ?? null,
        imageUrl: imgEl?.src ?? null,
      };
    });
  }, limit);

  await context.close();

  return listings.filter((item) => item.title && !item.title.includes("Shop on eBay") && item.title !== "");
}
