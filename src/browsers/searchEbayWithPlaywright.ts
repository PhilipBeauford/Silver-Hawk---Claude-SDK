import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { PlaywrightEbayListing } from "../types/listing.js";

chromium.use(StealthPlugin());

export async function searchEbayWithPlaywright(
  searchTerm: string,
  limit = 10
): Promise<PlaywrightEbayListing[]> {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    searchTerm
  )}&_sop=10`;

  await page.goto(url, {
    waitUntil: "networkidle",
  });

  await page.waitForSelector(".s-card");

  const listings = await page.locator(".s-card").evaluateAll((items, limit) => {
    return items.slice(0, Number(limit)).map((item) => {
      const titleEl = item.querySelector(".s-card__title");
      const linkEl = item.querySelector(".s-card__link") as HTMLAnchorElement | null;
      const priceEl = item.querySelector(".s-card__price");
      const shippingEl = item.querySelector(".su-styled-text.secondary.large");
      const imgEl = item.querySelector(".s-card__image") as HTMLImageElement | null;

      return {
        title: titleEl?.textContent?.trim() ?? "",
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