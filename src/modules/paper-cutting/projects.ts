import type { CraftProject, GuideColorOption } from '../../lib/craftGuide'
import { renderFlowerDiagram, renderHeartDiagram } from './diagrams'

export const PAPER_COLORS: readonly GuideColorOption[] = [
  { name: '青芽 · 米绿背面', primary: '#b8cfab', secondary: '#e0e9d6' },
  { name: '麦芽 · 浅杏背面', primary: '#e5bc7d', secondary: '#f2dfbc' },
  { name: '香芋 · 淡紫背面', primary: '#c5b8d9', secondary: '#e9e1f1' },
]

const materials = ['15 cm × 15 cm 薄彩纸 1 张（不选厚卡纸）', '铅笔', '圆头剪刀', '废纸 1 张（先试折、试剪）'] as const
const safety = '儿童须由成人陪同使用圆头剪刀，手指远离剪口；不用刻刀或火。纸叠太厚、剪不动就停下换薄纸，别硬剪。图解不是等比例剪裁模板，请先用废纸试剪；蓝色折边与中心连接处不可剪断。'

export const PAPER_CUTTING_PROJECTS: readonly CraftProject[] = [
  {
    id: 'folded-heart',
    title: '对折爱心',
    subtitle: '一次对折 · 留住中间的连接',
    description: '从半条曲线到一整颗心，练习最基础的对称折剪。原创示意图不是等比例剪裁模板，请先用废纸试剪。',
    meaning: '剪纸常用于装点生活、表达心意。本课用原创心形寄托感谢与牵挂，不将它称为某地的传统纹样。',
    duration: '约 10–15 分钟',
    level: '初学入门',
    materials,
    safety,
    steps: [
      {
        title: '准备薄纸',
        instruction: '将一张 15 cm 正方形薄彩纸正面朝上平放，四边不卷曲。先用废纸走一遍做法；屏幕上的图只说明方向，不是可直接照尺寸裁剪的模板。',
        checkpoint: '纸张未折，是一层正方形；剪刀能轻松剪动试用废纸。',
      },
      {
        title: '左半向右对折',
        instruction: '把左边叠向右边，上下角对齐后压平。现在是两层长方形：左边是折边，上、右、下三边是开口。后续保持这个方向。',
        checkpoint: '左边连着、右边可分开；不要把开口边当成折边。',
      },
      {
        title: '画半颗爱心',
        instruction: '在左折边靠上处定凹口 A，靠下处定尖端 B。用铅笔从 A 向右上画圆弧，鼓向右侧，再收回 B；弧线别碰右开口。只画这条曲线，不沿折边封口。',
        checkpoint: 'A、B 都在左折边上；曲线与折边围住彩色保留区，右侧仍有废料。',
      },
      {
        title: '只剪外侧曲线',
        instruction: '从折边上的 A 起剪，两层一起沿曲线绕过右侧，剪到 B 停下。只剪红线所示的弧线，绝不沿 A、B 之间的蓝色折边剪；剪完移走浅色废料。',
        checkpoint: '留下两层半心形，A 到 B 的直折边完整，未被剪成两个半片。',
      },
      {
        title: '轻轻打开一半',
        instruction: '放下剪刀，托住保留纸片，把上层向左慢慢打开。遇到粘连先停下检查，不拉扯心尖，也不再剪中间折痕。图中左半还没完全放平。',
        checkpoint: '两侧仍通过中间折痕连着，心尖没有撕裂。',
      },
      {
        title: '摊平成一颗心',
        instruction: '继续向左展开，轻压中间折痕。左右两半由同一条曲线对称形成；检查没有残留废料，就可以把这颗心夹进祝福卡片。',
        checkpoint: '得到一整片爱心：上方有凹口，下方有尖端，中间未剪开。',
      },
    ],
    sources: [
      { title: '桐庐博物馆·青蛙课（对折、画半形与展开原理）', url: 'https://z.hangzhou.com.cn/2020/rwwhql/content/content_7748814.htm' },
      { title: '中国非物质文化遗产网·中国剪纸（文化背景）', url: 'https://www.ihchina.cn/jianzhi.html' },
    ],
    renderDiagram: renderHeartDiagram,
  },
  {
    id: 'connected-four-petal-flower',
    title: '连体四瓣花',
    subtitle: '两次对折 · 中心留宽桥',
    description: '练习重复折剪与留连接：四片斜向花瓣，共用一个实心中心。不加对角折，不挖中心孔；原创示意图非等比例模板，先用废纸试剪。',
    meaning: '把四瓣相连的小花送给想念的人，寄托相聚的愿望。这是本课的创作寄意，不是对传统花纹寓意的固定解释。',
    duration: '约 15–20 分钟',
    level: '初学入门',
    materials,
    safety,
    steps: [
      {
        title: '认清原纸中心',
        instruction: '把 15 cm 正方形薄彩纸正面朝上平放，先认清纸张中心 O。接下来只做左右、上下两次对折，不加对角折。建议先换废纸练习。',
        checkpoint: '纸张还是一层正方形；O 在纸心，不在任一角点。',
      },
      {
        title: '第一折：左向右',
        instruction: '将左半张向右合拢，压平折痕。保持左折边、右开口的竖长方形方向；此时 O 位于左折边的中点。',
        checkpoint: '纸叠为两层，上下角对齐，O 在左折边中间。',
      },
      {
        title: '第二折：上向下',
        instruction: '把长方形的上半向下合拢，压成四层小正方形。两条折边在左上角 O 相遇，右、下两边是开口；不要转到其他角画花瓣。',
        checkpoint: '左上角 O 是原纸中心；上边和左边是折边，右边和下边是开口。',
      },
      {
        title: '留宽桥，画一瓣',
        instruction: '从 O 沿上、左折边各留约一指宽，标 A、B。由 A 向右鼓出，再向右下画一瓣，最后回到 B；曲线不碰右、下开口。保留 O 周围纸面，不画封口线或中心孔。',
        checkpoint: 'A、B 离 O 都有一段宽度；彩色区含 O，OA、OB 两段都未画剪线。',
      },
      {
        title: '只沿花瓣弧线剪',
        instruction: '从上折边 A 起剪，四层一起沿外侧弧线走到左折边 B，停下并移走废料。只剪红线，不剪 OA、OB，也不挖 O；剪不动就换薄纸，不能硬推剪刀。',
        checkpoint: '保留的一瓣仍有完整左上角 O；上、左两段宽连接都在。',
      },
      {
        title: '先向上展开',
        instruction: '放下剪刀，先把上层向上翻开，撤销第二次折叠；仍保留第一次左右对折。右侧出现上下两瓣，左折边继续相连，别把它们撕开。',
        checkpoint: '当前还是两层；右边可见两瓣，左侧中心连接完整。',
      },
      {
        title: '再向左展开四瓣',
        instruction: '再把上层向左打开，撤销第一次折叠，轻压折痕。四瓣分别朝四个斜向展开；只整理废料，不把中心连接剪细或剪空。',
        checkpoint: '四瓣连成同一片纸，中心实心；不是四片散开的花瓣。',
      },
    ],
    sources: [
      { title: '桐庐博物馆·团花课（折叠重复纹样原理）', url: 'https://z.hangzhou.com.cn/2020/rwwhql/content/content_7748776.htm' },
      { title: '桐庐博物馆·囍课（仅参考保留连接的说明）', url: 'https://z.hangzhou.com.cn/2020/rwwhql/content/content_7748797.htm' },
    ],
    renderDiagram: renderFlowerDiagram,
  },
]
