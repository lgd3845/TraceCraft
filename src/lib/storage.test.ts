import { describe, expect, it } from "vitest";
import { readArtworks, STORAGE_KEY, writeArtworks } from "./storage";
import type { Artwork } from "./types";

const artwork: Artwork = {
  id: "sample",
  name: "小雏菊拼豆",
  kind: "beads",
  thumbnail: "",
  createdAt: "2026-11-20",
  data: {
    columns: 2,
    rows: 2,
    cells: ["A1", "", "", "A1"],
    palette: [{ code: "A1", name: "奶油白", color: "#fffdf7" }],
    beadSize: 5,
    sourceName: "示例",
  },
};

describe("local artwork storage", () => {
  it("starts with an empty library", () => {
    expect(readArtworks({ getItem: () => null })).toEqual([]);
  });
  it("round-trips complete artwork data", () => {
    let saved = "";
    writeArtworks(
      {
        setItem: (key, value) => {
          expect(key).toBe(STORAGE_KEY);
          saved = value;
        },
      },
      [artwork],
    );
    expect(readArtworks({ getItem: () => saved })).toEqual([artwork]);
  });

  it("round-trips all 5 studio artwork kinds", () => {
    const sampleArtworks = [
      artwork,
      {
        id: "emb-1",
        kind: "embroidery",
        name: "刺绣山茶",
        thumbnail: "data:image/png;base64,thumb",
        createdAt: "2026-11-22T10:00:00.000Z",
        data: {
          sourceKind: "example",
          exampleId: "camellia",
          sourceName: "山茶花开",
          stitchMode: "long-short",
          gridSize: 72,
          maxColors: 12,
          hoopSizeCm: 15,
          fabricId: "linen-natural",
        },
      },
      {
        id: "wire-1",
        kind: "wire-craft",
        name: "绕线狐狸",
        thumbnail: "data:image/png;base64,thumb",
        createdAt: "2026-11-22T10:00:00.000Z",
        data: {
          sourceKind: "example",
          exampleId: "fox",
          sourceName: "几何狐狸",
          layoutMode: "ring",
          colorWeaveMode: "mono",
          contrastMode: "portrait",
          pegCount: 160,
          stepCount: 900,
          threadDarkness: 0.25,
          boardSizeCm: 30,
          paletteId: "classic-noir",
          usePhotoColors: false,
          framing: { zoom: 1, x: 0, y: 0 },
        },
      },
      {
        id: "compass-1",
        kind: "compass",
        name: "圆规玫瑰",
        thumbnail: "data:image/png;base64,thumb",
        createdAt: "2026-11-22T10:00:00.000Z",
        data: {
          sourceKind: "example",
          exampleId: "rose",
          sourceName: "三心叠交玫瑰",
          algorithm: "concentric-arcs",
          colorMode: "mono",
          contrastMode: "portrait",
          ringCount: 40,
          paperSizeCm: 30,
          paletteId: "ink-parchment",
          usePhotoColors: false,
          framing: { zoom: 1, x: 0, y: 0 },
        },
      },
      {
        id: "carv-1",
        kind: "carving",
        name: "林间鹿影",
        thumbnail: "data:image/png;base64,thumb",
        createdAt: "2026-11-22T10:00:00.000Z",
        data: {
          sourceKind: "example",
          exampleId: "deer",
          sourceName: "林间鹿影",
          algorithm: "positive-stencil",
          contrastMode: "portrait",
          bridgeWidthMm: 2,
          gridSize: 120,
          frameSizeCm: 24,
          materialId: "ivory-papercut",
          framing: { zoom: 1, x: 0, y: 0 },
        },
      },
    ] as typeof artwork[];

    let saved = "";
    writeArtworks(
      {
        setItem: (_key, value) => {
          saved = value;
        },
      },
      sampleArtworks,
    );
    expect(readArtworks({ getItem: () => saved })).toEqual(sampleArtworks);
  });
  it("silently ignores retired legacy artworks while returning valid ones", () => {
    const legacy = {
      id: "old-bracelet",
      name: "旧手串",
      kind: "bracelet",
      createdAt: "2026-11-20",
      data: {},
    };
    const legacyCard = {
      id: "old-card",
      name: "旧贺卡",
      kind: "card",
      createdAt: "2026-11-20",
      data: {},
    };
    expect(
      readArtworks({
        getItem: () => JSON.stringify([legacy, artwork, legacyCard]),
      }),
    ).toEqual([artwork]);
  });
  it("rejects corrupt saved content", () => {
    expect(() => readArtworks({ getItem: () => "{" })).toThrow();
    expect(() =>
      readArtworks({ getItem: () => '[{"kind":"beads"}]' }),
    ).toThrow();
    expect(() =>
      readArtworks({
        getItem: () =>
          JSON.stringify([{ ...artwork, data: { cells: ["invalid"] } }]),
      }),
    ).toThrow();
  });
  it("surfaces storage quota failures", () => {
    expect(() =>
      writeArtworks(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        [artwork],
      ),
    ).toThrow("quota");
  });
});
