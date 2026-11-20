import CraftGuide from '../../components/CraftGuide'
import { CHINESE_KNOT_PROJECTS, KNOT_COLORS } from './lessons'

export default function ChineseKnotsStudio() {
  return <CraftGuide
    title="中国结工坊"
    kicker="CHINESE KNOTS · 一线一心意"
    description="从平结开始，认清前后穿压，把心意慢慢编好。编绳入门·可搭配串饰。"
    projects={CHINESE_KNOT_PROJECTS}
    colorLabel="工作绳 A / B 配色（灰色始终是芯线）"
    colorOptions={KNOT_COLORS}
  />
}
