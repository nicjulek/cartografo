import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BIOME_INDEX } from '../gen/biomes'
import { HEIGHT, idx, inside, WIDTH } from '../gen/grid'
import { useAtlas } from '../store/atlas'
import { CELL, HOME, VIEW } from './geometry'
import { WorldMap } from './WorldMap'
import styles from './MapView.module.css'

interface View {
  x: number
  y: number
  w: number
  h: number
}

const MIN_W = VIEW.w / 8

function clampView(v: View): View {
  const w = Math.min(HOME.w, Math.max(MIN_W, v.w))
  const h = (w / HOME.w) * HOME.h
  const x = Math.min(VIEW.x + VIEW.w - w * 0.5, Math.max(VIEW.x - w * 0.5, v.x))
  const y = Math.min(VIEW.y + VIEW.h - h * 0.5, Math.max(VIEW.y - h * 0.5, v.y))
  return { x, y, w, h }
}

export function MapView({ onReady }: { onReady?: (svg: SVGSVGElement | null) => void }) {
  const world = useAtlas((s) => s.world)
  const layers = useAtlas((s) => s.layers)
  const names = useAtlas((s) => s.names)
  const pins = useAtlas((s) => s.pins)
  const title = useAtlas((s) => s.title)
  const selection = useAtlas((s) => s.selection)
  const tool = useAtlas((s) => s.tool)
  const brush = useAtlas((s) => s.brush)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const view = useRef<View>({ ...HOME })
  const frame = useRef(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: boolean; startX: number; startY: number; pinch?: number; target?: Element } | null>(null)
  const stroke = useRef<{ cells: Set<number>; last: { x: number; y: number } | null; value: -1 | 1 } | null>(null)
  const [preview, setPreview] = useState<{ points: { x: number; y: number }[]; value: -1 | 1 } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  const apply = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const v = view.current
      svgRef.current?.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`)
    })
  }, [])

  const setRef = useCallback(
    (node: SVGSVGElement | null) => {
      svgRef.current = node
      onReady?.(node)
      if (node) {
        const rect = node.getBoundingClientRect()
        if (rect.width && rect.height / rect.width > 1) {
          const w = HOME.w / 1.8
          const h = HOME.h / 1.8
          view.current = clampView({ x: VIEW.x + VIEW.w / 2 - w / 2, y: VIEW.y + VIEW.h / 2 - h / 2, w, h })
        }
        const v = view.current
        node.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`)
      }
    },
    [onReady]
  )

  const toMap = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const v = view.current
      const anchor =
        clientX !== undefined && clientY !== undefined ? toMap(clientX, clientY) : { x: v.x + v.w / 2, y: v.y + v.h / 2 }
      if (!anchor) return
      const w = Math.min(HOME.w, Math.max(MIN_W, v.w / factor))
      const k = w / v.w
      view.current = clampView({
        x: anchor.x - (anchor.x - v.x) * k,
        y: anchor.y - (anchor.y - v.y) * k,
        w,
        h: v.h * k
      })
      apply()
    },
    [apply, toMap]
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [zoomAt, world])

  const paintAt = (clientX: number, clientY: number) => {
    const s = stroke.current
    const p = toMap(clientX, clientY)
    if (!s || !p) return
    const cx = p.x / CELL
    const cy = p.y / CELL
    const from = s.last ?? { x: cx, y: cy }
    const dist = Math.hypot(cx - from.x, cy - from.y)
    const steps = Math.max(1, Math.ceil(dist))
    for (let k = 0; k <= steps; k++) {
      const px = from.x + ((cx - from.x) * k) / steps
      const py = from.y + ((cy - from.y) * k) / steps
      for (let dy = -brush; dy <= brush; dy++) {
        for (let dx = -brush; dx <= brush; dx++) {
          if (dx * dx + dy * dy > brush * brush) continue
          const x = Math.floor(px + dx)
          const y = Math.floor(py + dy)
          if (inside(x, y)) s.cells.add(idx(x, y))
        }
      }
    }
    s.last = { x: cx, y: cy }
    setPreview((prev) => ({ value: s.value, points: [...(prev?.points ?? []), { x: p.x, y: p.y }] }))
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = { moved: true, startX: 0, startY: 0, pinch: Math.hypot(a.x - b.x, a.y - b.y) }
      stroke.current = null
      setPreview(null)
      return
    }
    gesture.current = { moved: false, startX: e.clientX, startY: e.clientY, target: e.target as Element }
    if (tool === 'land' || tool === 'sea') {
      stroke.current = { cells: new Set(), last: null, value: tool === 'land' ? 1 : -1 }
      paintAt(e.clientX, e.clientY)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (tool === 'land' || tool === 'sea') {
      const p = toMap(e.clientX, e.clientY)
      setCursor(p)
    }
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return

    if (pointers.current.size === 2 && g.pinch) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomAt(d / g.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2)
      g.pinch = d
      return
    }

    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 4) g.moved = true
    if (stroke.current) {
      paintAt(e.clientX, e.clientY)
      return
    }
    if (!g.moved) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const v = view.current
    const scale = Math.max(v.w / rect.width, v.h / rect.height)
    view.current = clampView({ ...v, x: v.x - (e.clientX - prev.x) * scale, y: v.y - (e.clientY - prev.y) * scale })
    apply()
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (pointers.current.size > 0) return
    gesture.current = null
    const s = stroke.current
    stroke.current = null
    if (s) {
      setPreview(null)
      if (s.cells.size) useAtlas.getState().applyStroke([...s.cells], s.value)
      return
    }
    if (!g || g.moved) return
    handleClick(g.target ?? (e.target as Element), e.clientX, e.clientY)
  }

  const handleClick = (target: Element, clientX: number, clientY: number) => {
    const state = useAtlas.getState()
    const p = toMap(clientX, clientY)
    if (state.tool === 'pin') {
      if (p && p.x >= 0 && p.y >= 0 && p.x <= WIDTH * CELL && p.y <= HEIGHT * CELL) state.addPin(p.x / CELL, p.y / CELL)
      return
    }
    const hit = target.closest('[data-city],[data-pin],[data-kingdom],[data-label]')
    if (hit instanceof SVGElement) {
      const d = hit.dataset
      if (d.city) return state.select({ kind: 'city', id: d.city })
      if (d.pin) return state.select({ kind: 'pin', id: d.pin })
      if (d.kingdom) return state.select({ kind: 'kingdom', id: d.kingdom })
      if (d.label) return state.select({ kind: 'label', id: d.label })
    }
    const w = state.world
    if (!w || !p) return state.select(null)
    const x = Math.floor(p.x / CELL)
    const y = Math.floor(p.y / CELL)
    if (!inside(x, y)) return state.select(null)
    const i = idx(x, y)
    if (w.biome[i] === BIOME_INDEX.ocean) {
      const sea = w.labels.find((l) => l.kind === 'sea')
      return state.select(sea ? { kind: 'label', id: sea.id } : null)
    }
    const k = w.kingdomOf[i]
    state.select(k >= 0 && w.kingdoms[k] ? { kind: 'kingdom', id: w.kingdoms[k].id } : null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return
      if (e.key === '+' || e.key === '=') zoomAt(1.4)
      else if (e.key === '-') zoomAt(1 / 1.4)
      else if (e.key === '0') {
        view.current = { ...HOME }
        apply()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apply, zoomAt])

  if (!world) return <div className={styles.empty} />

  const painting = tool === 'land' || tool === 'sea'

  return (
    <div className={styles.wrap} data-tool={tool}>
      <WorldMap
        ref={setRef}
        className={styles.svg}
        world={world}
        layers={layers}
        names={names}
        pins={pins}
        title={title}
        selection={selection}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setCursor(null)}
      >
        <g pointerEvents="none" data-preview="">
          {preview && preview.points.length > 0 && (
            <polyline
              points={preview.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={preview.value === 1 ? '#7d8f4e' : '#4f8a96'}
              strokeOpacity="0.45"
              strokeWidth={brush * 2 * CELL}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {painting && cursor && (
            <circle cx={cursor.x} cy={cursor.y} r={brush * CELL} fill="none" stroke="#2f2924" strokeWidth="1" strokeDasharray="3 3" />
          )}
        </g>
      </WorldMap>
      <div className={styles.zoom}>
        <button type="button" onClick={() => zoomAt(1.4)} aria-label="Aproximar">
          +
        </button>
        <button type="button" onClick={() => zoomAt(1 / 1.4)} aria-label="Afastar">
          −
        </button>
        <button
          type="button"
          onClick={() => {
            view.current = { ...HOME }
            apply()
          }}
          aria-label="Ver o mapa inteiro"
        >
          ⤢
        </button>
      </div>
    </div>
  )
}

