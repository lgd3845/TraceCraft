import type { ReactNode } from 'react'
import type { GuideColors } from '../../lib/craftGuide'
import { FLOWER_PARTIAL_REFLECTIONS, FLOWER_PROFILE, FLOWER_REFLECTIONS, HEART_PROFILE, HEART_REFLECTIONS, profilePaths } from './geometry'
import type { CutProfile, Point } from './geometry'

export const CUT_COLOR = '#b43732'
export const FOLD_COLOR = '#246caa'
const INK = '#354b42'
const EDGE = '#899180'
const WASTE = '#f0ece3'

function Label({ x, y, children, anchor = 'middle', color = INK }: {
  x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; color?: string
}) {
  return <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={18}>{children}</text>
}

function Fold({ d, protectedEdge = false }: { d: string; protectedEdge?: boolean }) {
  return <path data-role={protectedEdge ? 'protected-fold' : 'fold'} d={d} fill="none" stroke={FOLD_COLOR} strokeWidth={protectedEdge ? 4 : 2.5} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
}

function Arrow({ d, tip, angle = 0 }: { d: string; tip: Point; angle?: number }) {
  return <g fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} /><path d="M-10 -6 L0 0 L-10 6" transform={`translate(${tip.join(' ')}) rotate(${angle})`} />
  </g>
}

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={4} fill={INK} stroke="#fffdf8" strokeWidth={1.5} />
}

function Legend({ paper }: { paper: string }) {
  return <g data-role="legend">
    <path d="M28 378 H55" stroke={FOLD_COLOR} strokeWidth={3} strokeDasharray="7 5" />
    <Label x={64} y={384} anchor="start">折边不剪</Label>
    <path d="M187 378 H214" stroke={CUT_COLOR} strokeWidth={3} />
    <Label x={223} y={384} anchor="start">曲线剪口</Label>
    <rect x={345} y={369} width={18} height={18} fill={paper} stroke={EDGE} />
    <Label x={372} y={384} anchor="start">保留</Label>
    <rect x={465} y={369} width={18} height={18} fill={WASTE} stroke={EDGE} />
    <Label x={492} y={384} anchor="start">废料</Label>
  </g>
}

function Piece({ profile, fill, reflection = [1, 1], outline = true }: {
  profile: CutProfile; fill: string; reflection?: Point; outline?: boolean
}) {
  const paths = profilePaths(profile)
  return <g data-profile={profile.name} data-reflection={reflection.join(',')} transform={`scale(${reflection.join(' ')})`}>
    <path data-role="retained" d={paths.retained} fill={fill} stroke={fill} strokeWidth={0.6} />
    {outline && <path data-role="finished-edge" d={paths.cut} fill="none" stroke={EDGE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
  </g>
}

function InitialSheet({ colors, flower, hints }: { colors: GuideColors; flower: boolean; hints: boolean }) {
  return <g>
    <rect data-role="source-paper" x={180} y={72} width={240} height={240} fill={colors.primary} stroke={EDGE} strokeWidth={2} />
    <Label x={300} y={166}>正面朝上</Label>
    <Label x={300} y={347}>15 cm × 15 cm · 薄彩纸</Label>
    {hints && <g data-role="hint">
      <path d="M180 326 V333 M180 330 H420 M420 326 V333" fill="none" stroke={EDGE} />
      {flower && <><Dot x={300} y={192} /><path d="M309 197 L443 226" stroke={EDGE} /><Label x={451} y={234} anchor="start">纸心 O</Label></>}
      {!flower && <><path d="M300 210 V298" stroke={FOLD_COLOR} strokeWidth={2} strokeDasharray="7 5" /><Label x={435} y={269} anchor="start" color={FOLD_COLOR}>下步对折</Label></>}
    </g>}
  </g>
}

function FirstFold({ colors, flower, hints }: { colors: GuideColors; flower: boolean; hints: boolean }) {
  return <g>
    <Label x={167} y={76}>左半向右翻</Label>
    <rect data-role="source-paper" x={72} y={96} width={190} height={190} fill={colors.primary} stroke={EDGE} strokeWidth={2} />
    <Fold d="M167 96 V286" />
    <Arrow d="M112 197 Q167 121 222 197" tip={[222, 197]} angle={54} />
    <Label x={118} y={258}>左</Label><Label x={218} y={258}>右</Label>
    <Arrow d="M286 168 H347" tip={[347, 168]} />
    <Label x={452} y={76}>折好后</Label>
    <rect data-role="folded-paper" x={405} y={96} width={95} height={190} fill={colors.secondary} stroke={EDGE} strokeWidth={2} />
    <Fold d="M405 96 V286" />
    <Label x={358} y={241} color={FOLD_COLOR}>折边</Label>
    <path d="M379 235 H399" stroke={FOLD_COLOR} />
    <Label x={515} y={200} anchor="start">开口</Label>
    <Label x={450} y={318}>上、右、下为开口</Label>
    {flower && <><Dot x={405} y={191} /><Label x={383} y={194}>O</Label></>}
    {hints && <Label x={300} y={363}>对齐上下角点，再压平中间折痕</Label>}
  </g>
}

function SecondFold({ colors, hints }: { colors: GuideColors; hints: boolean }) {
  return <g>
    <Label x={140} y={64}>上半向下翻</Label>
    <rect data-role="source-paper" x={90} y={84} width={100} height={200} fill={colors.secondary} stroke={EDGE} strokeWidth={2} />
    <Fold d="M90 84 V284 M90 184 H190" />
    <Arrow d="M136 128 Q218 184 136 240" tip={[136, 240]} angle={146} />
    <Dot x={90} y={184} /><Label x={68} y={190}>O</Label>
    <Arrow d="M246 222 H303" tip={[303, 222]} />
    <rect data-role="folded-paper" x={358} y={154} width={150} height={150} fill={colors.primary} stroke={EDGE} strokeWidth={2} />
    <Fold d="M358 304 V154 H508" />
    <Dot x={358} y={154} /><Label x={337} y={145}>O</Label>
    <Label x={430} y={135} color={FOLD_COLOR}>上折边</Label>
    <Label x={306} y={266} color={FOLD_COLOR}>左折边</Label>
    <Label x={522} y={236} anchor="start">开口</Label>
    <Label x={435} y={333}>开口</Label>
    <Label x={300} y={372}>{hints ? 'O 是原纸中心 · 两条折边在左上角相遇' : '左上角 O 要保留，不挖孔'}</Label>
  </g>
}

function HeartPattern({ colors, cutting, hints }: { colors: GuideColors; cutting: boolean; hints: boolean }) {
  const paths = profilePaths(HEART_PROFILE)
  return <g>
    <g transform="translate(280 70)">
      <rect data-role="source-paper" width={120} height={240} fill={WASTE} stroke={EDGE} strokeWidth={2} />
      <Piece profile={HEART_PROFILE} fill={colors.secondary} outline={false} />
      <Fold d="M0 0 V240" />
      <Fold d={paths.protectedFold} protectedEdge />
      <path data-role="cut-path" d={paths.cut} fill="none" stroke={CUT_COLOR} strokeWidth={3.5} vectorEffect="non-scaling-stroke" />
    </g>
    <Label x={340} y={60}>上开口</Label>
    <Label x={423} y={225} anchor="start">右开口</Label>
    <Label x={340} y={339}>下开口</Label>
    <Label x={146} y={191} color={FOLD_COLOR}>左折边 · 不剪</Label>
    <Label x={146} y={218}>保留 A、B 之间</Label>
    <path d="M218 193 H270" stroke={FOLD_COLOR} strokeWidth={1.5} />
    <Dot x={280} y={132} /><Dot x={280} y={282} />
    <Label x={260} y={134} anchor="end" color={CUT_COLOR}>{cutting ? 'A 起剪' : 'A 凹口'}</Label>
    <Label x={260} y={290} anchor="end" color={CUT_COLOR}>{cutting ? 'B 停剪' : 'B 尖端'}</Label>
    <Label x={329} y={189}>保留</Label>
    <Label x={435} y={112} anchor="start">废料</Label>
    {hints && <path data-role="hint" d="M429 117 L389 98" fill="none" stroke={EDGE} />}
    <Legend paper={colors.secondary} />
  </g>
}

function FlowerPattern({ colors, cutting, hints }: { colors: GuideColors; cutting: boolean; hints: boolean }) {
  const paths = profilePaths(FLOWER_PROFILE)
  return <g>
    <g transform="translate(238 104) scale(2)">
      <rect data-role="source-paper" width={120} height={120} fill={WASTE} stroke={EDGE} strokeWidth={1} />
      <Piece profile={FLOWER_PROFILE} fill={colors.primary} outline={false} />
      <Fold d="M0 120 V0 H120" />
      <Fold d={paths.protectedFold} protectedEdge />
      <path data-role="cut-path" d={paths.cut} fill="none" stroke={CUT_COLOR} strokeWidth={3.5} vectorEffect="non-scaling-stroke" />
    </g>
    <Dot x={238} y={104} /><Label x={216} y={101}>O</Label>
    <Dot x={282} y={104} /><Dot x={238} y={148} />
    <Label x={282} y={82} color={CUT_COLOR}>{cutting ? 'A 起剪' : 'A'}</Label>
    <Label x={220} y={155} anchor="end" color={CUT_COLOR}>{cutting ? 'B 停剪' : 'B'}</Label>
    <Label x={392} y={82} color={FOLD_COLOR}>上折边</Label>
    <Label x={201} y={312} color={FOLD_COLOR}>左折边</Label>
    <Label x={492} y={222} anchor="start">右开口</Label>
    <Label x={358} y={363}>下开口</Label>
    <Label x={110} y={206} color={FOLD_COLOR}>O 周围留宽桥</Label>
    <Label x={110} y={233}>OA、OB 不剪</Label>
    <path d="M182 198 L250 119" stroke={FOLD_COLOR} strokeWidth={1.5} />
    <Label x={309} y={192}>保留</Label><Label x={435} y={321}>废料</Label>
    {hints && <Label x={111} y={263}>各留约一指宽</Label>}
    <Legend paper={colors.primary} />
  </g>
}

function HeartUnfold({ colors, final, hints }: { colors: GuideColors; final: boolean; hints: boolean }) {
  const reflections: readonly Point[] = final ? HEART_REFLECTIONS : [[1, 1], [-0.55, 1]]
  return <g>
    <g transform="translate(300 17) scale(1.35)">
      {reflections.map(reflection => <Piece key={reflection.join(',')} profile={HEART_PROFILE} fill={colors.primary} reflection={reflection} />)}
      {(!final || hints) && <Fold d={profilePaths(HEART_PROFILE).protectedFold} protectedEdge />}
    </g>
    {!final && <>
      <Arrow d="M243 83 Q193 87 168 126" tip={[168, 126]} angle={124} />
      <Label x={119} y={166}>向左轻轻打开</Label>
      <Label x={300} y={338}>展开中 · 中间折痕仍相连</Label>
    </>}
    {final && hints && <>
      <Label x={300} y={339}>两半来自同一条曲线 · 中间没有剪开</Label>
      <Label x={300} y={377}>示意图非等比例剪裁模板 · 先用废纸试剪</Label>
    </>}
  </g>
}

function FlowerUnfold({ colors, final, hints }: { colors: GuideColors; final: boolean; hints: boolean }) {
  const reflections = final ? FLOWER_REFLECTIONS : FLOWER_PARTIAL_REFLECTIONS
  const scale = final ? 1.62 : 1.35
  const originX = final ? 300 : 280
  return <g>
    <g transform={`translate(${originX} 199) scale(${scale})`}>
      {reflections.map(reflection => <Piece key={reflection.join(',')} profile={FLOWER_PROFILE} fill={final ? colors.primary : colors.secondary} reflection={reflection} />)}
      {(!final || hints) && <>
        <Fold d="M0 -22 V22" protectedEdge />
        {final && <Fold d="M-22 0 H22" protectedEdge />}
        {!final && hints && <Fold d="M0 0 H22" />}
      </>}
    </g>
    {!final && <>
      <Arrow d="M442 269 Q494 199 442 129" tip={[442, 129]} angle={-127} />
      <Label x={465} y={105}>向上打开</Label>
      <Label x={152} y={203} color={FOLD_COLOR}>左折边仍相连</Label>
      <path d="M220 197 H273" stroke={FOLD_COLOR} strokeWidth={1.5} />
      <Label x={258} y={229}>O</Label>
      <Label x={300} y={348}>右侧出现两瓣 · 接下来向左展开</Label>
    </>}
    {final && hints && <>
      <Label x={300} y={351}>四瓣连成一片 · 中心实心、不挖孔</Label>
      <Label x={300} y={382}>示意图非等比例剪裁模板 · 先用废纸试剪</Label>
    </>}
  </g>
}

const heartStages = ['准备一张正方形纸', '一次对折，左半向右', '先画半颗心，不封口', '沿曲线剪，保护折边', '慢慢打开，不拉尖端', '一张纸，一整颗心']
const flowerStages = ['准备一张正方形纸', '第一折：左半向右', '第二折：上半向下', '先留连接，再画一瓣', '只剪弧线，不剪中心', '先撤销上下对折', '四瓣相连，心意成花']

function renderPaperDiagram(kind: 'heart' | 'flower', step: number, colors: GuideColors, showHints: boolean) {
  const flower = kind === 'flower'
  const stages = flower ? flowerStages : heartStages
  const index = Number.isFinite(step) ? Math.max(0, Math.min(stages.length - 1, Math.trunc(step))) : 0
  const final = index === stages.length - 1
  const layers = flower ? [1, 2, 4, 4, 4, 2, 1][index] : [1, 2, 2, 2, 1, 1][index]
  let body: ReactNode
  if (index === 0) body = <InitialSheet colors={colors} flower={flower} hints={showHints} />
  else if (index === 1) body = <FirstFold colors={colors} flower={flower} hints={showHints} />
  else if (flower && index === 2) body = <SecondFold colors={colors} hints={showHints} />
  else if (flower && (index === 3 || index === 4)) body = <FlowerPattern colors={colors} cutting={index === 4} hints={showHints} />
  else if (!flower && (index === 2 || index === 3)) body = <HeartPattern colors={colors} cutting={index === 3} hints={showHints} />
  else body = flower ? <FlowerUnfold colors={colors} final={final} hints={showHints} /> : <HeartUnfold colors={colors} final={final} hints={showHints} />

  // Inline presentation and no shared IDs keep simultaneous previews and exports self-contained.
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label={`${flower ? '连体四瓣花' : '对折爱心'}：${stages[index]}`}>
    <title>{`${flower ? '连体四瓣花' : '对折爱心'} · ${stages[index]}`}</title>
    <desc>原创折剪示意，非等比例剪裁模板。蓝色虚线是折边，红色实线是剪线；彩色保留，浅灰废料。请先用废纸试剪。</desc>
    <g fontFamily="sans-serif" fontSize={18} fill={INK} strokeLinejoin="round">
      <rect width={600} height={400} fill="#fbfaf6" />
      {(!final || showHints) && <>
        <text x={28} y={32} fontSize={20} fontWeight={600}>{stages[index]}</text>
        <rect x={481} y={12} width={91} height={30} rx={15} fill="#edf0e8" />
        <Label x={526} y={33}>{!flower && index === 4 ? '展开中' : `${layers} 层`}</Label>
      </>}
      {body}
    </g>
  </svg>
}

export function renderHeartDiagram(step: number, colors: GuideColors, showHints: boolean) {
  return renderPaperDiagram('heart', step, colors, showHints)
}

export function renderFlowerDiagram(step: number, colors: GuideColors, showHints: boolean) {
  return renderPaperDiagram('flower', step, colors, showHints)
}
