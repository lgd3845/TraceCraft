import { ArrowUpRight, BookOpen, Cable, Origami, Scissors } from 'lucide-react'
import { useStudio } from '../lib/studio'
import './traditional-workshops.css'

const guides = [
  { route: 'paper-cutting' as const, title: '剪纸小课堂', subtitle: '剪一纸欢喜', description: '看懂折边与剪线，展开一份对称的惊喜。', detail: '爱心 / 四瓣花', icon: Scissors, color: 'paper' },
  { route: 'origami' as const, title: '折纸小课堂', subtitle: '把喜欢，折进纸里', description: '一张纸、一点耐心，让心意慢慢有了形状。', detail: '平面爱心 / 幸运星', icon: Origami, color: 'fold' },
  { route: 'chinese-knots' as const, title: '中国结与编绳', subtitle: '一结一系，都是心意', description: '认清每次上下穿压，给手绳一个亲手做的收尾。', detail: '平结 / 平结滑扣', icon: Cable, color: 'cord' },
]

function GuideArt({ kind }: { kind: typeof guides[number]['route'] }) {
  return <svg viewBox="0 0 360 200" aria-hidden="true">
    <ellipse cx="183" cy="172" rx="95" ry="11" fill="#a38c7913" />
    {kind === 'paper-cutting' ? <>
      <rect x="104" y="35" width="151" height="136" rx="3" fill="#fffaf2" transform="rotate(-8 180 100)" />
      <path d="M111 38L251 157M249 30L105 168" stroke="#d2bf9a" strokeWidth=".6" strokeDasharray="4 4" />
      <g transform="translate(180 100) scale(.8)" fill="#c56b59" stroke="#b65d4d" strokeWidth=".5">
        {[1, -1].flatMap(x => [1, -1].map(y => <path key={`${x}:${y}`} d="M0 0H22C44 0 90 36 82 82C36 90 0 44 0 22Z" transform={`scale(${x} ${y})`} />))}
      </g>
      <path d="M291 140L313 116M291 141L317 144" stroke="#a5977c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="282" cy="145" r="9" fill="none" stroke="#a5977c" strokeWidth="3" /><circle cx="290" cy="155" r="9" fill="none" stroke="#a5977c" strokeWidth="3" />
      <path d="M67 65l7 6-5 8-10-6zM274 70l10-9 5 12z" fill="#d69378" opacity=".55" />
    </> : kind === 'origami' ? <>
      <path d="M108 48L196 21L267 139L179 169Z" fill="#eee6d8" stroke="#e1d5c5" transform="rotate(8 180 100)" />
      <path d="M178 166L95 87L95 60L117 38L150 38L178 66L206 38L239 38L261 60L261 87Z" fill="#cf927b" stroke="#be8069" />
      <path d="M178 166V66L150 94L117 38M178 66L207 94L239 38" fill="none" stroke="#b77a64" opacity=".65" />
      <path d="M95 87L150 94L178 166M261 87L207 94L178 166" fill="#e4b09a" fillOpacity=".55" />
      <path d="M279 120L284 132L298 131L288 142L291 156L278 149L266 156L268 141L258 132L272 131Z" fill="#d7bb7a" transform="rotate(13 278 138)" />
      <path d="M57 77L62 90L76 89L66 99L69 112L56 106L45 113L47 98L37 91L51 89Z" fill="#a7b59a" transform="scale(.65) translate(34 18)" />
    </> : <>
      <path d="M153 158V51Q153 13 181 13Q209 13 209 51V157" fill="none" stroke="#b37f61" strokeWidth="7" strokeLinecap="round" />
      <path d="M175 31V180M187 31V180" stroke="#ccb58a" strokeWidth="6" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map(index => <g key={index} transform={`translate(0 ${index * 20})`}>
        <path d="M153 52C139 55 143 71 155 71H206C218 71 222 55 209 52" fill="none" stroke="#b77357" strokeWidth="8" strokeLinecap="round" />
        <path d="M156 49C164 62 198 62 206 49" fill="none" stroke="#e5c08d" strokeWidth="8" strokeLinecap="round" />
      </g>)}
      <path d="M153 146Q137 163 144 181M209 146Q225 163 218 181" stroke="#b77357" fill="none" strokeWidth="7" strokeLinecap="round" />
      <circle cx="146" cy="180" r="8" fill="#a9b390" /><circle cx="216" cy="180" r="8" fill="#a9b390" />
      <path d="M268 75q18-8 29 7M71 127q-19 7-29-7" stroke="#bbaf9a" strokeWidth="1" fill="none" />
    </>}
  </svg>
}

export default function TraditionalWorkshops() {
  const { navigate } = useStudio()
  return <section className="traditional-section" aria-label="传统手作教学">
    <div className="section-heading"><div><h2>把老手艺，送给新喜欢的人 <span>FOLD · CUT · KNOT</span></h2><p>不用急着成为高手，先跟着图解完成第一份。</p></div><span className="section-meta"><BookOpen size={14} /> 六份入门教程</span></div>
    <div className="traditional-grid">{guides.map(guide => <button className={`traditional-card traditional-${guide.color}`} key={guide.route} aria-label={`打开${guide.title}`} onClick={() => navigate(guide.route)}>
      <div className="traditional-art"><span className="traditional-tag"><guide.icon size={12} />{guide.title}</span><GuideArt kind={guide.route} /><span className="traditional-open"><ArrowUpRight size={17} /></span></div>
      <div className="traditional-copy"><h3>{guide.subtitle}</h3><p>{guide.description}</p><span>{guide.detail}<small>跟着做 <ArrowUpRight size={12} /></small></span></div>
    </button>)}</div>
  </section>
}
