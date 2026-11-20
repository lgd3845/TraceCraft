import type { KeyboardEvent, PointerEvent } from 'react'
import type { Artwork, GiftBoxData, GiftBoxItem } from '../../lib/types'
import { canPack, createRaffia, getBoxGeometry, ITEM_SIZE, wrapNote } from './logic'

const raffia = createRaffia()

interface GiftBoxSceneProps {
  data: GiftBoxData
  artworks: Artwork[]
  name: string
  images?: Map<string, string>
  selectedId?: string | null
  onItemPointerDown?: (event: PointerEvent<SVGGElement>, item: GiftBoxItem) => void
  onItemKeyDown?: (event: KeyboardEvent<SVGGElement>, item: GiftBoxItem) => void
  onSelect?: (id: string | null) => void
  onBackgroundPointerDown?: () => void
  disabled?: boolean
}

export default function GiftBoxScene({ data, artworks, name, images, selectedId, onItemPointerDown, onItemKeyDown, onSelect, onBackgroundPointerDown, disabled }: GiftBoxSceneProps) {
  const geometry = getBoxGeometry(data.shape)
  const { x, y, width, height } = geometry
  const outer = { x: x - 19, y: y - 19, width: width + 38, height: height + 38 }
  const byId = new Map(artworks.filter(canPack).map(artwork => [artwork.id, artwork]))
  const noteLines = wrapNote(data.note)
  const card = { x: x + width - 184, y: y + height - 116 }
  const interactive = Boolean(onSelect)

  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 580" width="680" height="580"
    className={`giftbox-scene${interactive && data.items.length ? ' giftbox-scene-editable' : ''}`} role={interactive ? 'group' : 'img'} aria-label={`${name || '我的心意礼盒'}，俯视搭配预览`}
    onPointerDown={event => { if (event.target === event.currentTarget && !disabled) onBackgroundPointerDown?.() }}>
    <title>{name || '我的心意礼盒'}</title>
    <desc>开放式礼盒，拉菲草填充、缎带蝴蝶结与祝福卡片。仅为配色和摆放参考，不保证实际尺寸。</desc>
    <defs>
      <linearGradient id="giftbox-backdrop" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6f2ee" /><stop offset="1" stopColor="#eae7ee" /></linearGradient>
      <linearGradient id="giftbox-wall" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#fff" stopOpacity=".48" /><stop offset=".44" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#25331e" stopOpacity=".2" /></linearGradient>
      <linearGradient id="giftbox-inset" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#403b2b" stopOpacity=".28" /><stop offset="1" stopColor="#403b2b" stopOpacity="0" /></linearGradient>
      <linearGradient id="giftbox-satin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".35" /><stop offset=".42" stopColor="#fff" stopOpacity="0" /><stop offset=".8" stopColor="#432c21" stopOpacity=".2" /><stop offset="1" stopColor="#fff" stopOpacity=".2" /></linearGradient>
      <pattern id="giftbox-paper" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="3" r=".55" fill="#625144" opacity=".06" /><circle cx="5" cy="6" r=".4" fill="#fff" opacity=".65" /></pattern>
      <filter id="giftbox-shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="7" dy="19" stdDeviation="15" floodColor="#50483e" floodOpacity=".23" /></filter>
      <filter id="giftbox-object-shadow" x="-50%" y="-50%" width="200%" height="210%"><feDropShadow dx="2" dy="5" stdDeviation="3.5" floodColor="#453a2c" floodOpacity=".24" /></filter>
      <clipPath id="giftbox-interior"><rect x={x} y={y} width={width} height={height} rx="3" /></clipPath>
    </defs>
    <g pointerEvents="none">
      <rect width="680" height="580" fill="url(#giftbox-backdrop)" />
      <circle cx="100" cy="110" r="130" fill="#fff" opacity=".21" />
      <path d="M 40 531 Q 98 499 151 529 M 44 538 Q 104 510 148 537" fill="none" stroke="#cbbca3" strokeWidth="1.5" opacity=".5" />
      <path d="M 562 488 Q 638 508 633 433" fill="none" stroke={data.ribbonColor} strokeWidth="16" opacity=".55" />
      <path d={`M ${outer.x + outer.width - 18} ${outer.y - 27} Q 650 210 ${outer.x + outer.width + 8} ${outer.y + outer.height + 27}`} fill="none" stroke={data.ribbonColor} strokeWidth="24" opacity=".9" />
      <rect x={outer.x} y={outer.y + 8} width={outer.width} height={outer.height} rx="8" fill={data.color} filter="url(#giftbox-shadow)" />
      <rect {...outer} rx="7" fill={data.color} />
      <rect {...outer} rx="7" fill="url(#giftbox-wall)" stroke="#fff" strokeOpacity=".5" />
      <path d={`M ${outer.x + 4} ${outer.y + 4} L ${x} ${y} M ${outer.x + outer.width - 4} ${outer.y + 4} L ${x + width} ${y} M ${outer.x + 4} ${outer.y + outer.height - 4} L ${x} ${y + height} M ${outer.x + outer.width - 4} ${outer.y + outer.height - 4} L ${x + width} ${y + height}`} stroke="#4c5940" strokeOpacity=".17" />
      <rect x={x - 2} y={y - 2} width={width + 4} height={height + 4} rx="4" fill="#5a5844" opacity=".4" />
      <g clipPath="url(#giftbox-interior)">
        <rect x={x} y={y} width={width} height={height} fill={data.fillerColor} />
        <rect x={x} y={y} width={width} height={height} fill="#9d8258" opacity=".12" />
        <g transform={`translate(${x} ${y}) scale(${width / 100} ${height / 100})`} fill="none" strokeLinecap="round">
          {raffia.map((strand, index) => <g key={index}>
            <path d={strand.path} stroke="#665130" strokeWidth={strand.width + 0.22} opacity=".15" transform="translate(.2 .3)" />
            <path d={strand.path} stroke={data.fillerColor} strokeWidth={strand.width + 0.1} />
            <path d={strand.path} stroke={strand.light ? '#fffdf2' : '#9b7e4f'} strokeWidth={strand.width * 0.55} opacity={strand.light ? '.6' : '.19'} />
          </g>)}
        </g>
        <rect x={x} y={y} width={width} height="22" fill="url(#giftbox-inset)" />
        <path d={`M ${x + 1} ${y + height} V ${y + 1} H ${x + width}`} fill="none" stroke="#4a4a35" strokeWidth="6" opacity=".11" />
      </g>
      <rect x={x + width + 4} y={outer.y + 2} width="11" height={outer.height - 4} fill={data.ribbonColor} />
      <rect x={x + width + 4} y={outer.y + 2} width="11" height={outer.height - 4} fill="url(#giftbox-satin)" />
      {!data.items.length && <g transform={`translate(${x + width * 0.4} ${y + height * 0.4})`}>
        <rect x="-129" y="-48" width="258" height="106" rx="14" fill="#fffcf4" fillOpacity=".83" stroke="#fff9" />
        <path d="M -8 -23 C -18 -36 -31 -19 -8 -6 C 15 -19 2 -36 -8 -23" transform="translate(8 -2)" fill="none" stroke="#a88c6e" strokeWidth="1.5" />
        <text y="17" textAnchor="middle" fill="#74634f" fontSize="14" fontFamily="sans-serif" letterSpacing="1">让心意，在这里相遇</text>
        <text y="39" textAnchor="middle" fill="#998b77" fontSize="9" fontFamily="sans-serif">从作品库挑选一份手作，放进礼盒</text>
      </g>}
    </g>
    {data.items.map((item, index) => {
      const artwork = byId.get(item.artworkId)
      const image = images?.get(item.artworkId) ?? artwork?.thumbnail
      const selected = selectedId === item.id
      const itemName = artwork?.name ?? '来源不可用的作品'
      return <g key={item.id} transform={`translate(${x + item.x / 100 * width} ${y + item.y / 100 * height}) rotate(${item.rotation}) scale(${item.scale})`}
        className={interactive ? `giftbox-placed-item${selected ? ' giftbox-placed-item-selected' : ''}` : undefined}
        role={interactive ? 'button' : undefined} tabIndex={interactive && !disabled ? 0 : undefined}
        aria-label={interactive ? `第 ${index + 1} 件：${itemName}。方向键移动，Shift 加速，Delete 删除。` : undefined}
        aria-pressed={interactive ? selected : undefined} aria-disabled={interactive ? disabled : undefined}
        onFocus={() => { if (!disabled) onSelect?.(item.id) }}
        onPointerDown={event => { if (!disabled) onItemPointerDown?.(event, item) }}
        onKeyDown={event => { if (!disabled) onItemKeyDown?.(event, item) }}>
        <rect x={-ITEM_SIZE / 2} y={-ITEM_SIZE / 2} width={ITEM_SIZE} height={ITEM_SIZE} rx="8" fill="transparent" />
        {image ? <image href={image} x={-ITEM_SIZE / 2} y={-ITEM_SIZE / 2} width={ITEM_SIZE} height={ITEM_SIZE} preserveAspectRatio="xMidYMid meet" filter="url(#giftbox-object-shadow)" pointerEvents="none" />
          : <g pointerEvents="none"><rect x="-66" y="-57" width="132" height="114" rx="9" fill="#fff8ed" stroke="#bb8168" strokeDasharray="4 4" /><text textAnchor="middle" y="-3" fontSize="12" fill="#9e654c">原作品不可用</text><text textAnchor="middle" y="19" fontSize="9" fill="#9e654c">请移除后重新加入</text></g>}
        {interactive && <rect className="giftbox-selection-ring" x={-ITEM_SIZE / 2 - 4} y={-ITEM_SIZE / 2 - 4} width={ITEM_SIZE + 8} height={ITEM_SIZE + 8} rx="10" fill="none" stroke="#8b5740" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" pointerEvents="none" opacity={selected ? 1 : 0} />}
        {selected && <circle cx={ITEM_SIZE / 2 + 4} cy={-ITEM_SIZE / 2 - 4} r="4" fill="#b97559" stroke="#fff" strokeWidth="2" pointerEvents="none" />}
      </g>
    })}
    <g pointerEvents="none">
      <g transform={`translate(${card.x} ${card.y}) rotate(-7 83 51)`} filter="url(#giftbox-object-shadow)">
        <rect width="174" height="107" rx="2" fill="#fffcf3" />
        <rect width="174" height="107" rx="2" fill="url(#giftbox-paper)" />
        <rect x="6" y="6" width="162" height="95" rx="1" fill="none" stroke="#d5c8ac" strokeWidth=".55" />
        <text x="87" y="20" textAnchor="middle" fontSize="6" fill="#ab9274" letterSpacing="2" fontFamily="sans-serif">A LITTLE GIFT FOR YOU</text>
        {noteLines.length ? <text x="87" textAnchor="middle" fill="#776951" fontSize={Math.min(10, 60 / noteLines.length)} fontFamily="sans-serif">
          {noteLines.map((line, index) => <tspan key={index} x="87" y={33 + index * Math.min(13, 60 / noteLines.length)}>{line}</tspan>)}
        </text> : <path d="M 81 54 C 74 45 64 58 81 68 C 98 58 88 45 81 54" transform="translate(6 0)" fill="none" stroke="#b7957b" strokeWidth="1" />}
      </g>
      <g transform={`translate(${x + width - 5} ${y - 10}) rotate(14)`} filter="url(#giftbox-object-shadow)">
        <g fill={data.ribbonColor}>
          <path d="M -7 7 C -19 30 -21 47 -37 68 L -17 62 L -8 76 Q 2 40 10 13 Z" />
          <path d="M 4 8 Q 28 29 52 43 L 45 26 L 62 22 Q 36 8 11 -5 Z" />
          <path d="M 1 -3 C -22 -44 -69 -49 -58 -18 C -54 7 -20 17 1 -3 Z" />
          <path d="M 3 -3 C 21 -41 57 -49 58 -21 C 60 5 30 14 3 -3 Z" />
        </g>
        <g fill="url(#giftbox-satin)">
          <path d="M -7 7 C -19 30 -21 47 -37 68 L -17 62 L -8 76 Q 2 40 10 13 Z" />
          <path d="M 4 8 Q 28 29 52 43 L 45 26 L 62 22 Q 36 8 11 -5 Z" />
          <path d="M 1 -3 C -22 -44 -69 -49 -58 -18 C -54 7 -20 17 1 -3 Z" />
          <path d="M 3 -3 C 21 -41 57 -49 58 -21 C 60 5 30 14 3 -3 Z" />
        </g>
        <path d="M -4 -4 Q -49 -33 -50 -20 M 10 -5 Q 46 -32 50 -23" fill="none" stroke="#fff" strokeWidth="2.3" opacity=".24" />
        <path d="M -3 2 Q -40 3 -48 -14 M 10 2 Q 42 6 51 -13" fill="none" stroke="#492f24" strokeWidth="1.5" opacity=".2" />
        <rect x="-9" y="-12" width="23" height="26" rx="7" fill={data.ribbonColor} transform="rotate(-12)" />
        <rect x="-9" y="-12" width="23" height="26" rx="7" fill="url(#giftbox-satin)" transform="rotate(-12)" />
        <path d="M -3 -10 Q -7 0 -3 10" fill="none" stroke="#fff" strokeWidth="2" opacity=".2" />
      </g>
      <text x="340" y="563" textAnchor="middle" fontSize="7" letterSpacing="3.5" fill="#aaa097" fontFamily="sans-serif">THOUGHTFULLY MADE · BEAUTIFULLY GIVEN</text>
    </g>
  </svg>
}
