import { describe, expect, it } from 'vitest'
import { BIOME_INDEX } from '../src/gen/biomes'
import { idx, SIZE } from '../src/gen/grid'
import { DEFAULT_PARAMS, generateWorld } from '../src/gen/world'
import type { Shape } from '../src/gen/types'

describe('generateWorld', () => {
  it('gera o mesmo mundo para a mesma seed', () => {
    const a = generateWorld(DEFAULT_PARAMS)
    const b = generateWorld(DEFAULT_PARAMS)
    expect(a.name).toBe(b.name)
    expect(a.cities).toEqual(b.cities)
    expect(Array.from(a.biome)).toEqual(Array.from(b.biome))
  })

  it('gera mundos diferentes para seeds diferentes', () => {
    const a = generateWorld(DEFAULT_PARAMS)
    const b = generateWorld({ ...DEFAULT_PARAMS, seed: 'outra-seed' })
    expect(Array.from(a.biome)).not.toEqual(Array.from(b.biome))
  })

  it.each<Shape>(['ilha', 'arquipelago', 'continente'])('cria terra e mar no formato %s', (shape) => {
    const w = generateWorld({ ...DEFAULT_PARAMS, shape })
    expect(w.landRatio).toBeGreaterThan(0.08)
    expect(w.landRatio).toBeLessThan(0.85)
    expect(w.cities.length).toBeGreaterThan(3)
  })

  it('coloca cidades em terra e cada uma pertence a um reino', () => {
    const w = generateWorld(DEFAULT_PARAMS)
    for (const c of w.cities) {
      const b = w.biome[idx(Math.floor(c.x), Math.floor(c.y))]
      expect(b).not.toBe(BIOME_INDEX.ocean)
      expect(b).not.toBe(BIOME_INDEX.lake)
      expect(c.kingdom).toBeGreaterThanOrEqual(0)
    }
    expect(w.cities.filter((c) => c.capital)).toHaveLength(w.kingdoms.length)
  })

  it('atribui todo pedaco de terra a um reino', () => {
    const w = generateWorld(DEFAULT_PARAMS)
    for (let i = 0; i < SIZE; i++) {
      if (w.biome[i] !== BIOME_INDEX.ocean) expect(w.kingdomOf[i]).toBeGreaterThanOrEqual(0)
    }
  })

  it('faz os rios terminarem em agua ou em outro rio', () => {
    const w = generateWorld(DEFAULT_PARAMS)
    expect(w.rivers.length).toBeGreaterThan(0)
    for (const r of w.rivers) {
      expect(r.points.length).toBeGreaterThanOrEqual(6)
      expect(r.points.length).toBe(r.widths.length)
    }
  })

  it('respeita o esboco do usuario', () => {
    const sketch = new Int8Array(SIZE)
    for (let y = 2; y < 10; y++) for (let x = 2; x < 190; x++) sketch[idx(x, y)] = -1
    for (let y = 60; y < 70; y++) for (let x = 90; x < 100; x++) sketch[idx(x, y)] = 1
    const w = generateWorld({ ...DEFAULT_PARAMS, shape: 'arquipelago' }, sketch)
    expect(w.biome[idx(95, 65)]).not.toBe(BIOME_INDEX.ocean)
  })
})
