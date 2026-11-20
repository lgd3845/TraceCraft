import type { GuideColors } from '../../lib/craftGuide'
import { ACCENT, Arrow, Crease, Diagram, INK, Label, Panels, Paper, Target } from './diagramPrimitives'
import { diagramStep, edgeTail, points, STAR_PINCHES, STAR_PUFFED, STAR_VERTICES, wrappedBand } from './geometry'

const LOOSE_LOOP = 'M 540 285 L 365 285 L 195 140 L 230 105 L 285 120 L 370 205 L 325 280 L 235 265 L 190 230 L 145 245'
const THREADED_KNOT = 'M 540 285 L 365 285 L 195 140 L 230 105 L 285 120 L 370 205 L 325 280 L 235 265 L 205 215 L 245 165 L 345 125 L 408 105'

function Ribbon({ d, fill, moving = false }: { d: string; fill: string; moving?: boolean }) {
  return <g data-paper="strip" data-moving={moving || undefined} fill="none" strokeLinejoin="round" strokeLinecap="butt">
    <path d={d} stroke={moving ? ACCENT : INK} strokeWidth={30} />
    <path d={d} stroke={fill} strokeWidth={26} />
  </g>
}

/** One continuous broad strip with local overpasses, not a string or a bow.
 * Along the open knot the crossings alternate under/over/under/over/under/over.
 * Overpasses repaint both paper edges, visibly interrupting the lower band.
 */
function LooseKnot({ threaded, colors, moving = false }: { threaded: boolean; colors: GuideColors; moving?: boolean }) {
  return <g data-knot={threaded ? 'single-overhand' : 'one-loop'}>
    <Ribbon d={threaded ? THREADED_KNOT : LOOSE_LOOP} fill={colors.primary} />
    <Ribbon d="M 195 140 L 230 105 L 285 120" fill={colors.secondary} />
    <g data-overpass="loop-over-long-end"><Ribbon d="M 348 241.667 L 327 276.667" fill={colors.primary} /></g>
    {threaded && <>
      <g data-overpass="standing-band-over-thread"><Ribbon d="M 220 161.324 L 253 189.471" fill={colors.primary} /></g>
      <g data-overpass="short-end-out-of-loop"><Ribbon d="M 284 149.4 L 345 125 L 408 105" fill={colors.primary} moving={moving} /></g>
    </>}
  </g>
}

function PentagonLayers({ colors, flipped = false, shortEdge, longEdge, longLength = 78, shortLength = 28 }: { colors: GuideColors; flipped?: boolean; shortEdge?: number; longEdge?: number; longLength?: number; shortLength?: number }) {
  const front = flipped ? colors.secondary : colors.primary
  const back = flipped ? colors.primary : colors.secondary
  return <g data-pentagon="layered">
    {longEdge !== undefined && <g data-tail="long"><Paper vertices={edgeTail(longEdge, longLength)} fill={front} /></g>}
    {shortEdge !== undefined && <g data-tail="short"><Paper vertices={edgeTail(shortEdge, shortLength)} fill={front} /></g>}
    <Paper vertices={STAR_VERTICES} fill={back} />
    <Paper vertices={wrappedBand(2)} fill={front} />
    <Paper vertices={wrappedBand(4)} fill={back} />
    <Paper vertices={wrappedBand(1)} fill={front} />
    <polygon points={points(STAR_VERTICES)} fill="none" stroke={INK} strokeWidth={1.8} />
  </g>
}

function EdgeFold({ edge }: { edge: number }) {
  return <Crease a={STAR_VERTICES[edge]} b={STAR_VERTICES[(edge + 1) % 5]} />
}

const captions = [
  '留出短端，交叉成一个松环',
  '短端从环背后穿出，仅穿一次',
  '轻收纸结，整理出五条边',
  '先藏短端，保留长端',
  '沿五边形换边绕，别折成方块',
  '绕到余下一小截，再藏末端',
  '逐边轻压中点，保留五个顶点',
]
const notes = [
  '纸条约 1 × 25 cm；此处放大，长端余长省略。',
  '交叉处断开的边线表示下穿；纸条没有剪断。',
  '收紧到平整即可，不要猛拉；外轮廓应有五条边。',
  '只把短端藏进交叉纸带下，长端留着继续绕。',
  '两次绕边示例：随尾端出口换边，绕几次不固定。',
  '末端藏入已有纸带下；若太长，先再绕一边。',
  '轻扶纸边，勿压扁中心；鼓起效果受纸张与手法影响。',
]

export function StarDiagram({ step, colors, showHints }: { step: number; colors: GuideColors; showHints: boolean }) {
  const index = diagramStep(step, captions.length)
  return <Diagram title={`幸运星 · 第 ${index + 1} 步`} description={`${captions[index]}。${notes[index]}。纸带层次与鼓起形态为示意，不是物理模拟。`} colors={colors} hints={showHints} note={notes[index]}>
    <g data-stage={`star-${index}`}>
      {index <= 1 && <>
        <Label x={300} y={76}>{captions[index]}</Label>
        {index === 1 && showHints && <g opacity={0.2} data-hint="previous-short-end"><Ribbon d="M 235 265 L 190 230 L 145 245" fill={colors.primary} /></g>}
        <LooseKnot threaded={index === 1} colors={colors} moving={showHints && index === 1} />
        {index === 0 ? <>
          <Label x={122} y={291}>短端</Label>
          {showHints && <g data-hint="loop-motion"><Arrow from={[139, 217]} to={[271, 221]} bend={[166, 155]} /><Target at={[337, 260]} /></g>}
          <Label x={281} y={336}>交叉处：短端所在纸带在上</Label>
        </> : <>
          <Label x={449} y={109}>短端</Label>
          <Label x={116} y={166}>从下穿</Label><line x1={148} y1={172} x2={222} y2={189} stroke={INK} />
          <Label x={433} y={181}>从上露出</Label><line x1={391} y1={173} x2={331} y2={147} stroke={INK} />
          {showHints && <g data-hint="thread-motion"><Arrow from={[152, 237]} to={[269, 180]} bend={[149, 151]} /></g>}
          <Label x={285} y={336}>穿完先保持松松的，不要再打一个结</Label>
        </>}
        <Label x={489} y={321}>长端（略）</Label>
      </>}

      {index === 2 && <>
        <Panels left="松结：慢慢收拢" right="收平后：五边形纸结" />
        <g transform="translate(-22 114) scale(0.53)"><LooseKnot threaded colors={colors} /></g>
        {showHints && <g data-hint="tighten-motion"><Arrow from={[188, 163]} to={[210, 145]} /><Arrow from={[236, 266]} to={[267, 266]} /></g>}
        <g transform="translate(450 190)"><PentagonLayers colors={colors} shortEdge={4} longEdge={2} /></g>
        <Label x={362} y={123}>短端</Label><Label x={508} y={340}>长端（略）</Label>
        <Label x={145} y={315}>边拉边整理，别压死纸结</Label>
        {showHints && STAR_VERTICES.map(([x, y], i) => <Label key={i} x={450 + x * 1.26} y={190 + y * 1.26 + 6}>{i + 1}</Label>)}
      </>}

      {index === 3 && <>
        <Panels left="短端向内，找交叉带" right="短端藏好，长端保留" />
        <g transform="translate(150 198)">
          <g opacity={showHints ? 0.38 : 1}><PentagonLayers colors={colors} shortEdge={4} longEdge={2} /></g>
          {showHints && <g data-hint="short-tuck">
            <Paper vertices={edgeTail(4, 28)} fill={colors.primary} moving />
            <EdgeFold edge={4} /><Arrow from={[-54, -70]} to={[-15, -21]} bend={[-75, -10]} /><Target at={[-15, -21]} />
          </g>}
        </g>
        <g transform="translate(450 198)"><PentagonLayers colors={colors} longEdge={2} /><path data-pocket="short" d="M -39 -30 L -5 -6" fill="none" stroke={INK} strokeWidth={3} /></g>
        <Label x={300} y={347}>掀起交叉纸带边缘，让短端插在下面</Label>
      </>}

      {index === 4 && <>
        <Panels left="示例 A · 顺下边绕" right="示例 B · 翻面换斜边" />
        <g transform="translate(150 193)">
          <PentagonLayers colors={colors} longEdge={2} longLength={83} />
          {showHints && <g data-hint="wrap-lower-edge">
            <g opacity={0.2}><Paper vertices={wrappedBand(2)} fill={colors.secondary} /></g>
            <Paper vertices={edgeTail(2, 83)} fill={colors.primary} moving />
            <EdgeFold edge={2} /><Arrow from={[0, 110]} to={[0, -22]} bend={[97, 48]} />
          </g>}
        </g>
        <g transform="translate(450 227)">
          <PentagonLayers colors={colors} flipped longEdge={0} longLength={74} />
          {showHints && <g data-hint="wrap-sloping-edge">
            <g opacity={0.2}><Paper vertices={wrappedBand(0)} fill={colors.primary} /></g>
            <Paper vertices={edgeTail(0, 74)} fill={colors.secondary} moving />
            <EdgeFold edge={0} /><Arrow from={[66, -90]} to={[-22, 20]} bend={[103, 10]} />
          </g>}
        </g>
        <Label x={300} y={348}>长端贴着轮廓走，翻面后仍保持五条边</Label>
      </>}

      {index === 5 && <>
        <Panels left="最后短尾 → 外层纸带下" right="尾端藏住，轮廓仍是五边形" />
        <g transform="translate(150 227)">
          <g opacity={showHints ? 0.38 : 1}><PentagonLayers colors={colors} shortEdge={0} shortLength={30} /></g>
          {showHints && <g data-hint="final-tuck"><Paper vertices={edgeTail(0, 30)} fill={colors.primary} moving /><EdgeFold edge={0} /><Arrow from={[44, -69]} to={[8, -12]} bend={[74, -8]} /><Target at={[8, -12]} /></g>}
        </g>
        <g transform="translate(450 227)"><PentagonLayers colors={colors} /><path data-pocket="final" d="M -6 -33 L 30 -7" fill="none" stroke={INK} strokeWidth={3} /></g>
        <Label x={300} y={338}>轻抬纸带，不拉开整个纸结；不要把尾端粘在外面</Label>
      </>}

      {index === 6 && <>
        <Panels left="压每条边的中点" right="五个顶点留作星尖" />
        <g transform="translate(150 215) scale(1.25)">
          <PentagonLayers colors={colors} />
          {STAR_PINCHES.map(({ edge, midpoint, from, to }) => <g key={edge} data-pinch-edge={edge}>
            <circle cx={midpoint[0]} cy={midpoint[1]} r={3.2} fill={colors.secondary} stroke={ACCENT} strokeWidth={1.5} />
            <Arrow from={from} to={to} />
          </g>)}
        </g>
        <g transform="translate(450 215) scale(1.35)">
          {showHints && <polygon data-hint="former-pentagon" points={points(STAR_VERTICES)} fill="none" stroke={INK} strokeDasharray="4 4" opacity={0.25} />}
          <Paper vertices={STAR_PUFFED} fill={colors.primary} />
          {STAR_PINCHES.map(({ edge, midpoint }) => <path key={edge} d={`M ${midpoint[0] * 0.64} ${midpoint[1] * 0.64} Q 0 0 ${STAR_VERTICES[(edge + 1) % 5].join(' ')}`} fill="none" stroke={INK} strokeWidth={1} opacity={0.2} />)}
          <ellipse cx={-5} cy={-8} rx={21} ry={25} fill={colors.secondary} opacity={0.25} />
        </g>
        <Label x={150} y={326}>向内轻压，不捏顶点</Label><Label x={450} y={326}>两大片纸面微微鼓起</Label>
        <Label x={300} y={351}>先用备用纸条试折；不鼓起时换纸或调整松紧</Label>
      </>}
    </g>
  </Diagram>
}
