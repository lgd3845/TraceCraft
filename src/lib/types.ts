export type Route = "home" | "beads" | "wire-craft" | "embroidery" | "compass" | "carving" | "library";

export interface BeadColor {
  code: string;
  name: string;
  color: string;
}

export interface BeadsData {
  columns: number;
  rows: number;
  cells: string[];
  palette: BeadColor[];
  beadSize: number;
  sourceName: string;
}

export interface SavedFraming {
  zoom: number;
  x: number;
  y: number;
}

export interface EmbroideryArtworkData {
  sourceKind: "example" | "photo";
  exampleId?: string;
  sourceName: string;
  photoDataUrl?: string;
  stitchMode: "long-short" | "cross-stitch" | "punch-needle";
  gridSize: number;
  maxColors: number;
  hoopSizeCm: number;
  fabricId: string;
  removeBg?: boolean;
}

export interface WireCraftArtworkData {
  sourceKind: "example" | "photo";
  exampleId?: string;
  sourceName: string;
  photoDataUrl?: string;
  layoutMode: "ring" | "contour";
  colorWeaveMode: "mono" | "multi";
  contrastMode: "soft" | "portrait" | "dramatic";
  pegCount: number;
  stepCount: number;
  threadDarkness: number;
  boardSizeCm: number;
  paletteId: string;
  usePhotoColors: boolean;
  framing: SavedFraming;
}

export interface CompassArtworkData {
  sourceKind: "example" | "photo";
  exampleId?: string;
  sourceName: string;
  photoDataUrl?: string;
  algorithm: "concentric-arcs" | "archimedean-spiral" | "multi-center-intersect";
  colorMode: "mono" | "multi";
  contrastMode: "soft" | "portrait" | "dramatic";
  ringCount: number;
  paperSizeCm: number;
  paletteId: string;
  usePhotoColors: boolean;
  framing: SavedFraming;
}

export interface CarvingArtworkData {
  sourceKind: "example" | "photo";
  exampleId?: string;
  sourceName: string;
  photoDataUrl?: string;
  algorithm: "positive-stencil" | "woodcut-relief" | "layered-shadowbox";
  contrastMode: "soft" | "portrait" | "dramatic";
  bridgeWidthMm: number;
  gridSize: number;
  frameSizeCm: number;
  materialId: string;
  framing: SavedFraming;
  mirrorPrint?: boolean;
}

type ArtworkContent =
  | { kind: "beads"; data: BeadsData }
  | { kind: "embroidery"; data: EmbroideryArtworkData }
  | { kind: "wire-craft"; data: WireCraftArtworkData }
  | { kind: "compass"; data: CompassArtworkData }
  | { kind: "carving"; data: CarvingArtworkData };

export type ArtworkDraft = ArtworkContent & { name: string; thumbnail: string };
export type Artwork = ArtworkDraft & { id: string; createdAt: string };

export interface StudioContextValue {
  artworks: Artwork[];
  route: Route;
  editingArtwork: Artwork | null;
  navigate: (route: Route, artworkId?: string) => void;
  saveArtwork: (draft: ArtworkDraft, existingId?: string) => Artwork | null | Promise<Artwork | null>;
  deleteArtwork: (id: string) => void;
  notify: (message: string) => void;
}
