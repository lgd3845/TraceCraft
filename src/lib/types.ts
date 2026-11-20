export type Route = "home" | "bracelet" | "beads" | "gift-box" | "library";
export type BeadMaterial = "glass" | "pearl" | "wood" | "crystal" | "spacer";

export interface BraceletBead {
  id: string;
  name: string;
  color: string;
  size: number;
  material: BeadMaterial;
}

export interface BraceletData {
  beads: BraceletBead[];
  wristSize: number;
  cordColor: string;
}

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

export interface GiftBoxItem {
  id: string;
  artworkId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface GiftBoxData {
  shape: "rectangle" | "square";
  color: string;
  fillerColor: string;
  ribbonColor: string;
  items: GiftBoxItem[];
  note: string;
}

type ArtworkContent =
  | { kind: "bracelet"; data: BraceletData }
  | { kind: "beads"; data: BeadsData }
  | { kind: "gift-box"; data: GiftBoxData };

export type ArtworkDraft = ArtworkContent & { name: string; thumbnail: string };
export type Artwork = ArtworkDraft & { id: string; createdAt: string };

export interface StudioContextValue {
  artworks: Artwork[];
  route: Route;
  editingArtwork: Artwork | null;
  navigate: (route: Route, artworkId?: string) => void;
  saveArtwork: (draft: ArtworkDraft, existingId?: string) => Artwork | null;
  deleteArtwork: (id: string) => void;
  notify: (message: string) => void;
}
