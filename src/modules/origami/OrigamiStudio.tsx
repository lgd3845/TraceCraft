import CraftGuide from '../../components/CraftGuide'
import { ORIGAMI_COLORS, ORIGAMI_PROJECTS } from './data'

export default function OrigamiStudio() {
  return <CraftGuide
    title="折纸小心意"
    kicker="ORIGAMI · 一折一份心意"
    description="不急着变成成品，先把眼前这一折看明白。从一颗爱心、一枚纸星开始。"
    projects={ORIGAMI_PROJECTS}
    colorLabel="纸正面 / 纸背面"
    colorOptions={ORIGAMI_COLORS}
  />
}
