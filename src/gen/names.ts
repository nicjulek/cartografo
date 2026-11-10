import { Rng } from './random'

const ONSETS = [
  'b', 'c', 'd', 'f', 'g', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'k', 'h',
  'br', 'cr', 'dr', 'gr', 'tr', 'vr', 'fl', 'cl', 'lh', 'nh', 'ch', 'qu', 'th', 'sk', 'y'
]
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'o', 'a', 'i', 'ae', 'ia', 'ei', 'au', 'y']
const CODAS = ['', '', '', '', 'n', 'r', 'l', 's', 'm', 'nd', 'rn', 'x', 'th']
const ENDINGS = ['', '', '', 'a', 'or', 'en', 'ia', 'el', 'ar', 'is', 'ur', 'ane', 'orn', 'ira', 'ost']

export interface Language {
  onsets: string[]
  vowels: string[]
  codas: string[]
  endings: string[]
  minSyllables: number
  maxSyllables: number
}

function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items]
  const out: T[] = []
  while (out.length < count && pool.length) {
    out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0])
  }
  return out
}

export function makeLanguage(rng: Rng): Language {
  return {
    onsets: [...sample(rng, ONSETS.slice(0, 16), rng.int(5, 9)), ...sample(rng, ONSETS.slice(16), rng.int(1, 3))],
    vowels: sample(rng, VOWELS, rng.int(3, 6)),
    codas: sample(rng, CODAS, rng.int(3, 6)),
    endings: sample(rng, ENDINGS, rng.int(3, 5)),
    minSyllables: 2,
    maxSyllables: 2
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function clean(text: string): string {
  return text
    .replace(/(.)\1\1+/g, '$1$1')
    .replace(/([aeiouy]{3,})/g, (m) => m.slice(0, 2))
    .replace(/^(.{11}).+/, '$1')
}

export class NameMaker {
  private used = new Set<string>()

  constructor(private rng: Rng) {}

  word(lang: Language, source: Rng = this.rng): string {
    const rng = source
    for (let attempt = 0; attempt < 160; attempt++) {
      const count = rng.int(lang.minSyllables, lang.maxSyllables)
      let word = ''
      for (let i = 0; i < count; i++) {
        const vowel = attempt > 80 ? rng.pick(['a', 'e', 'i', 'o', 'u']) : rng.pick(lang.vowels)
        word += rng.pick(lang.onsets) + vowel
        if (i === count - 1 && rng.chance(0.5)) word += rng.pick(lang.codas)
      }
      if (count === 1 || rng.chance(0.5)) word += rng.pick(lang.endings)
      word = capitalize(clean(word))
      if (this.acceptable(word, attempt < 60)) {
        this.used.add(word)
        return word
      }
    }
    let fallback = 'Avel'
    while (this.used.has(fallback)) fallback += 'a'
    this.used.add(fallback)
    return fallback
  }

  private acceptable(word: string, strict: boolean): boolean {
    if (this.used.has(word) || word.length < 4 || word.length > 9) return false
    if (/[^aeiouy]{3}/i.test(word)) return false
    if (!strict) return true
    return !/(.{2,3})\1/i.test(word) && !/[aeiouy]{2}.*[aeiouy]{2}/i.test(word)
  }
}

const REALMS = ['Reino de', 'Ducado de', 'Terras de', 'Principado de', 'Condado de', 'Marca de']

export function realmName(rng: Rng, word: string): string {
  return `${rng.pick(REALMS)} ${word}`
}

export function cityName(rng: Rng, word: string, port: boolean): string {
  if (port && rng.chance(0.3)) return `Porto ${word}`
  if (rng.chance(0.08)) return `Vila ${word}`
  return word
}

export function seaName(rng: Rng, word: string): string {
  return `${rng.pick(['Mar de', 'Mar', 'Oceano', 'Mar das Brumas de'])} ${word}`
}

export function rangeName(rng: Rng, word: string): string {
  return `${rng.pick(['Montes', 'Serra de', 'Picos de', 'Cordilheira de'])} ${word}`
}

export function forestName(rng: Rng, word: string): string {
  return `${rng.pick(['Floresta de', 'Bosque de', 'Mata de'])} ${word}`
}

export function desertName(rng: Rng, word: string): string {
  return `${rng.pick(['Deserto de', 'Areias de', 'Ermo de'])} ${word}`
}
