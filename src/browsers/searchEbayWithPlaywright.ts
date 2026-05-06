import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { PlaywrightEbayListing } from "../types/listing.js";

chromium.use(StealthPlugin());

export async function searchEbayWithPlaywright(
  searchTerm: string,
  limit = 10
): Promise<PlaywrightEbayListing[]> {
  const browser = await chromium.launch({ headless: false });

  const page = await browser.newPage();

  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    searchTerm
  )}&_sop=10&LH_BIN=1&_udhi=80`;

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

  await browser.close();

  return listings.filter((item) => item.title && !item.title.includes("Shop on eBay") && item.title !== "");
}
