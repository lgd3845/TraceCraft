import { expect, test } from "@playwright/test";

const sample = {
  id: "library-sample",
  name: "测试心意",
  createdAt: "2026-11-20T00:00:00.000Z",
  kind: "bracelet",
  thumbnail:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="30" fill="none" stroke="green"/%3E%3C/svg%3E',
  data: {
    beads: [
      { id: "bead-1", name: "珍珠", color: "#eee", size: 8, material: "pearl" },
    ],
    wristSize: 16,
    cordColor: "#fff",
  },
};

test("首页、指南与移动端导航可用且没有横向溢出", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "小小手作，大大心意。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "打开创作指南" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
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
      localStorage.setItem("giftcraft.artworks.v1", JSON.stringify([work])),
    sample,
  );
  await page.goto("/?studio=library");
  await expect(
    page.getByRole("heading", { name: "测试心意", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "拼豆作品", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "这个分类还没有作品" }),
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
      JSON.parse(localStorage.getItem("giftcraft.artworks.v1")!),
    ),
  ).toEqual([]);
});

test("引用中的作品不会被删除，避免破坏礼盒", async ({ page }) => {
  const box = {
    id: "box",
    name: "测试礼盒",
    kind: "gift-box",
    thumbnail: sample.thumbnail,
    createdAt: sample.createdAt,
    data: {
      shape: "square",
      color: "#eee",
      fillerColor: "#ccc",
      ribbonColor: "#aaa",
      note: "",
      items: [
        {
          id: "placed",
          artworkId: sample.id,
          x: 50,
          y: 50,
          rotation: 0,
          scale: 1,
        },
      ],
    },
  };
  await page.addInitScript(
    (works) =>
      localStorage.setItem("giftcraft.artworks.v1", JSON.stringify(works)),
    [sample, box],
  );
  await page.goto("/?studio=library");
  await page.getByRole("button", { name: "删除测试心意" }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("这份作品还在礼盒里");
  await expect(
    page.getByRole("heading", { name: "测试心意", exact: true }),
  ).toBeVisible();
});

test("损坏的本地数据明确报错并保留原数据", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("giftcraft.artworks.v1", "{bad-json"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("暂时无法读取本地作品");
  expect(
    await page.evaluate(() => localStorage.getItem("giftcraft.artworks.v1")),
  ).toBe("{bad-json");
});
