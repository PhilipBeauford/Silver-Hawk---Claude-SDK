import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PROFILE = path.resolve(__dirname, "../../tmp/ebay-session");

export interface ContactRequest {
  title: string;
  listingUrl: string;
  message: string;
}


export async function openEbayContactForms(requests: ContactRequest[]): Promise<void> {
  if (requests.length === 0) return;

  console.log(`\nOpening ${requests.length} contact form(s)...`);
  console.log("If this is your first run, log into eBay in the browser that opens.\n");

  const context = await chromium.launchPersistentContext(SESSION_PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  for (const req of requests) {
    const page = await context.newPage();

    try {
      await page.goto(req.listingUrl, { waitUntil: "load", timeout: 30000 });

      // Click the parent button that contains the Message text span
      const messageBtn = page.locator("button, a").filter({
        has: page.locator(".ux-call-to-action__text", { hasText: "Message" }),
      }).first();
      await messageBtn.waitFor({ timeout: 10000 });
      await messageBtn.click();

      // Wait for the side chat panel to animate open
      await page.waitForTimeout(2000);
      await page.waitForSelector(".textbox.textbox--fluid textarea", { timeout: 15000 });
      const input = page.locator(".textbox.textbox--fluid textarea");

      await input.click();
      await input.pressSequentially(req.message, { delay: 10 });
      console.log(`Ready to send: ${req.title}`);
    } catch {
      console.warn(`Could not pre-fill form for: ${req.title} — fill it manually in the tab.`);
    }
  }

  console.log("\nAll tabs open. Send each message then close the browser window when done.");

  // Keep the process alive until the user closes the browser window
  await new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      if (context.pages().length === 0) {
        clearInterval(poll);
        resolve();
      }
    }, 1000);
  });
}
