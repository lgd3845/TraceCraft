import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Compass,
  Scissors,
  Flower2,
  Grid2X2,
  Heart,
  House,
  Layers3,
  Menu,
  Paperclip,
  Spline,
  X,
} from "lucide-react";
import Home from "./components/Home";
import Library from "./components/Library";
import { StudioContext } from "./lib/studio";
import {
  dataUrlToBlob,
  deleteMediaBlobs,
  parseMediaRef,
  pruneUnusedMediaBlobs,
  putMediaBlob,
  toMediaRef,
} from "./lib/mediaStore";
import {
  collectArtworkMediaIds,
  getArtworkPhotoRef,
  MAX_ARTWORKS,
  readArtworks,
  STORAGE_KEY,
  withArtworkPhotoRef,
  writeArtworks,
} from "./lib/storage";
import type { Artwork, ArtworkDraft, Route } from "./lib/types";

const BeadsStudio = lazy(() => import("./modules/beads/BeadsStudio"));
const WireCraftStudio = lazy(() => import("./modules/wire-craft/WireCraftStudio"));
const EmbroideryStudio = lazy(() => import("./modules/embroidery/EmbroideryStudio"));
const CompassStudio = lazy(() => import("./modules/compass/CompassStudio"));
const CarvingStudio = lazy(() => import("./modules/carving/CarvingStudio"));

const routes: Route[] = ["home", "beads", "wire-craft", "embroidery", "compass", "carving", "library"];
const routeNames: Record<Route, string> = {
  home: "创作灵感",
  beads: "拼豆工坊",
  embroidery: "刺绣工坊",
  "wire-craft": "绕线画工坊",
  compass: "圆规画工坊",
  carving: "雕刻画工坊",
  library: "我的作品",
};
const nav = [
  { route: "home" as const, title: "创作灵感", icon: House },
  { route: "beads" as const, title: "拼豆工坊", icon: Grid2X2 },
  { route: "embroidery" as const, title: "刺绣工坊", icon: Spline },
  { route: "wire-craft" as const, title: "绕线画工坊", icon: Paperclip },
  { route: "compass" as const, title: "圆规画工坊", icon: Compass },
  { route: "carving" as const, title: "雕刻画工坊", icon: Scissors },
];

function readLocation() {
  const query = new URLSearchParams(window.location.search);
  const route = query.get("studio") as Route;
  return {
    route: routes.includes(route) ? route : ("home" as Route),
    artworkId: query.get("work"),
  };
}

export default function App() {
  const [location, setLocation] = useState(readLocation);
  const [navigationId, setNavigationId] = useState(0);
  const [initial] = useState(() => {
    try {
      return { artworks: readArtworks(localStorage), error: false };
    } catch {
      return { artworks: [], error: true };
    }
  });
  const corruptBackupPending = useRef(initial.error);
  const [artworks, setArtworks] = useState<Artwork[]>(initial.artworks);
  const artworksRef = useRef(artworks);
  const inFlightMediaIdsRef = useRef<Set<string>>(new Set());
  const [notification, setNotification] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const { route, artworkId } = location;
  const editingArtwork =
    artworks.find((artwork) => artwork.id === artworkId) ?? null;
  const notify = useCallback((message: string) => setNotification(message), []);

  const navigate = useCallback((next: Route, id?: string) => {
    const query = new URLSearchParams();
    if (next !== "home") query.set("studio", next);
    if (id) query.set("work", id);
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}${query.size ? `?${query}` : ""}`,
    );
    setLocation({ route: next, artworkId: id ?? null });
    setNavigationId(value => value + 1);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setLocation(readLocation());
      setNavigationId(value => value + 1);
      setMobileNav(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notification]);
  useEffect(() => {
    document.title = `${routeNames[route]} · TraceCraft 造物工坊`;
  }, [route]);

  useEffect(() => {
    if (corruptBackupPending.current) return;
    let cancelled = false;
    const initialList = artworksRef.current;
    const legacyEntries = initialList
      .map((work) => ({ id: work.id, ref: getArtworkPhotoRef(work) }))
      .filter((entry): entry is { id: string; ref: string } => Boolean(entry.ref && entry.ref.startsWith("data:")));

    const runMaintenance = async () => {
      if (legacyEntries.length > 0) {
        const replacements = new Map<string, { oldRef: string; newRef: string }>();
        for (const entry of legacyEntries) {
          if (cancelled) return;
          try {
            const mediaId = `${entry.id}-${crypto.randomUUID().slice(0, 8)}`;
            const stored = await putMediaBlob(mediaId, dataUrlToBlob(entry.ref));
            if (stored) {
              replacements.set(entry.id, { oldRef: entry.ref, newRef: toMediaRef(mediaId) });
            }
          } catch {
            // Keep inline fallback if migration of this entry fails
          }
        }
        if (cancelled) return;
        if (replacements.size > 0) {
          const latest = artworksRef.current;
          let changed = false;
          const migrated = latest.map((work) => {
            const patch = replacements.get(work.id);
            if (!patch || getArtworkPhotoRef(work) !== patch.oldRef) return work;
            changed = true;
            return withArtworkPhotoRef(work, patch.newRef);
          });
          if (changed) {
            try {
              writeArtworks(localStorage, migrated);
              artworksRef.current = migrated;
              setArtworks(migrated);
            } catch {
              // Skip updating index if localStorage write fails during quiet background migration
            }
          }
        }
      }
      if (!cancelled) {
        const keepIds = collectArtworkMediaIds(artworksRef.current);
        for (const id of inFlightMediaIdsRef.current) {
          keepIds.add(id);
        }
        let skipPrune = false;
        try {
          const persisted = readArtworks(localStorage);
          for (const id of collectArtworkMediaIds(persisted)) {
            keepIds.add(id);
          }
        } catch {
          skipPrune = true;
        }
        if (!skipPrune) {
          await pruneUnusedMediaBlobs(keepIds);
        }
      }
    };

    void runMaintenance();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveArtwork = useCallback(
    async (draft: ArtworkDraft, existingId?: string): Promise<Artwork | null> => {
      if (!draft.name.trim()) {
        notify("先给这份作品起个名字吧。");
        return null;
      }
      const initialArtworks = artworksRef.current;
      const initialExisting = initialArtworks.find((work) => work.id === existingId);
      if (!initialExisting && initialArtworks.length >= MAX_ARTWORKS) {
        notify("作品库已满，请先导出并删除不再需要的作品。");
        return null;
      }

      const artworkId = initialExisting?.id ?? crypto.randomUUID();
      let preparedDraft = draft;
      let writtenMediaId: string | null = null;
      const rawPhotoRef = getArtworkPhotoRef(draft);
      if (rawPhotoRef && rawPhotoRef.startsWith("data:")) {
        const candidateId = `${artworkId}-${crypto.randomUUID().slice(0, 8)}`;
        inFlightMediaIdsRef.current.add(candidateId);
        try {
          const stored = await putMediaBlob(candidateId, dataUrlToBlob(rawPhotoRef));
          if (stored) {
            writtenMediaId = candidateId;
            preparedDraft = withArtworkPhotoRef(draft, toMediaRef(candidateId));
          } else {
            inFlightMediaIdsRef.current.delete(candidateId);
          }
        } catch {
          inFlightMediaIdsRef.current.delete(candidateId);
          // Keep compressed inline DataURL fallback if IndexedDB is unavailable
        }
      }

      try {
        const currentArtworks = artworksRef.current;
        const existing = currentArtworks.find((work) => work.id === existingId);
        if (!existing && currentArtworks.length >= MAX_ARTWORKS) {
          if (writtenMediaId) void deleteMediaBlobs([writtenMediaId]);
          notify("作品库已满，请先导出并删除不再需要的作品。");
          return null;
        }
        const prevPhotoRef = existing ? getArtworkPhotoRef(existing) : undefined;
        const prevMediaId = prevPhotoRef ? parseMediaRef(prevPhotoRef) : null;
        const artwork = {
          ...preparedDraft,
          name: preparedDraft.name.trim().slice(0, 60),
          id: existing?.id ?? artworkId,
          createdAt: new Date().toISOString(),
        } as Artwork;
        const next = [
          artwork,
          ...currentArtworks.filter((work) => work.id !== artwork.id),
        ];
        try {
          if (corruptBackupPending.current) {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (raw !== null) {
                localStorage.setItem("tracecraft.artworks.corrupt-backup.v1", raw);
              }
            } catch {
              // Best-effort backup of unreadable data
            }
          }
          writeArtworks(localStorage, next);
          corruptBackupPending.current = false;
          artworksRef.current = next;
          setArtworks(next);
          if (prevMediaId && !collectArtworkMediaIds(next).has(prevMediaId)) {
            void deleteMediaBlobs([prevMediaId]);
          }
          notify("心意已收藏，随时可以继续创作。");
          return artwork;
        } catch {
          if (writtenMediaId) void deleteMediaBlobs([writtenMediaId]);
          notify("保存失败：浏览器存储空间不足或已被禁用，请先导出作品。");
          return null;
        }
      } finally {
        if (writtenMediaId) inFlightMediaIdsRef.current.delete(writtenMediaId);
      }
    },
    [notify],
  );

  const deleteArtwork = useCallback(
    (id: string) => {
      const removed = artworksRef.current.find((work) => work.id === id);
      const removedPhotoRef = removed ? getArtworkPhotoRef(removed) : undefined;
      const removedMediaId = removedPhotoRef ? parseMediaRef(removedPhotoRef) : null;
      const next = artworksRef.current.filter((work) => work.id !== id);
      try {
        writeArtworks(localStorage, next);
        artworksRef.current = next;
        setArtworks(next);
        if (removedMediaId && !collectArtworkMediaIds(next).has(removedMediaId)) {
          void deleteMediaBlobs([removedMediaId]);
        }
        notify("作品已删除。");
      } catch {
        notify("删除失败，请检查浏览器存储权限。");
      }
    },
    [notify],
  );

  return (
    <StudioContext.Provider
      value={{
        artworks,
        route,
        editingArtwork,
        navigate,
        saveArtwork,
        deleteArtwork,
        notify,
      }}
    >
      <div className="app-shell">
        {mobileNav && (
          <button
            className="nav-backdrop"
            aria-label="关闭导航"
            onClick={() => setMobileNav(false)}
          />
        )}
        <aside id="studio-navigation" className={`sidebar ${mobileNav ? "is-open" : ""}`}>
          <button
            className="brand"
            onClick={() => navigate("home")}
            aria-label="TraceCraft 首页"
          >
            <span className="brand-icon">
              <Flower2 size={30} strokeWidth={1.6} />
            </span>
            <span>
              <strong>
                TraceCraft<span className="brand-period">.</span>
              </strong>
              <small>造 物 工 坊</small>
            </span>
          </button>
          <div className="nav-label">
            我的手作工作台 <span>WORKSPACE</span>
          </div>
          <nav aria-label="工坊导航">
            {nav.map((item) => (
              <button
                key={item.route}
                className={`nav-item ${route === item.route ? "active" : ""}`}
                onClick={() => navigate(item.route)}
                aria-current={route === item.route ? "page" : undefined}
              >
                <item.icon size={19} strokeWidth={1.7} />
                <span>{item.title}</span>
                {route === item.route && <span className="nav-active-dot" />}
              </button>
            ))}
            <div className="nav-divider" />
            <button
              className={`nav-item ${route === "library" ? "active" : ""}`}
              onClick={() => navigate("library")}
              aria-current={route === "library" ? "page" : undefined}
            >
              <Layers3 size={19} strokeWidth={1.7} />
              <span>我的作品</span>
              <span className="nav-count">{artworks.length}</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-footer">
              MADE WITH A LITTLE LOVE <Heart size={10} />
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <button
            className="icon-button mobile-menu"
            aria-label="打开导航"
            aria-expanded={mobileNav}
            aria-controls="studio-navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </button>
          <main className={`main-content route-${route}`}>
            {route === "home" && <Home />}
            {route === "library" && <Library />}
            <Suspense fallback={<div className="empty-state" role="status">正在铺好你的创作工作台…</div>}>
              {route === "beads" && <BeadsStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "wire-craft" && <WireCraftStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "embroidery" && <EmbroideryStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "compass" && <CompassStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "carving" && <CarvingStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
            </Suspense>
          </main>
        </div>
        {notification && (
          <div className="toast" role="status">
            <Check size={17} />
            <span>{notification}</span>
            <button aria-label="关闭提示" onClick={() => setNotification("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </StudioContext.Provider>
  );
}
