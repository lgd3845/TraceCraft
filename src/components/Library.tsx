import { ArrowRight, Gift, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStudio } from "../lib/studio";
import type { Artwork } from "../lib/types";

const labels = {
  bracelet: "串饰作品",
  beads: "拼豆作品",
  "gift-box": "心意礼盒",
};

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
          onClick={() => navigate("bracelet")}
        >
          <Plus size={16} /> 新建作品
        </button>
      </div>
      <div className="library-toolbar">
        <div className="segmented">
          {(["all", "bracelet", "beads", "gift-box"] as const).map((kind) => (
            <button
              key={kind}
              className={filter === kind ? "active" : ""}
              onClick={() => setFilter(kind)}
            >
              {kind === "all" ? "全部作品" : labels[kind]}
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
            onClick={() => navigate(filter === "all" ? "bracelet" : filter)}
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
                <img src={work.thumbnail} alt={work.name} />
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
                      onClick={() =>
                        navigate(
                          work.kind === "gift-box" ? work.kind : "gift-box",
                          work.id,
                        )
                      }
                    >
                      {work.kind === "gift-box" ? "打开礼盒" : "放入礼盒"}{" "}
                      <ArrowRight size={14} />
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
