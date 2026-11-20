import type { GuideColors } from '../../lib/craftGuide'
import { ACCENT, Arrow, Crease, Diagram, INK, Label, Panels, Paper, Target } from './diagramPrimitives'
import { diagramStep, HEART, HEART_FOLDS, LEFT_FLAP, RIGHT_FLAP } from './geometry'
import type { Fold, Point } from './geometry'

function HeartPaper({ phase, colors }: { phase: number; colors: GuideColors }) {
  const { primary, secondary } = colors
  if (phase === 0) return <Paper vertices={HEART.diamond} fill={secondary} />
  if (phase === 1) return <g><Paper vertices={HEART.topOutline} fill={secondary} /><Paper vertices={HEART.topFlap} fill={primary} /></g>
  if (phase === 2) return <g><Paper vertices={HEART.bottomOutline} fill={secondary} /><Paper vertices={HEART.topFlap} fill={primary} /><Paper vertices={HEART.bottomFlap} fill={primary} /></g>
  if (phase === 3) return <g>
    <Paper vertices={HEART.rightFixed} fill={secondary} />
    <Paper vertices={HEART.topFlap} fill={primary} />
    <Paper vertices={[[-75, 25], [0, 25], [37.5, -12.5], [0, -50]]} fill={primary} />
    <Paper vertices={RIGHT_FLAP} fill={primary} />
  </g>
  if (phase === 4) return <g><Paper vertices={RIGHT_FLAP} fill={primary} /><Paper vertices={LEFT_FLAP} fill={primary} /></g>
  const outline = phase < 6 ? HEART.rough : phase === 6 ? HEART.sides : HEART.finished
  const back = phase >= 5 && phase <= 7
  return <g>
    <Paper vertices={outline} fill={primary} />
    {!back && <line x1={0} y1={-50} x2={0} y2={25} stroke={INK} strokeWidth={1.2} />}
    {back && <>
      {[-1, 1].map(sign => <g key={sign} transform={`scale(${sign} 1)`}>
        <Paper vertices={phase < 7 ? [[0, -50], [25, -75], [50, -50]] : [[0, -50], [12.5, -62.5], [37.5, -62.5], [50, -50]]} fill={secondary} />
        {phase >= 6 && <Paper vertices={[[50, -50], [50, -25], [37.5, -37.5]]} fill={primary} />}
        {phase >= 7 && <Paper vertices={[[12.5, -62.5], [37.5, -62.5], [25, -50]]} fill={primary} />}
      </g>)}
      <line x1={-50} y1={-50} x2={50} y2={-50} stroke={INK} strokeWidth={1.2} />
    </>}
  </g>
}

function FoldHints({ fold, bend }: { fold: Fold; bend?: Point }) {
  return <g data-hint="fold"><Crease a={fold.crease[0]} b={fold.crease[1]} /><Target at={fold.to} /><Arrow from={fold.from} to={fold.to} bend={bend} /></g>
}

const captions = [
  ['两次对角折，各自展开', '展开后的定位折痕'],
  ['上角 → 原来的中心', '留下新的水平顶边'],
  ['下角 → 新顶边中点', '下角到顶，不停在中心'],
  ['提起右侧，整叠向上折', '右半底边贴住中线'],
  ['左侧做对称的折叠', '两条原底边在中线相遇'],
  ['翻面前 · 合拢面', '翻面后 · 模型背面'],
  ['背面：两侧尖角内收', '左右各折同样一小角'],
  ['背面：两枚顶尖向下', '两条新顶边一样高'],
  ['背面的小角留在后方', '再翻回正面 · 平面爱心'],
] as const

const notes = [
  '先上下，再左右；两次都展开，不是叠成四层。',
  '正面原先朝下；翻折的小三角露出纸正面。',
  '目标是新顶边中点，不是原上角，也不是中心。',
  '斜折线从底边中点出发，与底边成 45°。',
  '下方交点留作心尖，两侧折边只相接、不重叠。',
  '拿起整张，像翻书一样翻面；不是在桌上转向。',
  '局部放大示意；小角大小可微调，左右保持一致。',
  '局部放大示意；只修整顶尖，不折下整个上半部。',
  '正面看不到四个收角；折纸结构示意，非物理模拟。',
]

export function HeartDiagram({ step, colors, showHints }: { step: number; colors: GuideColors; showHints: boolean }) {
  const index = diagramStep(step, captions.length)
  const enlarged = index >= 5
  const scale = enlarged ? 1.9 : 1.08
  const y = enlarged ? 240 : 210
  const left = `translate(150 ${y}) scale(${scale})`
  const right = `translate(450 ${y}) scale(${scale})`
  const prior = Math.max(0, index - 1)
  return <Diagram title={`平面爱心 · 第 ${index + 1} 步`} description={`${captions[index].join('；')}。${notes[index]}`} colors={colors} hints={showHints} note={notes[index]}>
    <g data-stage={`heart-${index}`}>
      <Panels left={captions[index][0]} right={captions[index][1]} />
      <g transform={left}>
        <g opacity={showHints && ![5, 8].includes(index) ? 0.34 : 1}><HeartPaper phase={prior} colors={colors} /></g>
        {showHints && index === 0 && <g data-hint="diagonals">
          <Crease a={[-100, 0]} b={[100, 0]} /><Crease a={[0, -100]} b={[0, 100]} />
          <Arrow from={[0, -94]} to={[0, 94]} bend={[110, 0]} />
          <Arrow from={[-94, 0]} to={[94, 0]} bend={[0, -110]} />
        </g>}
        {showHints && index === 1 && <>
          <Paper vertices={[[-50, -50], [0, -100], [50, -50]]} fill={colors.secondary} moving />
          <FoldHints fold={HEART_FOLDS.top} bend={[65, -45]} />
        </>}
        {showHints && index === 2 && <>
          <Paper vertices={[[-75, 25], [75, 25], [0, 100]]} fill={colors.secondary} moving />
          <line data-hint="new-top-edge" x1={-50} y1={-50} x2={50} y2={-50} stroke={ACCENT} strokeWidth={3} />
          <FoldHints fold={HEART_FOLDS.bottom} bend={[104, 50]} />
        </>}
        {showHints && (index === 3 || index === 4) && <>
          <Paper vertices={index === 3 ? HEART.rightMoving : HEART.leftMoving} fill={colors.secondary} moving />
          <Paper vertices={index === 3 ? [[0, 25], [75, 25], [37.5, -12.5]] : [[0, 25], [-75, 25], [-37.5, -12.5]]} fill={colors.primary} moving />
          <Crease a={[0, -50]} b={[0, 25]} />
          <line x1={0} y1={25} x2={index === 3 ? 75 : -75} y2={25} stroke={ACCENT} strokeWidth={3} />
          <FoldHints fold={index === 3 ? HEART_FOLDS.right : HEART_FOLDS.left} bend={[index === 3 ? 88 : -88, -60]} />
          <Target at={[0, 25]} />
        </>}
        {showHints && index === 6 && <>
          <Paper vertices={[[50, -50], [62.5, -37.5], [50, -25]]} fill={colors.primary} moving />
          <Paper vertices={[[-50, -50], [-62.5, -37.5], [-50, -25]]} fill={colors.primary} moving />
          <FoldHints fold={HEART_FOLDS.rightSide} bend={[53, -10]} /><FoldHints fold={HEART_FOLDS.leftSide} bend={[-53, -10]} />
        </>}
        {showHints && index === 7 && <>
          <Paper vertices={[[12.5, -62.5], [25, -75], [37.5, -62.5]]} fill={colors.secondary} moving />
          <Paper vertices={[[-37.5, -62.5], [-25, -75], [-12.5, -62.5]]} fill={colors.secondary} moving />
          <FoldHints fold={HEART_FOLDS.rightTip} bend={[44, -64]} /><FoldHints fold={HEART_FOLDS.leftTip} bend={[-44, -64]} />
        </>}
      </g>
      <g transform={right}>
        <HeartPaper phase={index} colors={colors} />
        {showHints && index === 0 && <g data-hint="diagonals"><Crease a={[-100, 0]} b={[100, 0]} /><Crease a={[0, -100]} b={[0, 100]} /><Target at={[0, 0]} /></g>}
        {showHints && (index === 1 || index === 2) && <Target at={index === 1 ? [0, 0] : [0, -50]} />}
        {showHints && (index === 3 || index === 4) && <g data-hint="aligned-edges">
          <line x1={0} y1={-50} x2={0} y2={25} stroke={ACCENT} strokeWidth={2.5} />
          <Target at={[0, 25]} />
        </g>}
      </g>
      {index === 2 && <><Label x={150} y={129} color={ACCENT}>新顶边</Label><Label x={450} y={335}>纸尖恰好碰到这条边</Label></>}
      {(index === 3 || index === 4) && <><Label x={150} y={335}>底边的一半 → 竖直中线</Label><Label x={450} y={335}>底边中点成为心尖</Label></>}
      {(index === 5 || index === 8) && <>
        <Arrow from={[270, 136]} to={[330, 136]} bend={[300, 96]} />
        <Label x={300} y={335} color={ACCENT}>整张翻面，纸尖仍朝下</Label>
      </>}
      {index === 6 && <Label x={300} y={335}>仅把左右各一小角折进模型背面</Label>}
      {index === 7 && <Label x={300} y={335}>顶尖下折；纸背面的浅色边留在背后</Label>}
    </g>
  </Diagram>
}
