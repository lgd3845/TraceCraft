import { useRef, useState } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronRight, Clock3, Info, Maximize2, RotateCcw, Scissors, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { CraftProject, GuideColorOption } from '../lib/craftGuide'
import { guideProgress, guideSheetSvg } from '../lib/craftGuide'
import { downloadFile } from '../lib/export'
import { useStudio } from '../lib/studio'
import './craft-guide.css'

interface CraftGuideProps {
  title: string
  kicker: string
  description: string
  projects: readonly CraftProject[]
  colorLabel: string
  colorOptions: readonly GuideColorOption[]
}

export default function CraftGuide({ title, kicker, description, projects, colorLabel, colorOptions }: CraftGuideProps) {
  const { notify } = useStudio()
  const [projectIndex, setProjectIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const [showHints, setShowHints] = useState(true)
  const sheet = useRef<HTMLDivElement>(null)
  const enlarged = useRef<HTMLDialogElement>(null)
  const project = projects[projectIndex]
  const step = project.steps[stepIndex]
  const colors = colorOptions[colorIndex]
  const progress = guideProgress(completed, project.steps.length)

  function chooseProject(index: number) {
    if (index === projectIndex) return
    setProjectIndex(index)
    setStepIndex(0)
    setCompleted([])
  }

  function enlargeDiagram() {
    enlarged.current?.showModal()
    const viewport = enlarged.current?.querySelector<HTMLElement>('.craft-zoom-content')
    if (viewport) viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
  }

  function downloadGuide() {
    const diagrams = Array.from(sheet.current?.querySelectorAll('svg') ?? [])
    if (diagrams.length !== project.steps.length) {
      notify('图解尚未就绪，请稍后再试。')
      return
    }
    const fragments = diagrams.map(diagram => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      for (const { name, value } of diagram.attributes) {
        if (!['xmlns', 'viewBox', 'width', 'height', 'role', 'aria-label'].includes(name)) group.setAttribute(name, value)
      }
      for (const child of diagram.childNodes) group.appendChild(child.cloneNode(true))
      return new XMLSerializer().serializeToString(group)
    })
    downloadFile(guideSheetSvg(title, project, fragments), `${project.title}-GiftCraft完整图解.svg`, 'image/svg+xml;charset=utf-8')
    notify('完整图解已下载，包含全部步骤、检查要点和参考来源。')
  }

  return <div className="craft-guide">
    <header className="studio-heading craft-heading">
      <div><div className="eyebrow"><Sparkles size={13} />{kicker}</div><h1>{title}<span>.</span></h1><p>{description}</p></div>
      <button className="btn btn-secondary" onClick={downloadGuide}><ArrowDownToLine size={15} />下载完整图解</button>
    </header>
    <div className="craft-intro-strip"><span><BookOpen size={14} /> 看清一步，再动手一步</span><ChevronRight size={13} /><span>原创中文图解 · 可调配色 · 免费本地下载</span></div>

    <div className="craft-layout">
      <aside className="craft-sidebar" aria-label="教程与准备材料">
        <section className="panel craft-projects"><h2 className="panel-title"><BookOpen size={15} />挑一份小心意<small>{projects.length} 个教程</small></h2>
          <div className="craft-project-list">{projects.map((item, index) => <button key={item.id} className={`craft-project-card${index === projectIndex ? ' is-selected' : ''}`} aria-label={`学习${item.title}`} aria-pressed={index === projectIndex} onClick={() => chooseProject(index)}>
            <span className="craft-project-art" aria-hidden="true">{item.renderDiagram(item.steps.length - 1, colors, false)}</span>
            <span className="craft-project-copy"><strong>{item.title}</strong><small>{item.subtitle}</small><span><Clock3 size={11} />{item.duration}<i>{item.level}</i></span></span>
            {index === projectIndex && <Check className="craft-project-check" size={14} />}
          </button>)}</div>
        </section>
        <section className="panel craft-materials"><h2 className="panel-title"><Scissors size={15} />动手前，准备好</h2><ul>{project.materials.map(material => <li key={material}><span />{material}</li>)}</ul><p><ShieldCheck size={14} />{project.safety}</p></section>
        <div className="craft-meaning"><Sparkles size={19} strokeWidth={1.4} /><div><strong>一份手作，一点寓意</strong><p>{project.meaning}</p></div></div>
      </aside>

      <section className="craft-learning" aria-label={`${project.title}分步教程`}>
        <div className="craft-lesson-heading"><div><span className="eyebrow">YOUR LITTLE HANDMADE MOMENT</span><h2>{project.title}</h2><p>{project.description}</p></div><span className="craft-level">{project.level}</span></div>
        <div className="craft-board">
          <div className="craft-board-toolbar"><span>步骤图解 <i>STEP {String(stepIndex + 1).padStart(2, '0')}</i></span><div className="craft-board-options"><label><input type="checkbox" checked={showHints} onChange={event => setShowHints(event.target.checked)} />显示辅助线</label><button className="icon-button" aria-label="放大图解" title="放大图解" onClick={enlargeDiagram}><Maximize2 size={14} /></button></div></div>
          <div className="craft-diagram" role="img" aria-label={`${project.title}，第 ${stepIndex + 1} 步：${step.title}`}>{project.renderDiagram(stepIndex, colors, showHints)}</div>
          <div className="craft-board-caption"><Info size={12} /> 图示方向以当前画面为准；折线、剪线与上下穿压请配合文字查看。</div>
        </div>
        <div className="craft-step-detail" aria-live="polite" aria-atomic="true"><span className="craft-step-number">{String(stepIndex + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.instruction}</p><div className="craft-checkpoint"><CheckCheck size={16} /><span><strong>完成检查</strong>{step.checkpoint}</span></div></div></div>
        <div className="craft-step-actions"><button className="btn btn-secondary" onClick={() => setStepIndex(index => index - 1)} disabled={stepIndex === 0}><ArrowLeft size={14} />上一步</button><button className={`btn ${completed.includes(stepIndex) ? 'btn-secondary' : 'btn-primary'} craft-complete-step`} aria-pressed={completed.includes(stepIndex)} onClick={() => setCompleted(previous => previous.includes(stepIndex) ? previous.filter(index => index !== stepIndex) : [...previous, stepIndex])}><Check size={14} />{completed.includes(stepIndex) ? '本步已完成' : '标记本步完成'}</button><button className="btn btn-secondary" onClick={() => setStepIndex(index => index + 1)} disabled={stepIndex === project.steps.length - 1}>下一步<ArrowRight size={14} /></button></div>
        <nav className="craft-step-nav" aria-label="教程步骤"><ol>{project.steps.map((item, index) => <li key={item.title}><button className={`${index === stepIndex ? 'is-current ' : ''}${completed.includes(index) ? 'is-complete' : ''}`} aria-label={`第 ${index + 1} 步：${item.title}`} aria-current={index === stepIndex ? 'step' : undefined} onClick={() => setStepIndex(index)}><span>{completed.includes(index) ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span>{item.title}</button></li>)}</ol></nav>
        {progress === 100 && <div className="craft-finished" role="status"><CheckCheck size={24} /><div><strong>这份小手作，完成了。</strong><p>把它夹进卡片、系在礼物上，或留给特别的人。别忘了下载图解，方便下次再做。</p></div></div>}
      </section>

      <aside className="craft-notes" aria-label="配色、学习进度和参考来源">
        <section className="panel craft-color-panel"><h2 className="panel-title">换一份喜欢的颜色</h2><p>{colorLabel}</p><div className="craft-color-options" role="group" aria-label={colorLabel}>{colorOptions.map((option, index) => <button key={option.name} onClick={() => setColorIndex(index)} aria-label={`配色：${option.name}`} aria-pressed={index === colorIndex} className={index === colorIndex ? 'is-selected' : ''}><span style={{ backgroundColor: option.primary }} /><span style={{ backgroundColor: option.secondary }} />{index === colorIndex && <Check size={12} />}</button>)}</div><span className="craft-color-name">{colors.name}</span><p className="hint">仅改变示意配色，不改变做法；纸张正反面或左右工作绳用两色区分。</p></section>
        <section className="panel craft-progress-panel"><h2 className="panel-title">慢慢来，也在向前</h2><div className="craft-progress-value"><strong>{completed.length}<small> / {project.steps.length}</small></strong><span>步已完成</span></div><progress aria-label="教程完成进度" value={completed.length} max={project.steps.length} /><p>翻到下一步不会自动打勾，做好后再标记。</p><button className="text-button" onClick={() => { setStepIndex(0); setCompleted([]) }}><RotateCcw size={12} />重学本教程</button><small className="craft-session-note">进度仅保留在当前教程页面，离开或切换教程会重置。</small></section>
        <section className="panel craft-sources"><h2 className="panel-title"><BookOpen size={14} />再看一种讲解</h2><p>卡在某一步？这些资料可以帮你核对基础技法。</p><ul>{project.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={13} /></a></li>)}</ul><small>本站文字与 SVG 图解为重新编排绘制；链接仅作学习参考，不代表来源网站的授权或背书。</small></section>
      </aside>
    </div>
    <dialog ref={enlarged} className="craft-zoom-dialog" aria-label="放大步骤图"><header><h2>{stepIndex + 1}. {step.title}</h2><button className="icon-button" aria-label="关闭放大图解" onClick={() => enlarged.current?.close()}><X size={18} /></button></header><div className="craft-zoom-content" tabIndex={0} aria-label="放大图解，可横向滚动查看">{project.renderDiagram(stepIndex, colors, showHints)}</div><p>小屏幕可左右滑动查看，按 Esc 或关闭按钮返回教程。</p></dialog>
    <div ref={sheet} hidden aria-hidden="true">{project.steps.map((_, index) => <div key={index}>{project.renderDiagram(index, colors, true)}</div>)}</div>
    <footer className="craft-footer"><ShieldCheck size={13} /> 无需登录 · 图解在本地生成 · 小朋友请在成人陪同下动手</footer>
  </div>
}
