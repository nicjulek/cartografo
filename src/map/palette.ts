import type { Biome } from '../gen/types'

export const INK = '#2f2924'
export const INK_SOFT = '#6a5d50'
export const PAPER = '#efe6cf'
export const PAPER_EDGE = '#e2d5b6'
export const SEA = '#cddfdc'
export const SEA_DEEP = '#b9d1cf'
export const SEA_INK = '#6f9599'
export const RIVER = '#5d8c98'
export const LAKE = '#bcd6d6'
export const ROAD = '#8a6a4f'
export const MARK = '#a8326b'

export const FONT_MAP = "'IM Fell English', 'Iowan Old Style', Georgia, serif"
export const FONT_MAP_SC = "'IM Fell English SC', 'IM Fell English', Georgia, serif"

export const BIOME_COLOR: Record<Biome, string> = {
  ocean: SEA,
  lake: LAKE,
  beach: '#eadcae',
  desert: '#e5c98e',
  steppe: '#dcd49b',
  grassland: '#cfd8a1',
  forest: '#aec48c',
  rainforest: '#93b783',
  taiga: '#aebfa0',
  tundra: '#d8dacd',
  marsh: '#b9c6a1',
  mountain: '#d2c3a5',
  snow: '#f6f3ea'
}

export function kingdomFill(hue: number): string {
  return `hsl(${hue.toFixed(0)} 42% 52%)`
}

export function kingdomStroke(hue: number): string {
  return `hsl(${hue.toFixed(0)} 38% 34%)`
}
