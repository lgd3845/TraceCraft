import { ArrowRight, Gift, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStudio } from "../lib/studio";
import type { Artwork } from "../lib/types";

const labels: Record<Artwork["kind"], string> = {
  beads: "拼豆作品",
  embroidery: "刺绣作品",
  "wire-craft": "绕线画作品",
  compass: "圆规画作品",
  carving: "雕刻画作品",
};

const filterTabs: Array<{ kind: "all" | Artwork["kind"]; label: string }> = [
  { kind: "all", label: "全部作品" },
  { kind: "beads", label: "拼豆作品" },
  { kind: "embroidery", label: "刺绣作品" },
  { kind: "wire-craft", label: "绕线画作品" },
  { kind: "compass", label: "圆规画作品" },
  { kind: "carving", label: "雕刻画作品" },
];

export default function Library() {
  const { artworks, navigate, deleteArtwork } = useStudio();
  const [filter, setFilter] = useState<"all" | Artwork["kind"]>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const filtered = artworks.filter(
    (work) => filter === "all" || work.kind === filter,
  );
  return (
    <div className="library-page">
      <div className="studio-heading">
        <div>
          <div className="eyebrow">YOUR LITTLE COLLECTION</div>
          <h1>
            我的创作角落<span className="count-badge">{artworks.length}</span>
          </h1>
          <p>每一件亲手设计的作品，都藏着一份独一无二的心意。</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("beads")}
        >
          <Plus size={16} /> 新建作品
        </button>
      </div>
      <div className="library-toolbar">
        <div className="segmented">
          {filterTabs.map((tab) => (
            <button
              key={tab.kind}
              className={filter === tab.kind ? "active" : ""}
              onClick={() => setFilter(tab.kind)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="muted">仅保存在当前浏览器，不会上传照片</span>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state library-empty">
          <Gift size={42} strokeWidth={1.2} />
          <h2>
            {artworks.length ? "这个分类还没有作品" : "第一份心意，正在等你"}
          </h2>
          <p>去工坊设计并保存，作品就会出现在这里。</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(filter === "all" ? "beads" : filter)}
          >
            开始创作 <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="library-grid">
          {filtered.map((work) => (
            <article className="library-card" key={work.id}>
              <button
                className={`library-thumbnail ${work.kind}`}
                onClick={() => navigate(work.kind, work.id)}
              >
                <img src={work.thumbnail} alt={work.name} loading="lazy" decoding="async" />
              </button>
              <div className="library-card-content">
                <span className="eyebrow">{labels[work.kind]}</span>
                <h3>{work.name}</h3>
                <p>
                  {new Date(work.createdAt).toLocaleDateString("zh-CN")} 保存
                </p>
                {deleting === work.id ? (
                  <div className="delete-confirm">
                    <span>确定删除这份作品？</span>
                    <button
                      className="text-button danger"
                      onClick={() => {
                        deleteArtwork(work.id);
                        setDeleting(null);
                      }}
                    >
                      确定删除
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setDeleting(null)}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="library-actions">
                    <button
                      className="text-button"
                      onClick={() => navigate(work.kind, work.id)}
                    >
                      继续编辑 <ArrowRight size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`删除${work.name}`}
                      onClick={() => setDeleting(work.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
