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

test("照片作品存入 IndexedDB、重载恢复预览并在删除时自动清理", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const readIdbKeys = () =>
    page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const req = indexedDB.open("tracecraft-media", 1);
          req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains("blobs")) {
              req.result.createObjectStore("blobs");
            }
          };
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction("blobs", "readonly");
            const getKeys = tx.objectStore("blobs").getAllKeys();
            getKeys.onsuccess = () => {
              resolve(Array.isArray(getKeys.result) ? getKeys.result.map(String) : []);
              db.close();
            };
            getKeys.onerror = () => {
              resolve([]);
              db.close();
            };
          };
          req.onerror = () => resolve([]);
        }),
    );

  await page.goto("/?studio=carving");
  const photoBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f7f4ec";
    ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = "#2b2a27";
    ctx.beginPath();
    ctx.arc(48, 48, 28, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[aria-label="选择雕刻画来源图片"]')
    .setInputFiles({
      name: "idb-test.png",
      mimeType: "image/png",
      buffer: Buffer.from(photoBase64, "base64"),
    });
  await expect(page.locator(".carving-board canvas")).toHaveAttribute("aria-label", /idb-test/);
  await expect(page.getByRole("button", { name: "导出图纸", exact: true })).toBeEnabled();

  await page.getByRole("button", { name: "保存作品", exact: true }).click();
  await page.getByRole("button", { name: "确认保存", exact: true }).click();
  await expect(page.getByRole("button", { name: "更新作品", exact: true })).toBeVisible();

  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tracecraft.artworks.v1") || "[]"),
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].data.photoDataUrl).toMatch(/^idb:/);
  const mediaId = String(saved[0].data.photoDataUrl).slice(4);
  expect(await readIdbKeys()).toContain(mediaId);

  // Reload to Library and re-open for editing
  await page.goto("/?studio=library");
  await page.getByRole("button", { name: /继续编辑/ }).click();
  await expect(page).toHaveURL(/studio=carving&work=/);
  const thumb = page.locator(".carving-source-image");
  await expect(thumb).toBeVisible();
  await expect(thumb).toHaveAttribute("src", /^data:image\//);
  expect(
    await thumb.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "导出图纸", exact: true })).toBeEnabled();

  // Delete in Library and verify IndexedDB blob cleanup
  await page.goto("/?studio=library");
  await page.getByRole("button", { name: /删除/ }).click();
  await page.getByRole("button", { name: "确定删除", exact: true }).click();
  await expect.poll(readIdbKeys).toEqual([]);
  expect(errors).toEqual([]);
});

test("旧版内联图片数据在加载后静默迁入 IndexedDB 且可继续编辑", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#222222";
    ctx.fillRect(16, 16, 32, 32);
    const dataUrl = canvas.toDataURL("image/png");
    const legacyWork = {
      id: "legacy-photo-work",
      name: "旧照片雕刻",
      kind: "carving",
      thumbnail: dataUrl,
      createdAt: "2026-11-20T00:00:00.000Z",
      data: {
        sourceKind: "photo",
        sourceName: "legacy.png",
        photoDataUrl: dataUrl,
        algorithm: "positive-stencil",
        contrastMode: "portrait",
        bridgeWidthMm: 1.8,
        gridSize: 128,
        frameSizeCm: 20,
        materialId: "ivory-papercut",
        framing: { zoom: 1, x: 0.5, y: 0.5 },
      },
    };
    localStorage.setItem("tracecraft.artworks.v1", JSON.stringify([legacyWork]));
  });

  await page.goto("/?studio=library");
  await expect.poll(async () => {
    const items = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tracecraft.artworks.v1") || "[]"),
    );
    return items[0]?.data?.photoDataUrl ?? "";
  }).toMatch(/^idb:/);

  await page.getByRole("button", { name: /继续编辑/ }).click();
  await expect(page).toHaveURL(/studio=carving&work=legacy-photo-work/);
  await expect(page.locator(".carving-source-image")).toHaveAttribute("src", /^data:image\//);
  await expect(page.getByRole("button", { name: "导出图纸", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
