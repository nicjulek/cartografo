import { FONT_MAP, FONT_MAP_SC, INK, INK_SOFT, PAPER } from './palette'
import { MAP_H, MAP_W } from './geometry'

export function Compass({ x, y, r = 46 }: { x: number; y: number; r?: number }) {
  const points = Array.from({ length: 8 }, (_, k) => {
    const long = k % 2 === 0
    const len = long ? r : r * 0.6
    const a = (k * Math.PI) / 4 - Math.PI / 2
    const side = long ? r * 0.13 : r * 0.1
    const tip = [Math.cos(a) * len, Math.sin(a) * len]
    const left = [Math.cos(a - Math.PI / 2) * side, Math.sin(a - Math.PI / 2) * side]
    const right = [Math.cos(a + Math.PI / 2) * side, Math.sin(a + Math.PI / 2) * side]
    return { long, tip, left, right, k }
  })
  const order = [...points].sort((a, b) => Number(a.long) - Number(b.long))
  return (
    <g transform={`translate(${x},${y})`} aria-hidden="true">
      <circle r={r * 0.82} fill="none" stroke={INK} strokeWidth="0.6" opacity="0.7" />
      <circle r={r * 0.76} fill="none" stroke={INK} strokeWidth="0.4" opacity="0.5" strokeDasharray="1.5 2.5" />
      {Array.from({ length: 32 }, (_, k) => {
        const a = (k * Math.PI) / 16
        return (
          <line
            key={k}
            x1={Math.cos(a) * r * 0.82}
            y1={Math.sin(a) * r * 0.82}
            x2={Math.cos(a) * r * 0.9}
            y2={Math.sin(a) * r * 0.9}
            stroke={INK}
            strokeWidth="0.5"
            opacity="0.6"
          />
        )
      })}
      {order.map((p) => (
        <g key={p.k}>
          <path d={`M0 0L${p.left[0]} ${p.left[1]}L${p.tip[0]} ${p.tip[1]}Z`} fill={p.long ? INK : INK_SOFT} />
          <path d={`M0 0L${p.right[0]} ${p.right[1]}L${p.tip[0]} ${p.tip[1]}Z`} fill={PAPER} stroke={p.long ? INK : INK_SOFT} strokeWidth="0.6" />
        </g>
      ))}
      <circle r={r * 0.08} fill={PAPER} stroke={INK} strokeWidth="0.7" />
      <text y={-r - 6} textAnchor="middle" fontFamily={FONT_MAP_SC} fontSize="15" fill={INK}>
        N
      </text>
    </g>
  )
}

export function Frame({ title, subtitle }: { title: string; subtitle: string }) {
  const segment = 48
  const bars: JSX.Element[] = []
  const band = (x: number, y: number, w: number, h: number, key: string) => (
    <rect key={key} x={x} y={y} width={w} height={h} fill={INK} />
  )
  for (let x = 0, k = 0; x < MAP_W; x += segment, k++) {
    if (k % 2) continue
    const w = Math.min(segment, MAP_W - x)
    bars.push(band(x, -9, w, 5, `t${k}`), band(x, MAP_H + 4, w, 5, `b${k}`))
  }
  for (let y = 0, k = 0; y < MAP_H; y += segment, k++) {
    if (k % 2) continue
    const h = Math.min(segment, MAP_H - y)
    bars.push(band(-9, y, 5, h, `l${k}`), band(MAP_W + 4, y, 5, h, `r${k}`))
  }
  return (
    <g aria-hidden="true">
      <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="none" stroke={INK} strokeWidth="1" />
      <rect x={-9} y={-9} width={MAP_W + 18} height={MAP_H + 18} fill="none" stroke={INK} strokeWidth="0.8" />
      <rect x={-4} y={-4} width={MAP_W + 8} height={MAP_H + 8} fill="none" stroke={INK} strokeWidth="0.5" />
      {bars}
      <rect x={-16} y={-16} width={MAP_W + 32} height={MAP_H + 32} fill="none" stroke={INK} strokeWidth="1.6" />
      <text x={MAP_W / 2} y={-34} textAnchor="middle" fontFamily={FONT_MAP_SC} fontSize="26" letterSpacing="6" fill={INK}>
        {title}
      </text>
      <text x={MAP_W / 2} y={-21} textAnchor="middle" fontFamily={FONT_MAP} fontStyle="italic" fontSize="11.5" fill={INK_SOFT}>
        {subtitle}
      </text>
    </g>
  )
}

export function ScaleBar() {
  const unit = 36
  return (
    <g transform={`translate(0,${MAP_H + 34})`} aria-hidden="true">
      {Array.from({ length: 4 }, (_, k) => (
        <rect key={k} x={k * unit} y={0} width={unit} height={4} fill={k % 2 ? PAPER : INK} stroke={INK} strokeWidth="0.6" />
      ))}
      {[0, 1, 2, 3, 4].map((k) => (
        <text key={k} x={k * unit} y={-3} textAnchor="middle" fontFamily={FONT_MAP} fontSize="8.5" fill={INK_SOFT}>
          {k * 25}
        </text>
      ))}
      <text x={4 * unit + 10} y={5} fontFamily={FONT_MAP} fontStyle="italic" fontSize="10" fill={INK_SOFT}>
        léguas
      </text>
    </g>
  )
}
