import { expect, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";

export async function latestMagicLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const list = await fetch(`${MAILPIT}/api/v1/messages`);
    if (!list.ok) throw new Error("Mailpit is not reachable. Start local Supabase before this suite.");
    const body = await list.json() as { messages?: { ID: string; Created: string; To?: { Address: string }[] }[] };
    const message = (body.messages ?? [])
      .filter((item) => item.To?.some((to) => to.Address === email))
      .sort((a, b) => b.Created.localeCompare(a.Created))[0];
    if (message) {
      const detail = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`);
      const mail = await detail.json() as { HTML?: string; Text?: string };
      const source = `${mail.HTML ?? ""}\n${mail.Text ?? ""}`;
      const match = source.match(/https?:\/\/[^\s"'<>]+/);
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Magic link was not captured.");
}

export async function sendMagicLink(page: Page, email: string): Promise<string> {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" }).catch(() => undefined);
  await page.goto("/auth/login");
  await page.getByLabel("Adresse courriel").fill(email);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await page.waitForTimeout(2_000);
    await page.getByRole("button", { name: /lien magique/i }).click();
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    const text = (await status.textContent()) ?? "";
    if (/lien de connexion/i.test(text)) return latestMagicLink(email);
    if (!/security purposes/i.test(text)) throw new Error(text);
  }
  throw new Error("Magic link was rate limited.");
}
