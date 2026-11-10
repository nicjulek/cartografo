export type Shape = 'ilha' | 'arquipelago' | 'continente'

export interface WorldParams {
  seed: string
  shape: Shape
  seaLevel: number
  mountains: number
  moisture: number
  temperature: number
  rivers: number
  cities: number
  kingdoms: number
}

export type Sketch = Int8Array

export type Biome =
  | 'ocean'
  | 'lake'
  | 'beach'
  | 'desert'
  | 'steppe'
  | 'grassland'
  | 'forest'
  | 'rainforest'
  | 'taiga'
  | 'tundra'
  | 'marsh'
  | 'mountain'
  | 'snow'

export interface Point {
  x: number
  y: number
}

export interface River {
  id: string
  points: Point[]
  widths: number[]
}

export interface City {
  id: string
  name: string
  x: number
  y: number
  capital: boolean
  kingdom: number
  port: boolean
}

export interface Kingdom {
  id: string
  index: number
  name: string
  capital: string
  label: Point
  area: number
  hue: number
}

export interface Road {
  id: string
  points: Point[]
}

export interface Glyph {
  kind: 'peak' | 'hill' | 'tree' | 'pine' | 'palm' | 'dune' | 'tuft'
  x: number
  y: number
  s: number
}

export interface Label {
  id: string
  kind: 'sea' | 'range' | 'forest' | 'desert'
  name: string
  x: number
  y: number
}

export interface World {
  params: WorldParams
  width: number
  height: number
  name: string
  elevation: Float32Array
  biome: Uint8Array
  kingdomOf: Int16Array
  oceanDistance: Float32Array
  rivers: River[]
  cities: City[]
  kingdoms: Kingdom[]
  roads: Road[]
  glyphs: Glyph[]
  labels: Label[]
  landRatio: number
}
