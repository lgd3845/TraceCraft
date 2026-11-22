import { expect, test } from "@playwright/test";

const sample = {
  id: "library-sample",
  name: "测试心意",
  createdAt: "2026-11-20T00:00:00.000Z",
  kind: "beads",
  thumbnail:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="30" fill="none" stroke="green"/%3E%3C/svg%3E',
  data: {
    columns: 2,
    rows: 2,
    cells: ["A1", "", "", "A1"],
    palette: [{ code: "A1", name: "奶油白", color: "#fffdf7" }],
    beadSize: 5,
    sourceName: "示例",
  },
};

test("首页与移动端导航可用且没有横向溢出，无顶部栏", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "小小手作，大大心意。" }),
  ).toBeVisible();
  await expect(page.locator(".topbar")).toHaveCount(0);
  await expect(page.getByText("我的工作台")).toHaveCount(0);
  await expect(page.getByText("灵感在这里，心意在手里")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (page.viewportSize()!.width < 700) {
    const menu = page.getByRole("button", { name: "打开导航" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
  }
  await page.getByRole("button", { name: "我的作品 0", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "第一份心意，正在等你" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "小小手作，大大心意。" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("作品库可读取本地作品、筛选并确认删除", async ({ page }) => {
  await page.addInitScript(
    (work) =>
      localStorage.setItem("tracecraft.artworks.v1", JSON.stringify([work])),
    sample,
  );
  await page.goto("/?studio=library");
  await expect(
    page.getByRole("heading", { name: "测试心意", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "拼豆作品", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "测试心意", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "全部作品", exact: true }).click();
  await page.getByRole("button", { name: "删除测试心意" }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "测试心意", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "删除测试心意" }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "第一份心意，正在等你" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tracecraft.artworks.v1")!),
    ),
  ).toEqual([]);
});

test("点击继续编辑可将作品还原到对应工坊", async ({ page }) => {
  await page.addInitScript(
    (work) =>
      localStorage.setItem("tracecraft.artworks.v1", JSON.stringify([work])),
    sample,
  );
  await page.goto("/?studio=library");
  await page.getByRole("button", { name: /继续编辑/ }).click();
  await expect(page).toHaveURL(/studio=beads&work=library-sample/);
  await page.getByRole("button", { name: "更新作品", exact: true }).click();
  await expect(page.locator("#beads-name")).toHaveValue("测试心意");
  await page.getByRole("button", { name: "取消", exact: true }).click();
});

test("损坏或旧版残留的本地数据不显示丑陋警告且保持正常创作", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("tracecraft.artworks.v1", "{bad-json"),
  );
  await page.goto("/");
  await expect(page.locator(".storage-warning")).toHaveCount(0);
  await expect(page.getByText("暂时无法读取本地作品")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("tracecraft.artworks.v1")),
  ).toBe("{bad-json");

  await page.addInitScript(
    (work) =>
      localStorage.setItem(
        "tracecraft.artworks.v1",
        JSON.stringify([
          { id: "legacy-1", kind: "card", name: "旧贺卡", data: {} },
          work,
        ]),
      ),
    sample,
  );
  await page.goto("/?studio=library");
  await expect(page.locator(".storage-warning")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "测试心意", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
