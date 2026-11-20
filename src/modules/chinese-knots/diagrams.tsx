import type { ReactNode } from 'react'
import type { GuideColors } from '../../lib/craftGuide'
import { CORE_COLOR, CORE_X, PAPER, halfGeometry, knotCount, waitingBPath, workingX } from './geometry'
import type { CordPoint, KnotScene } from './geometry'

const INK = '#4e574d'
const MUTED = '#747669'
const SCENE_LABELS: Record<KnotScene['kind'], string> = {
  setup: '固定四根绳', overlap: '反向重叠两尾', midpoint: '工作绳中点在后',
  bight: 'A 在前面留圈', weave: 'B 绕后穿圈', tight: '均匀收拢',
  repeat: '交替编成结带', test: '逐结试滑与保持', tuck: '工作绳回穿结背',
  stoppers: '两个独立止结', finished: '离腕试拉后使用',
}

function Cord({ d, color, width = 10, knockout = true, dashed = false }: { d: string; color: string; width?: number; knockout?: boolean; dashed?: boolean }) {
  return <>
    {knockout && <path data-knockout="true" d={d} fill="none" stroke={PAPER} strokeWidth={width + 7} strokeLinecap="round" strokeLinejoin="round" />}
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '7 7' : undefined} />
  </>
}

function Label({ x, y, children, color = INK, anchor = 'start', size = 18 }: { x: number; y: number; children: ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; size?: number }) {
  return <text x={x} y={y} fill={color} fontSize={size} textAnchor={anchor}>{children}</text>
}

function Arrow({ from, to, color = MUTED, dashed = false }: { from: CordPoint; to: CordPoint; color?: string; dashed?: boolean }) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const wing = (offset: number) => `${to.x - 9 * Math.cos(angle + offset)},${to.y - 9 * Math.sin(angle + offset)}`
  return <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} strokeDasharray={dashed ? '5 5' : undefined} />
    <polyline points={`${wing(-0.55)} ${to.x},${to.y} ${wing(0.55)}`} />
  </g>
}

function CordLabel({ cord, point, color, below = false, offsetX = 0, offsetY = 0 }: { cord: 'A' | 'B'; point: CordPoint; color: string; below?: boolean; offsetX?: number; offsetY?: number }) {
  const x = point.x + offsetX
  const y = point.y + (below ? 24 : -17) + offsetY
  return <g data-cord-end={cord} data-end-x={point.x} data-end-y={point.y}>
    <rect x={x - 13} y={y - 20} width="26" height="26" rx="8" fill={PAPER} />
    <Label x={x} y={y} anchor="middle" color={color} size={21}>{cord}</Label>
  </g>
}

function Cores({ top = 76, bottom = 338, sliding = false }: { top?: number; bottom?: number; sliding?: boolean }) {
  return <g data-layer="cores">
    {Object.entries(CORE_X).map(([id, x]) => <g key={id} data-core={id} data-core-x={x}>
      <Cord d={`M${x} ${sliding && id === 'C2' ? Math.max(82, top) : top} V${bottom}`} color={CORE_COLOR} width={9} />
    </g>)}
  </g>
}

// The order is intentional, not cosmetic: B back < cores < A < B front.
// Knockout strokes are opaque paper color, including in downloaded sheets.
function Half({ mirrored = false, top = 88, compact = false, height = 40, bightOnly = false, colors }: {
  mirrored?: boolean; top?: number; compact?: boolean; height?: number; bightOnly?: boolean; colors: GuideColors
}) {
  const geometry = halfGeometry(mirrored, top, compact, height)
  const width = compact ? 7 : 10
  return <g data-half-route={mirrored ? 'right-bight' : 'left-bight'} data-compact={compact}>
    <g data-layer="b-back"><Cord d={bightOnly ? waitingBPath(mirrored, top) : geometry.b} color={colors.secondary} width={width} knockout={false} /></g>
    <Cores top={geometry.coreTop} bottom={geometry.coreBottom} />
    <g data-layer="a-front"><Cord d={geometry.a} color={colors.primary} width={width} /></g>
    <g data-layer="b-over-a"><Cord d={geometry.bOverA} color={colors.secondary} width={width} /></g>
    {!bightOnly && <g data-layer="b-exits-loop"><Cord d={geometry.bExit} color={colors.secondary} width={width} /></g>}
  </g>
}

function Band({ halves, colors, top = 88, height = 40 }: { halves: number; colors: GuideColors; top?: number; height?: number }) {
  return <g data-band-halves={halves}>
    {Array.from({ length: halves }, (_, index) => <Half key={index} top={top + index * height} height={height} compact mirrored={index % 2 === 1} colors={colors} />)}
  </g>
}

function Leads({ colors, sliding, top = 88 }: { colors: GuideColors; sliding: boolean; top?: number }) {
  return <g data-working-anchor={sliding ? 'separate-cord-midpoint-behind' : 'clipped-ends'}>
    <Cord d={sliding ? `M300 ${top} H250` : `M250 76 V${top}`} color={colors.primary} width={8} knockout={false} />
    <Cord d={sliding ? `M300 ${top} H350` : `M350 76 V${top}`} color={colors.secondary} width={8} knockout={false} />
  </g>
}

function Clip({ sliding }: { sliding: boolean }) {
  const x = sliding ? 262 : 224
  const width = sliding ? 44 : 152
  return <g data-fixture="clip">
    <rect x={x} y="52" width={width} height="24" rx="6" fill="#b4b9a3" />
    <path d={`M${x + 8} 66 H${x + width - 8}`} stroke="#697664" strokeWidth="3" strokeLinecap="round" />
  </g>
}

function BraceletBody() {
  // One connection between the non-free ends, below the lower free tail.
  // This wide view is omitted in close-up weaving steps to avoid extra crossings.
  return <g data-bracelet-connection="C1-top-to-C2-bottom">
    <Cord d="M284 76 C94 22 76 94 76 205 C76 343 195 370 316 370 V338" color={CORE_COLOR} width={9} />
  </g>
}

function FreeCoreEnds() {
  return <g data-free-core-directions="C1-down-C2-up" fill={CORE_COLOR}>
    <path d="M279 333 L284 343 L289 333 Z" />
    <path d="M311 87 L316 77 L321 87 Z" />
  </g>
}

function LooseHints({ mirrored, top, weaving, colors }: { mirrored: boolean; top: number; weaving: boolean; colors: GuideColors }) {
  const geometry = halfGeometry(mirrored, top)
  const direction = mirrored ? -1 : 1
  return <g data-hints="true">
    <Label x={300} y={geometry.frontY - 35} anchor="middle" color={colors.primary}>A 过前面</Label>
    <Arrow from={{ x: 300 - direction * 37, y: geometry.frontY - 21 }} to={{ x: 300 + direction * 37, y: geometry.frontY - 21 }} color={colors.primary} />
    <Label x={mirrored ? 470 : 42} y={top + 86}>{mirrored ? '右圈' : '左圈'}</Label>
    <Label x={mirrored ? 25 : 450} y={geometry.frontY - 25} color={colors.secondary}>B 压 A</Label>
    {weaving && <>
      <Label x={mirrored ? 465 : 24} y={top + 112}>从后穿出</Label>
      <Arrow from={{ x: geometry.exitX + direction * 18, y: geometry.frontY + 12 }} to={{ x: geometry.exitX + direction * 18, y: top + 89 }} color={colors.secondary} />
      <Arrow from={{ x: 300 + direction * 35, y: geometry.backY + 18 }} to={{ x: 300 - direction * 35, y: geometry.backY + 18 }} color={colors.secondary} dashed />
      <Label x={300} y={geometry.backY + 44} anchor="middle" color={colors.secondary}>B 绕后面</Label>
    </>}
  </g>
}

function Count({ halves }: { halves: number }) {
  const { full, remainingHalf } = knotCount(halves)
  return <g data-count-label="true">
    <rect x="429" y="310" width="152" height="57" rx="12" fill="#f1e9db" />
    <Label x={505} y={333} anchor="middle" color="#8f624a">{full} 个完整平结</Label>
    <Label x={505} y={355} anchor="middle">{remainingHalf ? '另有 1 个半结' : `共 ${halves} 个半结`}</Label>
  </g>
}

function Tucks({ colors }: { colors: GuideColors }) {
  // This is an explicitly schematic back-tuck route, NOT a new core binding.
  // Both ends stay outside x=284..316 and pass behind the existing knot rows.
  return <g data-finish="working-ends-only">
    <g data-tuck-cord="A"><Cord d="M250 288 C224 312 236 266 268 278 V214" color={colors.primary} width={6} dashed /></g>
    <g data-tuck-cord="B"><Cord d="M350 288 C376 312 364 266 332 278 V214" color={colors.secondary} width={6} dashed /></g>
  </g>
}

function Stopper({ core, y }: { core: 'C1' | 'C2'; y: number }) {
  const x = CORE_X[core]
  return <g data-stopper={core} data-stopper-x={x}>
    <rect x={x - 25} y={y - 23} width="50" height="46" rx="9" fill={PAPER} />
    <Cord d={`M${x} ${y - 24} C${x} ${y - 14} ${x - 20} ${y - 14} ${x - 16} ${y} C${x - 12} ${y + 17} ${x + 18} ${y + 15} ${x + 18} ${y - 1} C${x + 17} ${y - 15} ${x - 10} ${y - 10} ${x - 9} ${y + 2} C${x - 8} ${y + 13} ${x} ${y + 12} ${x} ${y + 24}`} color={CORE_COLOR} width={7} />
    <Cord d={`M${x - 9} ${y + 2} C${x - 8} ${y + 13} ${x} ${y + 12} ${x} ${y + 20}`} color={CORE_COLOR} width={7} />
  </g>
}

function SlidingFinish({ scene, colors, showHints }: { scene: KnotScene; colors: GuideColors; showHints: boolean }) {
  const tucked = ['tuck', 'stoppers', 'finished'].includes(scene.kind)
  const stopped = ['stoppers', 'finished'].includes(scene.kind)
  return <>
    <BraceletBody />
    <Leads colors={colors} sliding top={144} />
    <Cores sliding />
    {tucked && <Tucks colors={colors} />}
    <Band halves={scene.completedHalves} colors={colors} top={144} height={24} />
    {tucked ? <>
      <CordLabel cord="A" point={{ x: 268, y: 214 }} offsetX={-53} color={colors.primary} />
      <CordLabel cord="B" point={{ x: 332, y: 214 }} offsetX={53} color={colors.secondary} />
    </> : <>
      <Cord d="M250 288 Q231 300 220 314" color={colors.primary} width={8} />
      <Cord d="M350 288 Q369 300 380 314" color={colors.secondary} width={8} />
      <CordLabel cord="A" point={{ x: 220, y: 314 }} color={colors.primary} below />
      <CordLabel cord="B" point={{ x: 380, y: 314 }} color={colors.secondary} below />
    </>}
    {stopped && <><Stopper core="C2" y={110} /><Stopper core="C1" y={313} /></>}
    <FreeCoreEnds />
    {showHints && <g data-hints="true">
      {scene.kind === 'tuck' ? <>
        <Label x={108} y={178}>回穿已有结背</Label>
        <Label x={108} y={203}>虚线示意</Label>
        <Arrow from={{ x: 233, y: 270 }} to={{ x: 233, y: 226 }} color={colors.primary} dashed />
        <Arrow from={{ x: 367, y: 270 }} to={{ x: 367, y: 226 }} color={colors.secondary} dashed />
        <Label x={405} y={252}>先验证，再修尾</Label>
      </> : scene.kind === 'stoppers' ? <>
        <Label x={375} y={114}>C2 自己打单结</Label>
        <Label x={355} y={302}>C1 自己打单结</Label>
        <Label x={108} y={210}>各自打结</Label>
        <Label x={108} y={235}>两尾不相连</Label>
      </> : <>
        <Arrow from={{ x: 362, y: 130 }} to={{ x: 362, y: 89 }} />
        <Arrow from={{ x: 246, y: 309 }} to={{ x: 246, y: 347 }} />
        <Label x={388} y={101}>拉自由尾：缩小</Label>
        <Label x={108} y={209}>拉手链本体</Label>
        <Label x={108} y={234}>放大环口</Label>
        <Arrow from={{ x: 109, y: 273 }} to={{ x: 90, y: 293 }} />
        <Label x={401} y={261}>每整结都试滑</Label>
        <Label x={401} y={285}>停手后检查保持</Label>
      </>}
    </g>}
  </>
}

export function renderKnotDiagram(scene: KnotScene, colors: GuideColors, showHints: boolean, sliding: boolean) {
  const { full, remainingHalf } = knotCount(scene.completedHalves)
  const mirrored = scene.mirrored ?? false
  const loose = scene.kind === 'bight' || scene.kind === 'weave'
  const wideSliding = sliding && ['test', 'tuck', 'stoppers', 'finished'].includes(scene.kind)
  const top = 88 + scene.completedHalves * 40
  const geometry = halfGeometry(mirrored, top)
  const final = scene.kind === 'finished'
  const footer = scene.kind === 'tuck' || scene.kind === 'stoppers'
    ? '工作绳收尾，不穿入芯线'
    : sliding ? 'C1 自由端向下 · C2 自由端向上 · 先练样验证' : 'A / B 跟随绳子 · 灰芯 C1 / C2 始终不换位'

  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" fill="none" fontFamily="system-ui, sans-serif"
    data-knot-scene={scene.kind} data-completed-halves={scene.completedHalves} data-complete-knots={full} data-remaining-half={remainingHalf}>
    <title>{`${sliding ? '平结滑扣' : '平结基础'}：${SCENE_LABELS[scene.kind]}；${full} 个完整平结${remainingHalf ? '，另有一个半结' : ''}`}</title>
    <desc>固定视角，上端朝上，下端朝自己，不翻面。A 为主色，B 为辅色，身份不随左右改变；灰色 C1 始终在 C2 左侧。前面靠眼睛，后面靠桌面。穿压用背景色隔断表示，静态示意不代表实物测试。</desc>
    <rect width="600" height="400" rx="20" fill={PAPER} />
    <Label x={20} y={26}>{final ? '移开夹子 · 方向不变' : '上端固定 · 不翻面'}</Label>
    <Label x={580} y={26} anchor="end" color={MUTED}>前＝眼前 · 后＝桌面</Label>
    {Object.entries(CORE_X).map(([id, x]) => <g key={id} data-core-label={id}><Label x={x} y={47} anchor="middle" color={MUTED}>{id}</Label></g>)}
    {wideSliding ? <SlidingFinish scene={scene} colors={colors} showHints={showHints} /> : <>
      {sliding && ['overlap', 'midpoint'].includes(scene.kind) && <BraceletBody />}
      {scene.kind !== 'overlap' && <Leads colors={colors} sliding />}
      {['setup', 'midpoint'].includes(scene.kind) && <>
        <Cord d="M250 88 V332" color={colors.primary} />
        <Cord d="M350 88 V332" color={colors.secondary} />
      </>}
      <Cores sliding />
      {scene.completedHalves > 0 && <Band halves={scene.completedHalves} colors={colors} />}
      {loose && <Half mirrored={mirrored} top={top} bightOnly={scene.kind === 'bight'} colors={colors} />}
      {loose ? <>
        <CordLabel cord="A" point={geometry.endA} offsetX={mirrored ? -24 : 24} offsetY={24} color={colors.primary} />
        <CordLabel cord="B" point={scene.kind === 'weave' ? geometry.endB : { x: workingX(397, mirrored), y: 324 }} offsetX={scene.kind === 'weave' ? (mirrored ? 48 : -48) : 0} color={colors.secondary} below={scene.kind === 'bight'} />
        {showHints && <LooseHints mirrored={mirrored} top={top} weaving={scene.kind === 'weave'} colors={colors} />}
      </> : scene.kind !== 'overlap' && <>
        {scene.completedHalves > 0 && <>
          <Cord d={`M${scene.completedHalves % 2 ? 350 : 250} ${top} V332`} color={colors.primary} width={8} />
          <Cord d={`M${scene.completedHalves % 2 ? 250 : 350} ${top} V332`} color={colors.secondary} width={8} />
        </>}
        <CordLabel cord="A" point={{ x: scene.completedHalves % 2 ? 350 : 250, y: 332 }} color={colors.primary} below />
        <CordLabel cord="B" point={{ x: scene.completedHalves % 2 ? 250 : 350, y: 332 }} color={colors.secondary} below />
      </>}
      {sliding && <FreeCoreEnds />}
      {showHints && !loose && <g data-hints="true">
        {scene.kind === 'setup' ? <>
          <Label x={26} y={178}>两侧是工作绳</Label><Label x={26} y={204}>中间是两根芯线</Label>
          <Label x={396} y={221}>左 A · 右 B</Label><Label x={396} y={247}>先摆顺，再动手</Label>
        </> : scene.kind === 'overlap' ? <>
          <Label x={108} y={194}>另一端连回</Label><Label x={108} y={219}>同一条手链</Label>
          <Label x={364} y={106}>C2 自由端 ↑</Label><Label x={358} y={293}>C1 自由端 ↓</Label>
          <Label x={368} y={215}>反向 · 平行重叠</Label>
        </> : scene.kind === 'midpoint' ? <>
          <Label x={384} y={107}>中点在两芯后</Label>
          <Label x={108} y={213}>另取工作绳</Label><Label x={108} y={240}>两端分色示意</Label>
          <Label x={389} y={214}>左 A · 右 B</Label>
        </> : <>
          <Label x={26} y={205}>{scene.completedHalves === 1 ? '先停一下' : '两个反向半结'}</Label>
          <Label x={26} y={232}>{scene.completedHalves === 1 ? '这只是一个半结' : '才是一个平结'}</Label>
          <Label x={402} y={204}>{scene.completedHalves === 1 ? 'A 已到右侧' : 'A 回到左侧'}</Label>
          <Label x={402} y={231}>{sliding ? '每整结都试滑' : '不要一直从左起手'}</Label>
        </>}
      </g>}
    </>}
    {!final && <Clip sliding={sliding} />}
    <Count halves={scene.completedHalves} />
    <Label x={300} y={388} anchor="middle" color={MUTED}>{footer}</Label>
  </svg>
}
