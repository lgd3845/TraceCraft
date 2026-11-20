import {
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Clock3,
  Flower2,
  Heart,
  Leaf,
  Plus,
  Sparkles,
} from "lucide-react";
import { useStudio } from "../lib/studio";
import CraftIllustration from "./CraftIllustration";
import TraditionalWorkshops from "./TraditionalWorkshops";

const workshops = [
  {
    kind: "bracelet" as const,
    number: "01",
    title: "串起一份专属心意",
    subtitle: "串饰工坊",
    description: "挑选珠子，搭配色彩。把喜欢的样子，戴在手腕上。",
    tag: "自由拼装",
    time: "约 20–40 分钟",
    color: "sage",
  },
  {
    kind: "beads" as const,
    number: "02",
    title: "让回忆，有颗粒感",
    subtitle: "照片转拼豆",
    description: "把珍藏的照片，变成一颗颗色彩拼出的独家记忆。",
    tag: "照片转手作",
    time: "约 1–3 小时",
    color: "peach",
  },
  {
    kind: "gift-box" as const,
    number: "03",
    title: "把所有美好装进礼盒",
    subtitle: "礼盒摆盘",
    description: "放入亲手做的作品，再系上丝带。心意，刚刚好。",
    tag: "心意终点站",
    time: "约 10–20 分钟",
    color: "lavender",
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
          <p>不必是手作高手，也能做出独一无二的礼物。</p>
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
          <div className="banner-label">
            <span /> 为某个特别的人，开始创作
          </div>
          <h2>
            那份「想到你」的心意，
            <br />
            值得亲手做出来。
          </h2>
          <p>从灵感到成品，每一步，我们陪你一起。</p>
          <button className="btn btn-dark" onClick={() => navigate("bracelet")}>
            开始我的第一份手作 <ArrowUpRight size={17} />
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
          <CraftIllustration kind="gift-box" />
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
                    <Clock3 size={13} />
                    {workshop.time}
                  </span>
                  <span>
                    开始创作 <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      <TraditionalWorkshops />
      <section className="journey-strip">
        <div className="journey-intro">
          <Flower2 size={29} strokeWidth={1.3} />
          <div>
            <strong>让灵感，落到生活里</strong>
            <span>一份手作礼物的诞生</span>
          </div>
        </div>
        {[
          ["01", "设计与预览", "先看看，心意的模样"],
          ["02", "照着步骤做", "材料清单，不再凭感觉"],
          ["03", "装进专属礼盒", "让每一份心意都有归处"],
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
            onClick={() => navigate("bracelet")}
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
        <span>GiftCraft · 心意工坊</span>
        <span>让礼物多一点你，让生活多一点暖。</span>
        <span>
          <CircleHelp size={13} /> 效果预览仅供参考，请以实际材料为准
        </span>
      </footer>
    </div>
  );
}
