import { forwardRef, memo, useMemo, type ReactNode, type SVGProps } from 'react'
import { BIOME_INDEX } from '../gen/biomes'
import { HEIGHT, idx, WIDTH } from '../gen/grid'
import type { World } from '../gen/types'
import type { LayerKey, Selection } from '../store/atlas'
import type { Pin } from '../share/codec'
import { buildGeometry, CELL, MAP_H, MAP_W, VIEW, type MapGeometry } from './geometry'
import { Compass, Frame, ScaleBar } from './Ornaments'
import { Symbols } from './Symbols'
import {
  BIOME_COLOR, FONT_MAP, FONT_MAP_SC, INK, INK_SOFT, kingdomFill, kingdomStroke, LAKE, MARK, PAPER,
  PAPER_EDGE, RIVER, ROAD, SEA, SEA_DEEP, SEA_INK
} from './palette'

interface Props extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'title'> {
  world: World
  layers: Record<LayerKey, boolean>
  names: Record<string, string>
  pins: Pin[]
  title: string | null
  selection: Selection | null
  children?: ReactNode
  className?: string
}

function compassSpot(world: World): { x: number; y: number } {
  const sea = world.labels.find((l) => l.kind === 'sea')
  let best = { x: WIDTH - 22, y: HEIGHT - 20 }
  let bestScore = -Infinity
  for (let y = 14; y <= HEIGHT - 14; y += 2) {
    for (let x = 16; x <= WIDTH - 16; x += 2) {
      const edge = Math.min(x, y, WIDTH - x, HEIGHT - y)
      if (edge > 30) continue
      const i = idx(x, y)
      if (world.biome[i] !== BIOME_INDEX.ocean) continue
      const clearance = Math.min(world.oceanDistance[i], 14)
      const fromLabel = sea ? Math.hypot(sea.x - x, (sea.y - y) * 2) : 99
      const score = clearance * 2 - edge * 0.15 + Math.min(fromLabel, 30) * 0.2
      if (score > bestScore) {
        bestScore = score
        best = { x, y }
      }
    }
  }
  return { x: best.x * CELL, y: best.y * CELL }
}

const Base = memo(function Base({ world, geometry, layers }: { world: World; geometry: MapGeometry; layers: Record<LayerKey, boolean> }) {
  return (
    <>
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={PAPER} />
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} filter="url(#stains)" />
      <rect x={0} y={0} width={MAP_W} height={MAP_H} fill={SEA} />
      <g fill="none" stroke={SEA_INK} strokeLinejoin="round">
        {geometry.waves.map((d, k) => (
          <path key={k} d={d} strokeWidth={0.7 - k * 0.15} opacity={0.75 - k * 0.2} />
        ))}
      </g>
      <path d={geometry.land} fill="none" stroke={SEA_DEEP} strokeWidth="14" strokeLinejoin="round" opacity="0.55" />
      <path d={geometry.land} fill={PAPER} />
      {layers.biomes && (
        <g filter="url(#watercolor)" clipPath="url(#land-clip)">
          {geometry.biomes.map((b) => (
            <path key={b.biome} d={b.d} fill={BIOME_COLOR[b.biome]} opacity="0.8" />
          ))}
        </g>
      )}
      {layers.borders && (
        <g clipPath="url(#land-clip)">
          {geometry.kingdoms.map((k) => (
            <path key={k.index} d={k.d} fill={kingdomFill(world.kingdoms[k.index]?.hue ?? 0)} opacity="0.13" />
          ))}
          {geometry.kingdoms.map((k) => (
            <path
              key={`b${k.index}`}
              d={k.d}
              fill="none"
              stroke={kingdomStroke(world.kingdoms[k.index]?.hue ?? 0)}
              strokeWidth="1.1"
              strokeDasharray="4 2 1 2"
              opacity="0.75"
            />
          ))}
        </g>
      )}
      {layers.relief && (
        <g fill="none" stroke={INK_SOFT} strokeWidth="0.45" opacity="0.32" clipPath="url(#land-clip)">
          {geometry.relief.map((d, k) => (
            <path key={k} d={d} />
          ))}
        </g>
      )}
      <path d={geometry.lakes} fill={LAKE} stroke={INK} strokeWidth="0.7" />
      <path d={geometry.land} fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x={0} y={0} width={MAP_W} height={MAP_H} filter="url(#paper-grain)" pointerEvents="none" />
    </>
  )
})

const Overlay = memo(function Overlay({ world, geometry, layers }: { world: World; geometry: MapGeometry; layers: Record<LayerKey, boolean> }) {
  return (
    <>
      {layers.rivers && (
        <g fill="none" stroke={RIVER} strokeLinecap="round" strokeLinejoin="round">
          {geometry.rivers.map((r, k) => (
            <path key={k} d={r.d} strokeWidth={r.w * 1.6} />
          ))}
        </g>
      )}
      {layers.roads && (
        <g fill="none" stroke={ROAD} strokeWidth="0.9" strokeDasharray="3 2.2" strokeLinecap="round" opacity="0.85">
          {geometry.roads.map((d, k) => (
            <path key={k} d={d} />
          ))}
        </g>
      )}
      {layers.relief && (
        <g>
          {world.glyphs.map((g, k) => (
            <use key={k} href={`#g-${g.kind}`} transform={`translate(${(g.x * CELL).toFixed(1)},${(g.y * CELL).toFixed(1)}) scale(${g.s.toFixed(2)})`} />
          ))}
        </g>
      )}
    </>
  )
})

function Graticule() {
  const lines: JSX.Element[] = []
  for (let x = 24; x < WIDTH; x += 24) lines.push(<line key={`x${x}`} x1={x * CELL} y1={0} x2={x * CELL} y2={MAP_H} />)
  for (let y = 24; y < HEIGHT; y += 24) lines.push(<line key={`y${y}`} x1={0} y1={y * CELL} x2={MAP_W} y2={y * CELL} />)
  return (
    <g stroke={SEA_INK} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6">
      {lines}
    </g>
  )
}

const halo = { paintOrder: 'stroke', stroke: PAPER_EDGE, strokeWidth: 3, strokeLinejoin: 'round' } as const

export const WorldMap = forwardRef<SVGSVGElement, Props>(function WorldMap(
  { world, layers, names, pins, title, selection, children, className, ...rest },
  ref
) {
  const geometry = useMemo(() => buildGeometry(world), [world])
  const compass = useMemo(() => compassSpot(world), [world])
  const name = (id: string, fallback: string) => names[id] ?? fallback
  const worldTitle = title ?? `Terras de ${world.name}`
  const selectedKingdom = selection?.kind === 'kingdom' ? world.kingdoms.find((k) => k.id === selection.id) : undefined

  return (
    <svg
      ref={ref}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      role="img"
      aria-label={`Mapa de ${worldTitle}`}
      {...rest}
    >
      <Symbols />
      <defs>
        <clipPath id="land-clip">
          <path d={geometry.land} />
        </clipPath>
        <clipPath id="map-clip">
          <rect x={0} y={0} width={MAP_W} height={MAP_H} />
        </clipPath>
      </defs>
      <g data-layer="map">
        <Base world={world} geometry={geometry} layers={layers} />
        <g clipPath="url(#map-clip)">
          {layers.graticule && <Graticule />}
          <Overlay world={world} geometry={geometry} layers={layers} />
          {selectedKingdom && (
            <g clipPath="url(#land-clip)" pointerEvents="none" data-preview="">
              <path d={geometry.kingdoms[selectedKingdom.index]?.d} fill={MARK} fillOpacity="0.12" stroke={MARK} strokeWidth="2.6" strokeOpacity="0.85" />
            </g>
          )}
          <Compass x={compass.x} y={compass.y} />

          {layers.labels &&
            world.kingdoms.map((k) => {
              const text = name(k.id, k.name)
              const size = Math.max(11, Math.min(20, Math.sqrt(k.area) * 0.28))
              return (
                <text
                  key={k.id}
                  data-kingdom={k.id}
                  x={k.label.x * CELL}
                  y={k.label.y * CELL}
                  textAnchor="middle"
                  fontFamily={FONT_MAP_SC}
                  fontSize={size}
                  letterSpacing={size * 0.28}
                  fill={kingdomStroke(k.hue)}
                  opacity="0.85"
                  style={{ ...halo, strokeWidth: 3.5, cursor: 'pointer' }}
                >
                  {text}
                </text>
              )
            })}

          {layers.labels &&
            world.labels.map((l) => (
              <text
                key={l.id}
                data-label={l.id}
                x={l.x * CELL}
                y={l.y * CELL}
                textAnchor="middle"
                fontFamily={FONT_MAP}
                fontStyle="italic"
                fontSize={l.kind === 'sea' ? 17 : 12}
                letterSpacing={l.kind === 'sea' ? 5 : 1.5}
                fill={l.kind === 'sea' ? SEA_INK : INK_SOFT}
                style={{ ...(l.kind === 'sea' ? {} : halo), cursor: 'pointer' }}
              >
                {name(l.id, l.name)}
              </text>
            ))}

          {world.cities.map((c) => {
            const selected = selection?.kind === 'city' && selection.id === c.id
            return (
              <g key={c.id} data-city={c.id} transform={`translate(${c.x * CELL},${c.y * CELL})`} style={{ cursor: 'pointer' }}>
                {selected && <circle r={9} fill="none" stroke={MARK} strokeWidth="2" data-preview="" />}
                <circle r={9} fill="transparent" data-preview="" />
                <use href={c.capital ? '#g-capital' : '#g-town'} />
                {layers.labels && (
                  <text
                    x={(c.capital ? 8 : 5.5) * (c.x > WIDTH - 24 ? -1 : 1)}
                    y={c.capital ? 4 : 3.5}
                    textAnchor={c.x > WIDTH - 24 ? 'end' : 'start'}
                    fontFamily={FONT_MAP}
                    fontSize={c.capital ? 13 : 10.5}
                    fill={INK}
                    style={halo}
                  >
                    {name(c.id, c.name)}
                  </text>
                )}
              </g>
            )
          })}

          {pins.map((p) => {
            const selected = selection?.kind === 'pin' && selection.id === p.id
            return (
              <g key={p.id} data-pin={p.id} transform={`translate(${p.x * CELL},${p.y * CELL}) scale(${selected ? 1.25 : 1})`} style={{ cursor: 'pointer' }}>
                <use href="#g-pin" />
                {layers.labels && (
                  <text x={7} y={-6} fontFamily={FONT_MAP} fontStyle="italic" fontSize="10.5" fill={MARK} style={halo}>
                    {p.title}
                  </text>
                )}
              </g>
            )
          })}
        </g>
        <Frame title={worldTitle} subtitle={`Mapa traçado a partir da semente “${world.params.seed}”`} />
        <ScaleBar />
        {children}
      </g>
    </svg>
  )
})
