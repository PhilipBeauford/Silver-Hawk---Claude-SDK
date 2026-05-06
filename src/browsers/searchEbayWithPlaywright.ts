import { chromium } from "playwright";
import type { PlaywrightEbayListing } from "../types/listing.js";

export async function searchEbayWithPlaywright(
  searchTerm: string,
  limit = 10
): Promise<PlaywrightEbayListing[]> {
  const browser = await chromium.launch({
    headless: false, // keep false while developing
  });

  const page = await browser.newPage();

  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    searchTerm
  )}&_sop=10`;

  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector(".s-item");

  const listings = await page.locator(".s-item").evaluateAll((items, limit) => {
    return items.slice(0, Number(limit)).map((item) => {
      const titleEl = item.querySelector(".s-item__title");
      const linkEl = item.querySelector(".s-item__link") as HTMLAnchorElement | null;
      const priceEl = item.querySelector(".s-item__price");
      const shippingEl = item.querySelector(".s-item__shipping, .s-item__logisticsCost");
      const imgEl = item.querySelector(".s-item__image img") as HTMLImageElement | null;

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

  return listings.filter((item) => item.title && !item.title.includes("Shop on eBay"));
}