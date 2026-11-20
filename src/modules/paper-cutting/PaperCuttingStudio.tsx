import CraftGuide from '../../components/CraftGuide'
import { PAPER_COLORS, PAPER_CUTTING_PROJECTS } from './projects'

export default function PaperCuttingStudio() {
  return <CraftGuide
    title="剪纸工坊"
    kicker="PAPER CUTTING · 一折一剪，纸上生花"
    description="从一张薄纸开始，学会对称折剪与保留连接，把小小的心意剪成一片。"
    projects={PAPER_CUTTING_PROJECTS}
    colorLabel="纸张正面 / 背面（蓝折边、红剪线不变）"
    colorOptions={PAPER_COLORS}
  />
}
