import type { CraftProject, CraftStep, GuideColorOption } from '../../lib/craftGuide'
import { renderKnotDiagram } from './diagrams'
import type { KnotScene } from './geometry'

export interface KnotStep extends CraftStep { scene: KnotScene }

export const KNOT_COLORS: readonly GuideColorOption[] = [
  { name: '朱砂与松青', primary: '#b75a43', secondary: '#397a73' },
  { name: '莓果与靛蓝', primary: '#a44868', secondary: '#526a9b' },
  { name: '陶土与橄榄', primary: '#a66933', secondary: '#667645' },
]

export const BASIC_STEPS: readonly KnotStep[] = [
  {
    title: '固定方向，认清四根绳',
    instruction: '用夹子固定上端，下端朝自己，全程不翻面。按 A、C1、C2、B 排好；前面指靠眼睛，后面指靠桌面。A、B 是工作绳，两根灰色芯线始终不换位。',
    checkpoint: '从左到右是 A、C1、C2、B；A、B 的名字跟随绳子，不跟随左右。',
    scene: { kind: 'setup', completedHalves: 0 },
  },
  {
    title: 'A 横过前面，左侧留圈',
    instruction: '把左侧 A 横放到两根芯线前面，绳头朝右，压在 B 下方。左侧留一个宽松的圈，先别拉紧；两根芯线仍垂直。',
    checkpoint: 'A 在 C1、C2 前面，在右侧 B 下面；左圈敞开。',
    scene: { kind: 'bight', completedHalves: 0 },
  },
  {
    title: 'B 压过 A，绕后穿左圈',
    instruction: '让右侧 B 压过 A 的右侧横段，再绕到两根芯线后面去往左侧；从后向前穿出 A 留的左圈。沿着 B 从固定端走到绳头，逐处核对穿压。',
    checkpoint: 'B 在右侧压 A、在中间藏到两芯后、在左圈从后向前出来。',
    scene: { kind: 'weave', completedHalves: 0 },
  },
  {
    title: '均匀收紧：只是一个半结',
    instruction: '保持芯线顺直，两手均匀拉 A、B，让绳圈靠拢，不要猛拽或翻面。这只完成一个半结；现在 A 在右，B 在左。',
    checkpoint: '已收紧 1 个半结，尚不是完整平结；A 仍是原来那根绳。',
    scene: { kind: 'tight', completedHalves: 1 },
  },
  {
    title: 'A 从右向左，右侧留圈',
    instruction: '仍用 A 起手：它现在在右侧。从右向左横过两根芯线前面，绳头放在左侧 B 下方，右侧留圈。只把工作绳走向做左右镜像，不移动 C1、C2。',
    checkpoint: '右圈敞开；A 仍过芯线前面，C1 仍在 C2 左边。',
    scene: { kind: 'bight', completedHalves: 1, mirrored: true },
  },
  {
    title: 'B 绕后，从右圈穿出',
    instruction: '左侧 B 压过 A 的左侧横段，绕到两根芯线后面去往右侧，再从后向前穿出右圈。保持上端朝上，不把作品翻过来找方向。',
    checkpoint: 'B 左侧压 A、中间绕后、右圈穿出；与上一个半结方向相反。',
    scene: { kind: 'weave', completedHalves: 1, mirrored: true },
  },
  {
    title: '收紧两半，得到一个平结',
    instruction: '均匀拉紧 A、B，把第二个半结靠向第一个。两个方向相反的半结合为 1 个完整平结；A 回到左侧，B 回到右侧。',
    checkpoint: '总计 2 个半结＝1 个平结；结带平整，芯线没有互换。',
    scene: { kind: 'tight', completedHalves: 2 },
  },
  {
    title: '交替重复，练成一小段',
    instruction: '再按第2—7步做两轮，共3个平结（6个半结）。A每次从所在侧横过芯线前面；总从当前左侧起手会变成螺旋。先练样，再考虑搭配串饰。',
    checkpoint: '示例是 3 个完整平结；若扭成螺旋，退回检查是否漏了反向半结。',
    scene: { kind: 'repeat', completedHalves: 6 },
  },
]

export const SLIDING_STEPS: readonly KnotStep[] = [
  {
    title: '两尾反向重叠，不绑在一起',
    instruction: '把手链两条尾绳平行、反向重叠，留足调节余量。C1 自由端向下，C2 自由端向上；另一端绕回手链。用夹子临时固定上方，底部朝自己，不翻面。',
    checkpoint: '两自由端方向相反；C1、C2 没有打结相连，调节区没有串饰。',
    scene: { kind: 'overlap', completedHalves: 0 },
  },
  {
    title: '另取工作绳，中点垫在后面',
    instruction: '另取一根工作绳，把中点放在两根尾绳后面，两端分到左右，左端叫 A、右端叫 B。图中两色只是同一根绳的两端标记；灰色尾绳就是芯线。',
    checkpoint: '工作绳中点在两芯后；A、B 是自由端，不是手链尾端。',
    scene: { kind: 'midpoint', completedHalves: 0 },
  },
  {
    title: 'A 从左侧留圈',
    instruction: '让 A 从左向右横过两根芯线前面，在左侧留圈，右侧绳头放在 B 下面。只用工作绳打结，不把任一芯线拿来穿圈。',
    checkpoint: 'A 过前、B 压 A；C1 在左，C2 在右，仍是平行两芯。',
    scene: { kind: 'bight', completedHalves: 0 },
  },
  {
    title: 'B 绕后，穿出左圈',
    instruction: 'B 压过 A 的右侧横段，绕过两根芯线后面，再从后向前穿出左圈。留一点活动空间，不要把两芯勒成一束。',
    checkpoint: 'B 的中段在两芯后方；左圈出来的仍是 B。',
    scene: { kind: 'weave', completedHalves: 0 },
  },
  {
    title: '收拢第一个半结',
    instruction: '均匀收拢两端，仅把圈整理成形，不猛拉。现在只完成 1 个半结；A 已在右，B 已在左，芯线仍各走各的方向。',
    checkpoint: '不是一个完整平结；记住 A 的颜色，下一半仍由 A 起手。',
    scene: { kind: 'tight', completedHalves: 1 },
  },
  {
    title: '反向起手，A 留右圈',
    instruction: '把右侧 A 从右向左横过两根芯线前面，右侧留圈，绳头置于左侧 B 下。不要换掉 A、B 的名字，也不要交换 C1、C2。',
    checkpoint: '这次圈在右；工作绳走向反了，作品没有翻面。',
    scene: { kind: 'bight', completedHalves: 1, mirrored: true },
  },
  {
    title: 'B 绕后，穿出右圈',
    instruction: '左侧 B 压过 A 的左侧横段，绕到两芯后面去往右侧，再从后向前穿出右圈。两根灰芯不参与互相打结。',
    checkpoint: 'B 压 A、绕后、穿右圈；这是与前一半相反的路径。',
    scene: { kind: 'weave', completedHalves: 1, mirrored: true },
  },
  {
    title: '一个平结，马上试滑',
    instruction: '轻轻收拢第二半，得到1个完整平结。暂松夹子，捏住结套，分别拉两条灰尾，再拉手链本体放大环；应能调节，停手后不自行松散。随即重新固定。',
    checkpoint: '每完成一个整结都试滑与保持；卡住就退松重做，过松就重新整理。',
    scene: { kind: 'tight', completedHalves: 2 },
  },
  {
    title: '逐结重复，检查松紧',
    instruction: '继续交替两半，示例做到3个平结。每完成一个整结，都松夹子试滑并检查保持，再固定继续；结数和摩擦随绳材变化，示例不保证实物牢固，先做样段验证。',
    checkpoint: '两尾能分别移动，结套不自行散开；硬拉才动或轻碰就松，都需重做。',
    scene: { kind: 'test', completedHalves: 6 },
  },
  {
    title: '只收工作绳，不锁芯线',
    instruction: '保留足够工作绳尾，用钝头穿绳针把 A、B 分别回穿数个已有结背，图中虚线仅示意。工作绳收尾，不穿入芯线；不缝、不粘芯线，不用火封。再试滑并拉检，不牢就重打。',
    checkpoint: '收尾方法须用实际绳材验证；工作绳不滑脱，芯线仍可滑动，未验证前别剪短。',
    scene: { kind: 'tuck', completedHalves: 6 },
  },
  {
    title: '两个尾端，各打自己的止结',
    instruction: '在每条灰尾的自由端各绕一个小圈，将自己的绳头穿过自己的圈，收紧成独立单结。止结须大到不能穿过结套；若太小，换做法后再验证，绝不把两尾系在一起。',
    checkpoint: '一上一下两个独立止结，分别拉检都不能穿过结套；保留尾长。',
    scene: { kind: 'stoppers', completedHalves: 6 },
  },
  {
    title: '试拉后佩戴，留舒适余量',
    instruction: '移开夹子，分别拉两自由尾缩小手链，拉两侧手链本体放大；先离腕反复试滑、拉检收尾和止结，再留舒适余量佩戴。不稳就重打，不用于承重，不勒紧肢体。',
    checkpoint: '图为静态调节示意，不代表材料测试；确认不勒腕、不滑脱后才使用。',
    scene: { kind: 'finished', completedHalves: 6 },
  },
]

function diagramFor(steps: readonly KnotStep[], sliding: boolean): CraftProject['renderDiagram'] {
  return (step, colors, showHints) => {
    const index = Number.isFinite(step) ? Math.max(0, Math.min(steps.length - 1, Math.trunc(step))) : 0
    return renderKnotDiagram(steps[index].scene, colors, showHints, sliding)
  }
}

const safety = '先用实际绳材练样并试拉，图解不保证强度。仅作装饰，不承重、不勒紧肢体；不使用火焰或胶水收尾。剪刀仅在成人监督下使用，小绳件远离幼儿。'

export const CHINESE_KNOT_PROJECTS: readonly CraftProject[] = [
  {
    id: 'square-knot-basics', title: '平结基础', subtitle: '编绳入门·可搭配串饰',
    description: '先看懂一前一后，再把两个反向半结编成平整的结带。这里只教基础平结，不涉及盘长等复杂传统装饰结。',
    meaning: '一左一右，慢慢练习；把耐心编进一份小小的心意。',
    duration: '约 15–25 分钟', level: '零基础练习',
    materials: ['两根易辨色的练习工作绳 A、B（适当留长）', '两根灰色或中性色芯线 C1、C2', '夹子、平整桌面或编绳板', '可选剪刀（成人监督，验证前不剪短）'],
    safety, steps: BASIC_STEPS,
    sources: [
      { title: 'Animated Knots · Cobra / Square Knot', url: 'https://www.animatedknots.com/cobra-lanyard-knot' },
      { title: 'DMC · Macramé stitch diagrams', url: 'https://www.dmc.com/BE/en-GB/sbs-macrame-stitch-diagrams' },
      { title: 'Bochiknot · Square knot tutorial', url: 'https://bochiknot.com/blogs/macrame-basic-knots/how-to-macrame-square-knot-tutorial' },
    ],
    renderDiagram: diagramFor(BASIC_STEPS, false),
  },
  {
    id: 'square-knot-slider', title: '平结滑扣', subtitle: '编绳入门·可搭配串饰',
    description: '让平结围住反向重叠的两条尾绳，做一个可调结套。先练平结基础；实际滑动、收尾与保持效果必须用所选绳材试验。',
    meaning: '给心意留一点可调的空间，也给佩戴的人留一份舒适。',
    duration: '约 25–40 分钟', level: '平结进阶练习',
    materials: ['已留两条长尾的练习手链（先不戴在手上）', '另取一根柔软工作绳，中点两侧留足余量', '夹子、平整桌面、钝头穿绳针', '可选剪刀（成人监督，试拉合格前保留尾长）'],
    safety, steps: SLIDING_STEPS,
    sources: [
      { title: 'Lima Beads · Tying the Sliding Square Knot', url: 'https://www.limabeads.com/Tying-the-Sliding-Square-Knot-T31' },
      { title: 'Animated Knots · Cobra / Square Knot', url: 'https://www.animatedknots.com/cobra-lanyard-knot' },
      { title: 'Bochiknot · Square knot tutorial', url: 'https://bochiknot.com/blogs/macrame-basic-knots/how-to-macrame-square-knot-tutorial' },
    ],
    renderDiagram: diagramFor(SLIDING_STEPS, true),
  },
]
