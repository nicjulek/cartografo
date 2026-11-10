import { create } from 'zustand'
import { SIZE } from '../gen/grid'
import { randomSeed } from '../gen/random'
import type { Sketch, World, WorldParams } from '../gen/types'
import { DEFAULT_PARAMS } from '../gen/world'
import { requestWorld } from '../lib/generate'
import type { Pin, Snapshot } from '../share/codec'

export type Tool = 'move' | 'land' | 'sea' | 'pin'

export type LayerKey = 'relief' | 'biomes' | 'rivers' | 'roads' | 'borders' | 'labels' | 'graticule'

export type Selection =
  | { kind: 'city'; id: string }
  | { kind: 'kingdom'; id: string }
  | { kind: 'label'; id: string }
  | { kind: 'pin'; id: string }

export type Panel = 'mundo' | 'camadas' | 'detalhe'

interface AtlasState {
  params: WorldParams
  sketch: Sketch | null
  undo: (Sketch | null)[]
  world: World | null
  generating: boolean
  error: string | null
  title: string | null
  names: Record<string, string>
  notes: Record<string, string>
  pins: Pin[]
  tool: Tool
  brush: number
  layers: Record<LayerKey, boolean>
  selection: Selection | null
  panel: Panel
  sheetOpen: boolean
  entryId: string | null
  setEntryId: (id: string | null) => void
  setSheetOpen: (open: boolean) => void
  setParam: <K extends keyof WorldParams>(key: K, value: WorldParams[K]) => void
  reroll: () => void
  regenerate: () => Promise<void>
  load: (snapshot: Snapshot, entryId?: string | null) => void
  newWorld: () => void
  applyStroke: (cells: number[], value: -1 | 1) => void
  undoStroke: () => void
  clearSketch: () => void
  setTool: (tool: Tool) => void
  setBrush: (brush: number) => void
  toggleLayer: (key: LayerKey) => void
  select: (selection: Selection | null) => void
  setPanel: (panel: Panel) => void
  rename: (id: string, name: string) => void
  setNote: (id: string, text: string) => void
  setTitle: (title: string) => void
  addPin: (x: number, y: number) => void
  updatePin: (id: string, patch: Partial<Pick<Pin, 'title' | 'text'>>) => void
  removePin: (id: string) => void
}

let running = false
let dirty = false

export const useAtlas = create<AtlasState>((set, get) => ({
  params: DEFAULT_PARAMS,
  sketch: null,
  undo: [],
  world: null,
  generating: false,
  error: null,
  title: null,
  names: {},
  notes: {},
  pins: [],
  tool: 'move',
  brush: 5,
  layers: { relief: true, biomes: true, rivers: true, roads: true, borders: true, labels: true, graticule: false },
  selection: null,
  panel: 'mundo',
  sheetOpen: false,
  entryId: null,
  setEntryId: (entryId) => set({ entryId }),
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),

  setParam: (key, value) => {
    set((s) => ({ params: { ...s.params, [key]: value } }))
    void get().regenerate()
  },

  reroll: () => {
    set((s) => ({ params: { ...s.params, seed: randomSeed() }, names: {}, notes: {}, title: null, selection: null }))
    void get().regenerate()
  },

  regenerate: async () => {
    if (running) {
      dirty = true
      return
    }
    running = true
    set({ generating: true, error: null })
    try {
      do {
        dirty = false
        const world = await requestWorld(get().params, get().sketch)
        if (dirty) continue
        const selection = get().selection
        const stillThere =
          !selection ||
          selection.kind === 'pin' ||
          (selection.kind === 'city' && world.cities.some((c) => c.id === selection.id)) ||
          (selection.kind === 'kingdom' && world.kingdoms.some((k) => k.id === selection.id)) ||
          (selection.kind === 'label' && world.labels.some((l) => l.id === selection.id))
        set({ world, selection: stillThere ? selection : null })
      } while (dirty)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Falha ao gerar o mundo' })
    } finally {
      running = false
      set({ generating: false })
    }
  },

  load: (snapshot, entryId = null) => {
    set({
      entryId,
      params: snapshot.params,
      sketch: snapshot.sketch,
      undo: [],
      title: snapshot.title,
      names: snapshot.names,
      notes: snapshot.notes,
      pins: snapshot.pins,
      selection: null,
      panel: 'mundo'
    })
    void get().regenerate()
  },

  newWorld: () => {
    set({
      entryId: null,
      params: { ...DEFAULT_PARAMS, seed: randomSeed() },
      sketch: null,
      undo: [],
      title: null,
      names: {},
      notes: {},
      pins: [],
      selection: null,
      panel: 'mundo'
    })
    void get().regenerate()
  },

  applyStroke: (cells, value) => {
    const prev = get().sketch
    const next = prev ? prev.slice() : new Int8Array(SIZE)
    for (const c of cells) next[c] = value
    set((s) => ({ sketch: next, undo: [...s.undo.slice(-19), prev] }))
    void get().regenerate()
  },

  undoStroke: () => {
    const undo = get().undo
    if (!undo.length) return
    set({ sketch: undo[undo.length - 1], undo: undo.slice(0, -1) })
    void get().regenerate()
  },

  clearSketch: () => {
    set((s) => ({ sketch: null, undo: [...s.undo.slice(-19), s.sketch] }))
    void get().regenerate()
  },

  setTool: (tool) => set({ tool }),
  setBrush: (brush) => set({ brush }),
  toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  select: (selection) =>
    set((s) => ({
      selection,
      panel: selection ? 'detalhe' : s.panel,
      sheetOpen: selection ? true : s.sheetOpen
    })),
  setPanel: (panel) => set({ panel }),

  rename: (id, name) =>
    set((s) => {
      const names = { ...s.names }
      if (name.trim()) names[id] = name.slice(0, 60)
      else delete names[id]
      return { names }
    }),

  setNote: (id, text) =>
    set((s) => {
      const notes = { ...s.notes }
      if (text.trim()) notes[id] = text.slice(0, 4000)
      else delete notes[id]
      return { notes }
    }),

  setTitle: (title) => set({ title: title.trim() ? title.slice(0, 60) : null }),

  addPin: (x, y) => {
    const id = `p${Date.now().toString(36)}`
    set((s) => ({
      pins: [...s.pins, { id, x, y, title: 'Lugar sem nome', text: '' }],
      selection: { kind: 'pin', id },
      panel: 'detalhe',
      sheetOpen: true,
      tool: 'move'
    }))
  },

  updatePin: (id, patch) => set((s) => ({ pins: s.pins.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  removePin: (id) => set((s) => ({ pins: s.pins.filter((p) => p.id !== id), selection: null, panel: 'mundo' }))
}))

export function snapshotOf(state: Pick<AtlasState, 'params' | 'sketch' | 'title' | 'names' | 'notes' | 'pins'>): Snapshot {
  return {
    params: state.params,
    sketch: state.sketch,
    title: state.title,
    names: state.names,
    notes: state.notes,
    pins: state.pins
  }
}

export function displayName(names: Record<string, string>, id: string, fallback: string): string {
  return names[id] ?? fallback
}
