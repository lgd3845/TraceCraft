import {
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Flower2,
  Heart,
  Leaf,
  Plus,
  Sparkles,
} from "lucide-react";
import { useStudio } from "../lib/studio";
import CraftIllustration from "./CraftIllustration";

const workshops = [
  {
    kind: "beads" as const,
    number: "01",
    title: "让回忆，有颗粒感",
    subtitle: "拼豆工坊",
    description: "把珍藏的照片，变成一颗颗色彩拼出的独家记忆，支持逐格微调画笔。",
    tag: "拼豆创作",
    color: "peach",
  },
  {
    kind: "embroidery" as const,
    number: "02",
    title: "一针一线，绣出流光",
    subtitle: "刺绣工坊",
    description: "上传任意图片对比长短针、十字绣与戳戳绣，自动生成配色清单与跟绣教程。",
    tag: "丝光刺绣",
    color: "lavender",
  },
  {
    kind: "wire-craft" as const,
    number: "03",
    title: "一钉一线，织出光影",
    subtitle: "绕线画工坊",
    description: "固定外圈钉或自由轮廓布钉，把人像与插画细腻织成光影线画。",
    tag: "线艺光影",
    color: "sage",
  },
  {
    kind: "compass" as const,
    number: "04",
    title: "一规一弧，绘出版画",
    subtitle: "圆规画工坊",
    description: "上传照片转为同心圆弧、阿基米德螺线与三圆心交织网格，导出 1:1 量角底稿与跟画教程。",
    tag: "圆规版画",
    color: "mint",
  },
  {
    kind: "carving" as const,
    number: "05",
    title: "一刀一影，刻出玲珑",
    subtitle: "雕刻画工坊",
    description: "照片转阳刻连桥刻纸、阴刻版画木刻与 4 层光影纸雕底稿，自动防掉孤岛。",
    tag: "自动连桥",
    color: "terracotta",
  },
];

export default function Home() {
  const { artworks, navigate } = useStudio();
  return (
    <div className="home-page">
      <section className="welcome-heading">
        <div>
          <div className="eyebrow">
            <Flower2 size={14} className="tiny-flower" /> A LITTLE HANDMADE, A
            LOT OF HEART
          </div>
          <h1>
            小小手作，<span>大大心意。</span>
          </h1>
          <p>不必是手作高手，也能做出独一无二的作品。</p>
        </div>
        <div className="welcome-note">
          <Heart size={18} />
          <span>
            比起完美，
            <br />
            用心更珍贵。
          </span>
          <svg viewBox="0 0 70 25">
            <path
              d="M4 6q35 25 58 0m-10 0 12-2-3 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </section>
      <section className="home-banner">
        <div className="banner-copy">
          <h2>
            那份「想到你」的心意，
            <br />
            值得亲手做出来。
          </h2>
          <p>从灵感到成品，每一步，我们陪你一起。</p>
          <button className="btn btn-dark" onClick={() => navigate("embroidery")}>
            去刺绣工坊试试 <ArrowUpRight size={17} />
          </button>
          <div className="banner-foot">
            <span className="mini-avatars">
              <i>创</i>
              <i>作</i>
              <i>家</i>
            </span>
            <span>
              零基础友好 <span className="dot">·</span> 所见即所得{" "}
              <span className="dot">·</span> 心意不设限
            </span>
          </div>
        </div>
        <div className="banner-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <CraftIllustration kind="embroidery" />
          <div className="floating-label label-top">
            <Sparkles size={14} /> MADE BY YOU
          </div>
          <div className="floating-label label-bottom">
            <Heart size={14} /> 这份心意，独一无二
          </div>
          <Sparkles className="art-spark spark-one" size={26} />
          <Sparkles className="art-spark spark-two" size={18} />
        </div>
      </section>
      <section className="workshops-section">
        <div className="section-heading">
          <div>
            <h2>
              今天，想做点什么？ <span>CHOOSE YOUR LITTLE PROJECT</span>
            </h2>
            <p>选一个工坊，让灵感在指尖发生。</p>
          </div>
          <span className="section-meta">
            <Leaf size={14} /> 慢慢做，慢慢喜欢
          </span>
        </div>
        <div className="workshop-grid">
          {workshops.map((workshop) => (
            <button
              className={`workshop-card ${workshop.color}`}
              key={workshop.kind}
              aria-label={`打开${workshop.subtitle}`}
              onClick={() => navigate(workshop.kind)}
            >
              <div className="workshop-visual">
                <span className="workshop-tag">{workshop.tag}</span>
                <span className="workshop-number">/{workshop.number}</span>
                <CraftIllustration kind={workshop.kind} />
                <span className="workshop-open">
                  <ArrowUpRight size={19} />
                </span>
              </div>
              <div className="workshop-copy">
                <div className="workshop-subtitle">{workshop.subtitle}</div>
                <h3>{workshop.title}</h3>
                <p>{workshop.description}</p>
                <div className="workshop-meta">
                  <span>
                    开始创作 <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="journey-strip">
        <div className="journey-intro">
          <Flower2 size={29} strokeWidth={1.3} />
          <div>
            <strong>让灵感，落到生活里</strong>
            <span>一份手作礼物的诞生</span>
          </div>
        </div>
        {[
          ["01", "选图与选算法", "所见即所得的材料预览"],
          ["02", "照着步骤动手", "每步序号与色号清清楚楚"],
          ["03", "导出留存心意", "打印 1:1 模板与高清图纸"],
        ].map(([n, title, desc]) => (
          <div className="journey-step" key={n}>
            <span>{n}</span>
            <div>
              <strong>{title}</strong>
              <small>{desc}</small>
            </div>
          </div>
        ))}
      </section>
      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>
              我的创作角落 <span>YOUR LITTLE COLLECTION</span>
            </h2>
            <p>每一次用心，都值得被好好收藏。</p>
          </div>
          <button className="text-button" onClick={() => navigate("library")}>
            查看全部 {artworks.length > 0 && `(${artworks.length})`}
            <ArrowRight size={15} />
          </button>
        </div>
        {artworks.length ? (
          <div className="recent-grid">
            {artworks.slice(0, 3).map((work) => (
              <button
                key={work.id}
                className="recent-work"
                onClick={() => navigate(work.kind, work.id)}
              >
                <img src={work.thumbnail} alt={work.name} />
                <div>
                  <strong>{work.name}</strong>
                  <span>
                    {new Date(work.createdAt).toLocaleDateString("zh-CN")} ·
                    点击继续编辑
                  </span>
                </div>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <button
            className="collection-empty"
            onClick={() => navigate("beads")}
          >
            <span className="empty-plus">
              <Plus size={22} />
            </span>
            <div>
              <strong>第一份心意，从这里开始</strong>
              <p>保存你的作品，它们会一直在这个浏览器里等你。</p>
            </div>
            <span className="collection-action">
              去创作 <ArrowRight size={16} />
            </span>
          </button>
        )}
      </section>
      <footer className="home-footer">
        <span>TraceCraft · 造物工坊</span>
        <span>让礼物多一点你，让生活多一点暖。</span>
        <span>
          <CircleHelp size={13} /> 效果预览仅供参考，请以实际材料为准
        </span>
      </footer>
    </div>
  );
}
