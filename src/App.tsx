import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  CircleDashed,
  Cable,
  Origami,
  Scissors,
  Flower2,
  Gift,
  Grid2X2,
  Heart,
  House,
  Layers3,
  Leaf,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Home from "./components/Home";
import Library from "./components/Library";
import { StudioContext } from "./lib/studio";
import { readArtworks, writeArtworks } from "./lib/storage";
import type { Artwork, ArtworkDraft, Route } from "./lib/types";

const BraceletStudio = lazy(() => import("./modules/bracelet/BraceletStudio"));
const BeadsStudio = lazy(() => import("./modules/beads/BeadsStudio"));
const GiftBoxStudio = lazy(() => import("./modules/gift-box/GiftBoxStudio"));
const PaperCuttingStudio = lazy(() => import("./modules/paper-cutting/PaperCuttingStudio"));
const OrigamiStudio = lazy(() => import("./modules/origami/OrigamiStudio"));
const ChineseKnotsStudio = lazy(() => import("./modules/chinese-knots/ChineseKnotsStudio"));

const routes: Route[] = ["home", "bracelet", "beads", "gift-box", "library", "paper-cutting", "origami", "chinese-knots"];
const guideNav = [
  { route: "paper-cutting" as const, title: "剪纸小课堂", icon: Scissors },
  { route: "origami" as const, title: "折纸小课堂", icon: Origami },
  { route: "chinese-knots" as const, title: "中国结与编绳", icon: Cable },
];
const routeNames: Record<Route, string> = {
  home: "创作灵感",
  bracelet: "串饰工坊",
  beads: "照片转拼豆",
  "gift-box": "礼盒摆盘",
  library: "我的作品",
  "paper-cutting": "剪纸小课堂",
  origami: "折纸小课堂",
  "chinese-knots": "中国结与编绳",
};
const nav = [
  { route: "home" as const, title: "创作灵感", icon: House },
  { route: "bracelet" as const, title: "串饰工坊", icon: CircleDashed },
  { route: "beads" as const, title: "照片转拼豆", icon: Grid2X2 },
  { route: "gift-box" as const, title: "礼盒摆盘", icon: Gift },
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
  const [artworks, setArtworks] = useState<Artwork[]>(initial.artworks);
  const artworksRef = useRef(artworks);
  const [notification, setNotification] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const guide = useRef<HTMLDialogElement>(null);
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
    document.title = `${routeNames[route]} · GiftCraft 心意工坊`;
  }, [route]);

  const saveArtwork = useCallback(
    (draft: ArtworkDraft, existingId?: string) => {
      if (initial.error) {
        notify(
          "本地存储读取失败，为避免覆盖原作品，请先检查浏览器存储或刷新。",
        );
        return null;
      }
      if (!draft.name.trim()) {
        notify("先给这份作品起个名字吧。");
        return null;
      }
      const currentArtworks = artworksRef.current;
      if (draft.kind === "gift-box" && draft.data.items.some(item => !currentArtworks.some(work => work.id === item.artworkId && work.kind !== "gift-box"))) {
        notify("礼盒中的原作品已被删除，请重新加入作品后再保存。");
        return null;
      }
      const existing = currentArtworks.find((work) => work.id === existingId);
      if (!existing && currentArtworks.length >= 40) {
        notify("作品库已满，请先导出并删除不再需要的作品。");
        return null;
      }
      const artwork = {
        ...draft,
        name: draft.name.trim().slice(0, 60),
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      } as Artwork;
      const next = [
        artwork,
        ...currentArtworks.filter((work) => work.id !== artwork.id),
      ];
      try {
        writeArtworks(localStorage, next);
        artworksRef.current = next;
        setArtworks(next);
        notify("心意已收藏，随时可以继续创作。");
        return artwork;
      } catch {
        notify("保存失败：浏览器存储空间不足或已被禁用，请先导出作品。");
        return null;
      }
    },
    [initial.error, notify],
  );

  const deleteArtwork = useCallback(
    (id: string) => {
      if (
        artworksRef.current.some(
          (work) =>
            work.kind === "gift-box" &&
            work.data.items.some((item) => item.artworkId === id),
        )
      ) {
        notify("这份作品还在礼盒里，请先从礼盒中移除并保存。");
        return;
      }
      const next = artworksRef.current.filter((work) => work.id !== id);
      try {
        writeArtworks(localStorage, next);
        artworksRef.current = next;
        setArtworks(next);
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
            aria-label="GiftCraft 首页"
          >
            <span className="brand-icon">
              <Flower2 size={30} strokeWidth={1.6} />
            </span>
            <span>
              <strong>
                GiftCraft<span className="brand-period">.</span>
              </strong>
              <small>心 意 工 坊</small>
            </span>
          </button>
          <button
            className="btn new-project"
            onClick={() => navigate("bracelet")}
          >
            <Plus size={17} /> 开始一份新心意
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
                {item.route === "gift-box" && route !== item.route && (
                  <span className="nav-tag">最后一步</span>
                )}
              </button>
            ))}
            <div className="nav-label nav-guide-label">跟着图解学 <span>CRAFT GUIDES</span></div>
            {guideNav.map((item) => (
              <button key={item.route} className={`nav-item ${route === item.route ? "active" : ""}`} onClick={() => navigate(item.route)} aria-current={route === item.route ? "page" : undefined}>
                <item.icon size={19} strokeWidth={1.7} /><span>{item.title}</span>{route === item.route && <span className="nav-active-dot" />}
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
            <div className="sidebar-tip">
              <span className="tip-illustration">
                <Leaf size={28} strokeWidth={1.2} />
                <Sparkles size={13} />
              </span>
              <h3>心意，不用很复杂。</h3>
              <p>
                一颗珠子，一点色彩，
                <br />
                都是你独有的温柔。
              </p>
              <button
                className="text-button"
                onClick={() => guide.current?.showModal()}
              >
                新手创作指南 <ArrowUpRight size={14} />
              </button>
            </div>
            <button
              className="sidebar-help"
              onClick={() => guide.current?.showModal()}
            >
              <CircleHelp size={16} /> 需要一点帮助？ <ArrowUpRight size={14} />
            </button>
            <div className="sidebar-footer">
              MADE WITH A LITTLE LOVE <Heart size={10} />
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="打开导航"
                aria-expanded={mobileNav}
                aria-controls="studio-navigation"
                onClick={() => setMobileNav(true)}
              >
                <Menu size={20} />
              </button>
              <span>我的工作台</span>
              <ChevronRight size={13} />
              <strong>{routeNames[route]}</strong>
            </div>
            <div className="topbar-right">
              <span className="local-status">
                <span /> 灵感在这里，心意在手里
              </span>
              <span className="topbar-divider" />
              <button
                className="icon-button"
                aria-label="打开创作指南"
                onClick={() => guide.current?.showModal()}
              >
                <BookOpen size={17} />
              </button>
              <span className="user-avatar" title="本地创作，无需登录">
                G
              </span>
            </div>
          </header>
          <main className={`main-content route-${route}`}>
            {initial.error && (
              <div className="storage-warning" role="alert">
                暂时无法读取本地作品，请检查浏览器存储设置后刷新；为保护原数据，当前不能保存。
              </div>
            )}
            {route === "home" && <Home />}
            {route === "library" && <Library />}
            <Suspense fallback={<div className="empty-state" role="status">正在铺好你的创作工作台…</div>}>
              {route === "bracelet" && <BraceletStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "beads" && <BeadsStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "gift-box" && <GiftBoxStudio key={`${artworkId ?? "new"}:${navigationId}`} />}
              {route === "paper-cutting" && <PaperCuttingStudio key={navigationId} />}
              {route === "origami" && <OrigamiStudio key={navigationId} />}
              {route === "chinese-knots" && <ChineseKnotsStudio key={navigationId} />}
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
        <dialog ref={guide} className="guide-dialog">
          <button
            className="icon-button dialog-close"
            aria-label="关闭指南"
            onClick={() => guide.current?.close()}
          >
            <X size={20} />
          </button>
          <div className="eyebrow">A SMALL GUIDE TO SOMETHING SPECIAL</div>
          <h2>第一份手作，不必复杂。</h2>
          <p>选一种你喜欢的方式，把心意一点点做出来。</p>
          <div className="guide-steps">
            <article>
              <span>01</span>
              <div>
                <h3>先设计，再动手</h3>
                <p>
                  搭配串饰、把照片转成拼豆，或跟着剪纸、折纸与编绳图解从零练习。所有预览都在浏览器中完成。
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>保存作品，备齐材料</h3>
                <p>
                  导出材料清单或拼豆图纸，再根据实际珠子尺寸、拼豆品牌与色卡采购。预览颜色不代表真实商品色号。
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>把心意装进礼盒</h3>
                <p>
                  将保存的作品加入礼盒，调整位置、包装配色和卡片文字，导出你的搭配方案。
                </p>
              </div>
            </article>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <span>
              照片不会上传。作品仅保存在当前浏览器，清理浏览器数据会删除作品，请及时导出备份。
            </span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              guide.current?.close();
              navigate("bracelet");
            }}
          >
            开始第一份创作 <ArrowUpRight size={16} />
          </button>
        </dialog>
      </div>
    </StudioContext.Provider>
  );
}
