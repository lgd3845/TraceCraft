import type { CraftProject, GuideColorOption } from '../../lib/craftGuide'
import { HeartDiagram } from './HeartDiagram'
import { StarDiagram } from './StarDiagram'

export const ORIGAMI_COLORS = [
  { name: '莓果与奶油', primary: '#be5861', secondary: '#fff0d5' },
  { name: '陶橙与杏仁', primary: '#bc6b38', secondary: '#fce8c8' },
  { name: '松绿与米白', primary: '#537c65', secondary: '#f4edcf' },
  { name: '暮紫与桃粉', primary: '#8b6384', secondary: '#ffe1da' },
] as const satisfies readonly GuideColorOption[]

export const ORIGAMI_PROJECTS: readonly CraftProject[] = [
  {
    id: 'origami-heart',
    title: '平面爱心',
    subtitle: '一张方纸，折一份温柔',
    description: '从菱形方纸开始，练习对齐与翻面。图中两色始终代表同一张纸的正反面；结构示意不模拟纸张厚度。',
    meaning: '夹在一张手写卡片里，用亲手折出的爱心表达感谢与牵挂。',
    duration: '约 8–12 分钟',
    level: '入门 · 对齐练习',
    materials: ['15 × 15 cm 正方形折纸 1 张（建议正反异色）', '干净、平整的桌面'],
    safety: '折叠过程不需要剪刀、胶水或火源。沿纸边轻压，注意纸边划手；小朋友请在成人陪同下练习。',
    steps: [
      {
        title: '正面朝下，交叉定位',
        instruction: '想露在爱心外面的纸正面朝下。先上下角对齐折一次并展开，再左右角对齐折一次并展开。摆成菱形，记住两条折痕的交点。',
        checkpoint: '纸已完全展开，背面朝上；两条对角折痕交于原来的中心。',
      },
      {
        title: '上角落在中心',
        instruction: '把上方纸尖向下折到两条折痕的交点，压平这一小片。折好后，上方会出现一条新的水平顶边，下一步要用到它。',
        checkpoint: '上角恰好碰到中心；新顶边水平，小三角露出纸正面。',
      },
      {
        title: '下角对准新顶边',
        instruction: '把最下方纸尖向上折，落在新顶边的中点，再压平。目标不是原来的上角，也不是原中心；要一直碰到刚折出的顶边。',
        checkpoint: '下角碰到新顶边中点；下方形成水平底边，左右端一样高。',
      },
      {
        title: '右半底边向上合',
        instruction: '以底边中点为起点，把右侧整叠纸向上折，让底边的右半段与竖直中线重合。对齐边线后，压出一条向右上方延伸的斜折痕。',
        checkpoint: '右半底边竖起来贴住中线；新折痕从底边中点出发，与底边成 45°。',
      },
      {
        title: '左半也合到中线',
        instruction: '同样把左侧整叠纸向上折，让底边左半段贴住竖直中线。轻轻对齐左右两侧，下方的交点就是爱心的底尖。',
        checkpoint: '两条原底边在中线相接而不重叠；左右顶尖一样高。',
      },
      {
        title: '整张翻到背面',
        instruction: '拿起整个模型，像翻书一样翻到另一面，底尖仍朝下。不要只翻一层，也不要在桌面上旋转模型；接下来在模型背面收角。',
        checkpoint: '两条合拢边已转到背后；眼前上方能看到两片纸背面的浅色区域。',
      },
      {
        title: '两侧尖角向内收',
        instruction: '仍看着模型背面，把最左、最右的小尖角各向内折一点。两条小折痕保持竖直，左右收进的宽度相同；图示大小可微调。',
        checkpoint: '左右外侧不再是尖角；折进的小三角都留在模型背面。',
      },
      {
        title: '两枚顶尖向下折',
        instruction: '把上方两枚顶尖各向下折一小截，折痕保持水平且一样高。只修整两枚尖角，不要把上半部整个折下；轻压四个收角。',
        checkpoint: '两条短顶边等高，中间仍有凹口；底部的心尖没有被折掉。',
      },
      {
        title: '翻回正面，送出心意',
        instruction: '再次把整个模型翻回正面，底尖朝下。检查两侧是否对称，必要时回到背面微调小角，再轻轻压平。可以夹进卡片，不必粘贴。',
        checkpoint: '四个收角都藏在后面；正面是纸正面的颜色，有上方凹口和下方心尖。',
      },
    ],
    sources: [
      { title: 'Origami Instructions · 简单爱心基础折法', url: 'http://www.origami-instructions.com/easy-origami-heart.html?no_redirect=true' },
    ],
    renderDiagram: (step, colors, showHints) => <HeartDiagram step={step} colors={colors} showHints={showHints} />,
  },
  {
    id: 'origami-lucky-star',
    title: '幸运星',
    subtitle: '一根纸条，留一点小祝福',
    description: '用一个松结建立五边形，再绕边、藏尾、压边。纸带层次与鼓起形态为示意；松紧与厚度会影响成形，先用备用纸条练习。',
    meaning: '一颗星装下一句祝福。把它放在礼物旁，让小小心意有一个可爱的形状。',
    duration: '约 10–15 分钟',
    level: '入门 · 需练习松紧',
    materials: ['现成等宽纸条 1 根：约 1 × 25 cm（长 24–30 cm 均可）', '备用纸条 2–3 根，先练习打结和鼓起', '平整桌面；初学避免太厚、太脆或易撕裂的纸'],
    safety: '优先使用现成纸条；若需裁纸，由成人预先裁成等宽条。折叠过程无需剪刀、胶水或火源。小纸星勿入口，远离婴幼儿。',
    steps: [
      {
        title: '等宽纸条围成松环',
        instruction: '取约 1 × 25 cm 的等宽纸条。在靠近一端处围出一个松环，让短端所在纸带从长端上方交叉过去。短端只留够穿环的一小截，长端留着绕星。',
        checkpoint: '只有一个松环，能分清短端与长端；先不压折、不勒紧。',
      },
      {
        title: '短端穿环一次',
        instruction: '把短端从环的背后穿到前面，只穿一次，形成单结。看清交叉处哪段在上、哪段在下；暂时保持松松的，别继续打第二个结。',
        checkpoint: '纸条是一个松的单结，不是蝴蝶结；短端穿出，长端仍完整保留。',
      },
      {
        title: '轻收成五边形',
        instruction: '轻拉两端，一边收小纸环，一边用手指整理交叉的纸带，让纸结平整成五边形。只轻压边线，不猛拉，也别把中心压死。',
        checkpoint: '外轮廓有五条边、五个角，不是六边形；留着一短一长两端。',
      },
      {
        title: '先把短端藏好',
        instruction: '把短端顺着五边形的边折回，轻抬交叉纸带的一点边缘，把短端塞到下面。若短端偏长，先沿边折回多余部分，再藏好；长端不要塞进去。',
        checkpoint: '短端不再翘在外面，五边形没有散开；长端仍然留在外侧。',
      },
      {
        title: '长端顺着五边绕',
        instruction: '用长端贴着五边形轮廓绕。每次顺当前出口处的边折过去，再按需要翻面、换下一条边继续。不是一直水平翻折；绕几次由纸长与松紧决定。',
        checkpoint: '五边形保持整齐；纸带贴合但不勒紧，余下长端逐渐变短。',
      },
      {
        title: '把最后尾端塞入',
        instruction: '只剩能藏进纸带的一小截时，轻抬最外层纸带，将末端塞到下面。若还太长就再顺边绕一次；不必剪掉或粘住，也不要硬拽到纸裂开。',
        checkpoint: '最后尾端已藏住，不会自行弹开；仍是平整五边形，中心没有被压死。',
      },
      {
        title: '压边中点，慢慢鼓起',
        instruction: '轻扶纸边，逐一把五条边的中点向内轻压，不是捏五个顶点，也不要压扁中心。让两大片纸面微鼓；成形受厚度与手法影响，不成功先换备用条试松紧。',
        checkpoint: '五个原顶点留下作星尖，边中点内凹，尾端仍藏好；不鼓起时别硬捏。',
      },
    ],
    sources: [
      { title: 'Origami.me · 纸条幸运星基础步骤', url: 'https://origami.me/star/' },
      { title: 'Red Ted Art · 幸运星绕折与压边说明', url: 'https://www.redtedart.com/origami-lucky-star-how-to-make/' },
    ],
    renderDiagram: (step, colors, showHints) => <StarDiagram step={step} colors={colors} showHints={showHints} />,
  },
]
