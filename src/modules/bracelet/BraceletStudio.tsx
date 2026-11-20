import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, Gem, Gift, Leaf, Plus, RotateCcw, Ruler, Save, Sparkles, Trash2 } from 'lucide-react'
import { downloadFile, svgToDataUrl } from '../../lib/export'
import { useStudio } from '../../lib/studio'
import type { BeadMaterial, BraceletBead, BraceletData } from '../../lib/types'
import { addBead, BEAD_CATALOG, buildMaterialsCsv, cloneBracelet, CORD_COLORS, countMaterials, createPreset, DEFAULT_NAME, estimateLength, exportFilename, lengthGuidance, MATERIAL_NAMES, MAX_BEADS, moveBead, PRESETS, safeColor } from './bracelet'
import { ARTBOARD_SIZE, buildBraceletSvg, layoutBeads } from './braceletSvg'
import './bracelet.css'

const FILTERS: { value: 'all' | BeadMaterial; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'crystal', label: '天然石' }, { value: 'pearl', label: '珍珠' },
  { value: 'glass', label: '玻璃' }, { value: 'wood', label: '木珠' }, { value: 'spacer', label: '金属' },
]

function BeadSwatch({ bead, small = false }: { bead: Pick<BraceletBead, 'color' | 'material'>; small?: boolean }) {
  return <span aria-hidden="true" className={`bracelet-bead-swatch bracelet-material-${bead.material}${small ? ' bracelet-bead-small' : ''}`} style={{ '--bracelet-bead-color': safeColor(bead.color) } as CSSProperties} />
}

export default function BraceletStudio() {
  const { artworks, editingArtwork, saveArtwork, navigate, notify } = useStudio()
  const editing = editingArtwork?.kind === 'bracelet' ? editingArtwork : null
  const [data, setData] = useState<BraceletData>(() => editing ? cloneBracelet(editing.data) : createPreset())
  const [name, setName] = useState(editing?.name ?? DEFAULT_NAME)
  const [savedId, setSavedId] = useState<string | undefined>(editing?.id)
  const [dirty, setDirty] = useState(!editing)
  const [filter, setFilter] = useState<'all' | BeadMaterial>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const exportMenu = useRef<HTMLDetailsElement>(null)
  const beadControls = useRef<HTMLDivElement>(null)
  const materials = useMemo(() => countMaterials(data.beads), [data.beads])
  const positions = useMemo(() => layoutBeads(data.beads), [data.beads])
  const svg = useMemo(() => buildBraceletSvg(data, name || '我的串饰'), [data, name])
  const previewUrl = useMemo(() => svgToDataUrl(svg), [svg])
  const length = estimateLength(data.beads)
  const guidance = lengthGuidance(length, data.wristSize, data.beads.length)
  const selectedIndex = data.beads.findIndex(bead => bead.id === selectedId)
  const selected = data.beads[selectedIndex]
  const saved = savedId ? artworks.find(artwork => artwork.id === savedId) : undefined
  const catalog = BEAD_CATALOG.filter(bead => filter === 'all' || bead.material === filter)

  function updateData(next: BraceletData) {
    setData(next)
    setDirty(true)
    setConfirmClear(false)
  }

  function handleAdd(bead: BraceletBead) {
    if (data.beads.length >= MAX_BEADS) {
      notify(`最多可搭配 ${MAX_BEADS} 颗珠子，请先移除一些再添加。`)
      return
    }
    const nextBead = { ...bead, id: crypto.randomUUID() }
    updateData({ ...data, beads: addBead(data.beads, nextBead) })
    setSelectedId(nextBead.id)
  }

  function handleMove(direction: -1 | 1) {
    if (!selected) return
    updateData({ ...data, beads: moveBead(data.beads, selectedIndex, direction) })
  }

  function handleRemove() {
    if (!selected) return
    const next = data.beads.filter(bead => bead.id !== selectedId)
    updateData({ ...data, beads: next })
    setSelectedId(next[Math.min(selectedIndex, next.length - 1)]?.id ?? null)
    beadControls.current?.focus()
  }

  function applyPreset(id: string) {
    const preset = createPreset(id)
    updateData({ ...preset, wristSize: data.wristSize })
    setSelectedId(null)
    notify(`已应用「${PRESETS.find(item => item.id === id)?.name ?? DEFAULT_NAME}」配色，作品名与手围保持不变。`)
  }

  function hasBeads() {
    if (data.beads.length) return true
    notify('串饰还是空的，先添加一颗珠子，或恢复示例后再保存 / 导出吧。')
    return false
  }

  function persist() {
    if (!hasBeads()) return null
    if (!name.trim()) {
      notify('给这份心意起个名字，再把它保存下来吧。')
      nameInput.current?.focus()
      return null
    }
    const artwork = saveArtwork({ kind: 'bracelet', name: name.trim(), data: { ...data, beads: data.beads.map(bead => ({ ...bead })) }, thumbnail: previewUrl }, savedId)
    if (artwork) {
      setSavedId(artwork.id)
      setDirty(false)
      setName(artwork.name)
    }
    return artwork
  }

  function handleGiftBox() {
    const artwork = !dirty && saved ? saved : persist()
    if (artwork) navigate('gift-box', artwork.id)
  }

  function handleExport(format: 'svg' | 'csv') {
    if (exportMenu.current) exportMenu.current.open = false
    if (!hasBeads()) return
    const filename = exportFilename(name)
    try {
      if (format === 'svg') downloadFile(svg, `${filename}-串饰预览.svg`, 'image/svg+xml;charset=utf-8')
      else downloadFile(buildMaterialsCsv(name.trim() || '我的串饰', data), `${filename}-材料清单.csv`, 'text/csv;charset=utf-8')
      notify(format === 'svg' ? '已导出透明背景 SVG，可用于预览与排版。' : '已导出材料清单 CSV，采购前请核对实物尺寸与颜色。')
    } catch {
      notify('暂时无法下载，请检查浏览器下载权限后重试。')
    }
  }

  return <div className="bracelet-studio">
    <header className="studio-heading bracelet-heading">
      <div>
        <div className="eyebrow"><span className="bracelet-eyebrow-line" /> A LITTLE BEAD, A LITTLE LOVE</div>
        <h1>串饰工坊<span className="bracelet-title-dot">.</span></h1>
        <p>把喜欢的颜色串起来，让心意在腕间慢慢发光。</p>
      </div>
      <div className="bracelet-heading-actions">
        <span className={`bracelet-save-state${dirty ? ' bracelet-unsaved' : ''}`}><span />{dirty ? (savedId ? '有未保存的修改' : '示例 · 可以自由创作') : '已保存在本机'}</span>
        <div className="bracelet-action-buttons">
          <details className="bracelet-export-menu" ref={exportMenu} onKeyDown={event => { if (event.key === 'Escape' && exportMenu.current) { exportMenu.current.open = false; exportMenu.current.querySelector('summary')?.focus() } }}>
            <summary className="btn btn-secondary"><ArrowDownToLine size={15} />导出<ChevronDown size={12} /></summary>
            <div className="bracelet-export-options">
              <button type="button" onClick={() => handleExport('svg')}><Gem size={16} /><span>预览 SVG<small>透明背景 · 矢量图</small></span></button>
              <button type="button" onClick={() => handleExport('csv')}><FileSpreadsheet size={16} /><span>材料清单 CSV<small>珠子种类 · 尺寸 · 数量</small></span></button>
            </div>
          </details>
          <button type="button" className="btn btn-primary" onClick={persist}><Save size={15} />{savedId ? '保存修改' : '保存作品'}</button>
        </div>
      </div>
    </header>

    <div className="bracelet-layout">
      <aside className="panel bracelet-palette" aria-labelledby="bracelet-palette-title">
        <div className="bracelet-section-kicker">01 <span>BEAD LIBRARY</span></div>
        <h2 className="panel-title" id="bracelet-palette-title">从一颗喜欢的珠子开始<small>{BEAD_CATALOG.length} 款</small></h2>
        <div className="bracelet-filters" role="group" aria-label="按珠子材质筛选">
          {FILTERS.map(item => <button type="button" key={item.value} className={filter === item.value ? 'bracelet-filter-active' : ''} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
        </div>
        <div className="bracelet-catalog" aria-label="点击珠子添加到串饰">
          {catalog.map(bead => <button type="button" className="bracelet-catalog-bead" key={bead.id} onClick={() => handleAdd(bead)} aria-label={`添加${bead.name}，${bead.size}毫米`}>
            <span className="bracelet-swatch-stage"><BeadSwatch bead={bead} /><span className="bracelet-add-dot"><Plus size={10} /></span></span>
            <strong>{bead.name}</strong><small>{bead.size} mm{bead.material === 'spacer' ? ' · 宽' : ''}</small>
          </button>)}
        </div>
        <p className="bracelet-palette-note"><Plus size={12} />点击添加到末尾 <span>{data.beads.length} / {MAX_BEADS}</span></p>
        <div className="divider" />
        <div className="bracelet-preset-heading"><Sparkles size={14} /><h3>借一点配色灵感</h3></div>
        <p className="bracelet-preset-hint">点击替换当前珠子，手围与作品名不变</p>
        <div className="bracelet-presets">
          {PRESETS.map(preset => <button type="button" key={preset.id} onClick={() => applyPreset(preset.id)} aria-label={`应用${preset.name}配色`}>
            <span className="bracelet-preset-colors" aria-hidden="true">{preset.colors.map(color => <i key={color} style={{ backgroundColor: color }} />)}</span>
            <span><strong>{preset.name}</strong><small>{preset.description}</small></span><ArrowUpRight size={13} />
          </button>)}
        </div>
      </aside>

      <section className="bracelet-workspace" aria-labelledby="bracelet-canvas-title">
        <div className="canvas-panel bracelet-canvas-panel">
          <div className="bracelet-canvas-topbar">
            <h2 id="bracelet-canvas-title"><span className="bracelet-live-dot" />搭配画布</h2>
            <div>
              <button type="button" onClick={() => applyPreset('garden')} title="恢复植野漫步示例"><RotateCcw size={13} />恢复示例</button>
              <button type="button" disabled={!data.beads.length} onClick={() => setConfirmClear(value => !value)} aria-expanded={confirmClear}><Trash2 size={13} />清空</button>
            </div>
          </div>
          {confirmClear && <div className="bracelet-clear-confirm" role="alert"><span>清空当前 {data.beads.length} 颗珠子？保存前不会改变已收藏的作品。</span><div><button type="button" onClick={() => setConfirmClear(false)}>取消</button><button type="button" onClick={() => { updateData({ ...data, beads: [] }); setSelectedId(null) }}>确认清空</button></div></div>}
          <div className="bracelet-artboard">
            <span className="bracelet-canvas-corner bracelet-corner-top" aria-hidden="true" /><span className="bracelet-canvas-corner bracelet-corner-bottom" aria-hidden="true" />
            <div className="bracelet-artboard-image">
              <img src={previewUrl} alt={`${name || '我的串饰'}，共 ${data.beads.length} 颗珠子的手链预览`} draggable={false} width={ARTBOARD_SIZE} height={ARTBOARD_SIZE} />
              {positions.map(position => <button type="button" key={position.bead.id} className={`bracelet-bead-hit${selectedId === position.bead.id ? ' bracelet-bead-selected' : ''}`} style={{ left: `${position.x / ARTBOARD_SIZE * 100}%`, top: `${position.y / ARTBOARD_SIZE * 100}%`, width: `${(Math.max(position.rx, position.ry) * 2 + 5) / ARTBOARD_SIZE * 100}%`, height: `${(Math.max(position.rx, position.ry) * 2 + 5) / ARTBOARD_SIZE * 100}%` }} onClick={() => setSelectedId(position.bead.id)} aria-label={`选择第 ${position.index + 1} 颗：${position.bead.name}`} aria-pressed={selectedId === position.bead.id} title={`第 ${position.index + 1} 颗 · ${position.bead.name} · ${position.bead.size} mm`} />)}
              <div className="bracelet-canvas-center">
                <Leaf size={23} strokeWidth={1.15} aria-hidden="true" />
                {data.beads.length ? <><span>MADE OF LITTLE MOMENTS</span><strong>一颗一颗，都是心意</strong><small>点击珠子，调整你的小小世界</small></> : <><span>YOUR STORY STARTS HERE</span><strong>留白，等一颗心动</strong><small>从珠子库添加，或恢复示例</small></>}
              </div>
            </div>
            <div className="bracelet-artboard-caption"><span>YOUR ONE-OF-A-KIND BRACELET</span><span>视觉示意 · 非 1:1 尺寸</span></div>
          </div>
          <div className="bracelet-stats" aria-live="polite">
            <div><span>珠子总数</span><strong>{data.beads.length}<small>颗</small></strong></div>
            <div><span>估算串长</span><strong>{length.toFixed(1)}<small>cm</small></strong></div>
            <div><span>对比手围</span><strong className="bracelet-stat-difference">{data.beads.length ? `${guidance.difference >= 0 ? '+' : '−'}${Math.abs(guidance.difference).toFixed(1)}` : '—'}<small>cm</small></strong></div>
          </div>
        </div>

        <div className="panel bracelet-sequence-panel">
          <div className="bracelet-sequence-heading"><h3>你的串珠顺序</h3><span>从顶部顺时针排列</span></div>
          <div className="bracelet-sequence" aria-label="串珠顺序">
            {data.beads.length ? data.beads.map((bead, index) => <button type="button" key={bead.id} className={selectedId === bead.id ? 'bracelet-sequence-selected' : ''} onClick={() => setSelectedId(bead.id)} aria-pressed={selectedId === bead.id} aria-label={`顺序 ${index + 1}，${bead.name}`}><BeadSwatch bead={bead} small /><span>{String(index + 1).padStart(2, '0')}</span></button>) : <p>还没有珠子，选一颗作为故事的开头吧。</p>}
          </div>
          <div className="bracelet-selected-controls" ref={beadControls} tabIndex={-1} aria-label="选中珠子操作">
            <div className="bracelet-selected-copy" aria-live="polite">{selected ? <><BeadSwatch bead={selected} small /><span><strong>{selected.name}</strong><small>第 {selectedIndex + 1} 颗 · {selected.size} mm · {MATERIAL_NAMES[selected.material]}</small></span></> : <><Gem size={20} strokeWidth={1.3} /><span><strong>每一颗，都由你决定</strong><small>点击画布或上方珠子，选中后调整</small></span></>}</div>
            <div className="bracelet-order-actions">
              <button type="button" disabled={!selected || selectedIndex === 0} onClick={() => handleMove(-1)} aria-label="选中珠子前移一位" title="前移一位"><ChevronLeft size={16} /><span>前移</span></button>
              <button type="button" disabled={!selected || selectedIndex === data.beads.length - 1} onClick={() => handleMove(1)} aria-label="选中珠子后移一位" title="后移一位"><span>后移</span><ChevronRight size={16} /></button>
              <button type="button" className="bracelet-remove" disabled={!selected} onClick={handleRemove} aria-label="移除选中珠子" title="移除选中珠子"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      </section>

      <aside className="panel bracelet-details" aria-labelledby="bracelet-details-title">
        <div className="bracelet-section-kicker">03 <span>THE LITTLE DETAILS</span></div>
        <h2 className="panel-title" id="bracelet-details-title">让它更像你<Leaf size={15} strokeWidth={1.4} /></h2>
        <div className="bracelet-detail-form">
        <div className="field bracelet-name-field">
          <label className="field-label" htmlFor="bracelet-name">作品名称<span>{name.length}/48</span></label>
          <input ref={nameInput} id="bracelet-name" type="text" value={name} maxLength={48} placeholder="给这份心意起个名字" onChange={event => { setName(event.target.value); setDirty(true) }} />
        </div>
        <div className="field bracelet-wrist-field">
          <label className="field-label" htmlFor="bracelet-wrist"><span><Ruler size={13} />参考手围</span><strong>{data.wristSize.toFixed(1)} <small>cm</small></strong></label>
          <input id="bracelet-wrist" type="range" min="14" max="22" step="0.5" value={data.wristSize} aria-describedby="bracelet-size-disclaimer" onChange={event => updateData({ ...data, wristSize: Number(event.target.value) })} />
          <div className="bracelet-range-labels"><span>14 cm</span><span>22 cm</span></div>
        </div>
        <div className="field bracelet-cord-field">
          <span className="field-label" id="bracelet-cord-label">串绳颜色<span>{CORD_COLORS.find(cord => cord.color === data.cordColor)?.name ?? '自定义'}</span></span>
          <div className="swatches" role="group" aria-labelledby="bracelet-cord-label">
            {CORD_COLORS.map(cord => <button type="button" key={cord.color} className={`swatch bracelet-cord-swatch${data.cordColor === cord.color ? ' active' : ''}`} style={{ backgroundColor: cord.color }} onClick={() => updateData({ ...data, cordColor: cord.color })} aria-label={`串绳颜色：${cord.name}`} aria-pressed={data.cordColor === cord.color} title={cord.name}>{data.cordColor === cord.color && <Check size={12} />}</button>)}
          </div>
        </div>
        <div className={`bracelet-fit-note bracelet-fit-${guidance.tone}`} aria-live="polite"><Ruler size={15} /><div><strong>{guidance.title}</strong><p>{guidance.detail}</p></div></div>
        <p className="bracelet-size-disclaimer" id="bracelet-size-disclaimer">串长 = 珠子直径 / 隔珠宽度之和，不等于成品内围。未计打结与弹力误差，请以实物试戴为准。</p>
        </div>
        <div className="bracelet-material-summary">
        <div className="bracelet-bill-heading"><h3>这一串，需要这些</h3><span>{materials.length} 种材料</span></div>
        <ul className="bracelet-material-list" aria-label="材料清单">
          {materials.map(material => <li key={material.key}><BeadSwatch bead={material} small /><span><strong>{material.name}</strong><small>{MATERIAL_NAMES[material.material]} · {material.size} mm{material.material === 'spacer' ? ' 宽' : ''}</small></span><b>× {material.count}</b></li>)}
          {!materials.length && <li className="bracelet-material-empty">添加珠子后，自动为你整理清单。</li>}
        </ul>
        <button type="button" className="bracelet-csv-button" onClick={() => handleExport('csv')}><FileSpreadsheet size={13} />导出材料清单<ArrowDownToLine size={12} /></button>
        <div className="bracelet-gift-next"><span>把心意，再包装一下</span><button type="button" className="btn bracelet-gift-button" onClick={handleGiftBox}><Gift size={16} />放入礼盒<ArrowUpRight size={15} /></button><p>{dirty || !saved ? '将先保存当前搭配，再前往礼盒工坊' : '已保存，继续为它挑选一份好看的包装'}</p></div>
        </div>
      </aside>
    </div>

    <footer className="bracelet-making-guide" aria-label="串饰制作小指南">
      <div className="bracelet-guide-intro"><Leaf size={24} strokeWidth={1.2} /><span>从灵感，到腕间<small>A SLOW, LOVELY LITTLE CRAFT</small></span></div>
      <div><i>01</i><p><strong>先排一排</strong><span>按清单备珠，平铺确认颜色与顺序</span></p></div>
      <div><i>02</i><p><strong>慢慢串起来</strong><span>预留绳长，穿珠后试戴并调整松紧</span></p></div>
      <div><i>03</i><p><strong>收好这份心意</strong><span>确认绳结牢固，再放进专属礼盒</span></p></div>
    </footer>
    <p className="bracelet-footer-note">颜色、纹理与材质名称仅供设计参考，不代表实际商品。小珠子请远离幼儿，制作时注意工具安全。</p>
  </div>
}
