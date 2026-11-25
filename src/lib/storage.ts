import { parseMediaRef } from "./mediaStore";
import type { Artwork, ArtworkDraft } from "./types";

export const STORAGE_KEY = "tracecraft.artworks.v1";
export const MAX_ARTWORKS = 100;

const RETIRED_KINDS = new Set([
  "bracelet",
  "card",
  "gift-box",
  "origami",
  "chinese-knots",
  "paper-cutting",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasValidSource(data: Record<string, unknown>): boolean {
  if (data.sourceKind !== "example" && data.sourceKind !== "photo") return false;
  if (typeof data.sourceName !== "string") return false;
  if (data.exampleId !== undefined && typeof data.exampleId !== "string") return false;
  if (data.photoDataUrl !== undefined && typeof data.photoDataUrl !== "string") return false;
  return true;
}

function isValidFraming(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.zoom === "number" &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
}

function isRetiredLegacyArtwork(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    RETIRED_KINDS.has(value.kind)
  );
}

function isArtwork(value: unknown): value is Artwork {
  if (!isRecord(value) || !isRecord(value.data)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.thumbnail !== "string" ||
    typeof value.createdAt !== "string"
  )
    return false;
  const data = value.data;
  if (value.kind === "beads") {
    return (
      Number.isInteger(data.columns) &&
      Number.isInteger(data.rows) &&
      Number(data.columns) > 0 &&
      Number(data.rows) > 0 &&
      Number(data.columns) <= 128 &&
      Number(data.rows) <= 128 &&
      typeof data.beadSize === "number" &&
      typeof data.sourceName === "string" &&
      Array.isArray(data.cells) &&
      data.cells.length === Number(data.columns) * Number(data.rows) &&
      data.cells.every((cell) => typeof cell === "string") &&
      Array.isArray(data.palette) &&
      data.palette.every(
        (color) =>
          isRecord(color) &&
          typeof color.code === "string" &&
          typeof color.name === "string" &&
          typeof color.color === "string",
      )
    );
  }
  if (value.kind === "embroidery") {
    return (
      hasValidSource(data) &&
      typeof data.stitchMode === "string" &&
      typeof data.gridSize === "number" &&
      typeof data.maxColors === "number" &&
      typeof data.hoopSizeCm === "number" &&
      typeof data.fabricId === "string" &&
      (data.removeBg === undefined || typeof data.removeBg === "boolean")
    );
  }
  if (value.kind === "wire-craft") {
    return (
      hasValidSource(data) &&
      typeof data.layoutMode === "string" &&
      typeof data.colorWeaveMode === "string" &&
      typeof data.contrastMode === "string" &&
      typeof data.pegCount === "number" &&
      typeof data.stepCount === "number" &&
      typeof data.threadDarkness === "number" &&
      typeof data.boardSizeCm === "number" &&
      typeof data.paletteId === "string" &&
      typeof data.usePhotoColors === "boolean" &&
      isValidFraming(data.framing)
    );
  }
  if (value.kind === "compass") {
    return (
      hasValidSource(data) &&
      typeof data.algorithm === "string" &&
      typeof data.colorMode === "string" &&
      typeof data.contrastMode === "string" &&
      typeof data.ringCount === "number" &&
      typeof data.paperSizeCm === "number" &&
      typeof data.paletteId === "string" &&
      typeof data.usePhotoColors === "boolean" &&
      isValidFraming(data.framing)
    );
  }
  if (value.kind === "carving") {
    return (
      hasValidSource(data) &&
      typeof data.algorithm === "string" &&
      typeof data.contrastMode === "string" &&
      typeof data.bridgeWidthMm === "number" &&
      typeof data.gridSize === "number" &&
      typeof data.frameSizeCm === "number" &&
      typeof data.materialId === "string" &&
      isValidFraming(data.framing) &&
      (data.mirrorPrint === undefined || typeof data.mirrorPrint === "boolean")
    );
  }
  return false;
}

export function readArtworks(storage: Pick<Storage, "getItem">): Artwork[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => isArtwork(item) || isRetiredLegacyArtwork(item))
  ) {
    throw new Error("Invalid saved artworks");
  }
  return parsed.filter(isArtwork);
}

export function writeArtworks(
  storage: Pick<Storage, "setItem">,
  artworks: Artwork[],
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(artworks));
}

export function readStepProgress(storageKey: string, signature: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { signature?: string; step?: number };
    if (parsed.signature === signature && typeof parsed.step === "number" && Number.isFinite(parsed.step)) {
      return parsed.step;
    }
  } catch {
    // Optional progress persistence never blocks UI
  }
  return null;
}

export function getArtworkPhotoRef(artwork: Artwork | ArtworkDraft): string | undefined {
  if (artwork.kind === "beads") return undefined;
  return artwork.data.photoDataUrl;
}

export function withArtworkPhotoRef<T extends Artwork | ArtworkDraft>(artwork: T, photoDataUrl: string): T {
  if (artwork.kind === "beads") return artwork;
  return {
    ...artwork,
    data: {
      ...artwork.data,
      photoDataUrl,
    },
  };
}

export function collectArtworkMediaIds(artworks: readonly (Artwork | ArtworkDraft)[]): Set<string> {
  const ids = new Set<string>();
  for (const artwork of artworks) {
    const ref = getArtworkPhotoRef(artwork);
    if (!ref) continue;
    const id = parseMediaRef(ref);
    if (id) ids.add(id);
  }
  return ids;
}

export function writeStepProgress(storageKey: string, signature: string, step: number) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ signature, step }));
  } catch {
    // Optional progress persistence never blocks UI
  }
}
