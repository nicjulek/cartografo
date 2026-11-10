import { describe, expect, it } from 'vitest'
import { idx, SIZE } from '../src/gen/grid'
import { DEFAULT_PARAMS } from '../src/gen/world'
import { decodeSnapshot, encodeSnapshot, type Snapshot } from '../src/share/codec'

describe('codec', () => {
  it('ida e volta preserva o mundo', () => {
    const sketch = new Int8Array(SIZE)
    sketch[idx(10, 10)] = 1
    sketch[idx(50, 40)] = -1
    const snap: Snapshot = {
      params: { ...DEFAULT_PARAMS, shape: 'continente', cities: 22 },
      sketch,
      title: 'Atlas de Vel',
      names: { c1: 'Porto Lume' },
      notes: { k0: 'Aqui moram os guardioes do farol' },
      pins: [{ id: 'p0', x: 12.5, y: 40.25, title: 'Ruinas', text: 'Uma torre caida' }]
    }
    const back = decodeSnapshot(encodeSnapshot(snap))!
    expect(back.params).toEqual(snap.params)
    expect(Array.from(back.sketch!)).toEqual(Array.from(sketch))
    expect(back.title).toBe('Atlas de Vel')
    expect(back.names).toEqual(snap.names)
    expect(back.notes).toEqual(snap.notes)
    expect(back.pins).toEqual(snap.pins)
  })

  it('cabe num link mesmo com esboco', () => {
    const sketch = new Int8Array(SIZE)
    for (let y = 20; y < 60; y++) for (let x = 30; x < 90; x++) sketch[idx(x, y)] = 1
    const text = encodeSnapshot({ params: DEFAULT_PARAMS, sketch, title: null, names: {}, notes: {}, pins: [] })
    expect(text.length).toBeLessThan(2000)
  })

  it('ignora texto invalido', () => {
    expect(decodeSnapshot('lixo')).toBeNull()
    expect(decodeSnapshot('')).toBeNull()
  })
})
