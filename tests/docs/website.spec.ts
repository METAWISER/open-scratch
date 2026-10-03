import { test, expect } from "@playwright/test";
test("documentation navigation, search, code copy and theme", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your next idea starts here.",
  );
  await page.screenshot({
    path: "test-results/docs-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Copy code example" }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "21 * 2",
  );
  await page.getByLabel("Search documentation").fill("NuGet");
  await page
    .getByRole("navigation", { name: "Search results" })
    .getByRole("link", { name: "C# / .NET", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "C# playground",
  );
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/?page=learn");
  await expect(page.locator(".examples article")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Copy example", exact: true })
    .first()
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "reduce",
  );
});
test("mobile navigation and every guide render without missing content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Documentation", exact: true })
    .getByRole("link", { name: "Python", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Python playground",
  );
  await page.screenshot({
    path: "test-results/docs-mobile.png",
    fullPage: true,
  });
  for (const id of [
    "start",
    "editor",
    "execution",
    "learn",
    "browser",
    "languages",
    "python",
    "csharp",
    "security",
    "ai",
    "parity",
    "contribute",
    "releases",
  ]) {
    await page.goto(`/?page=${id}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(await page.locator(".article").innerText()).not.toContain(
      "Page not found",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
