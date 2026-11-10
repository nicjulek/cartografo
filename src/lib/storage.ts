export interface AtlasEntry {
  id: string
  title: string
  seed: string
  savedAt: number
  code: string
  thumb: string
}

const KEY = 'cartografo:atlas'
const LIMIT = 30

export function listEntries(): AtlasEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as AtlasEntry[]) : []
    return Array.isArray(list) ? list.sort((a, b) => b.savedAt - a.savedAt) : []
  } catch {
    return []
  }
}

function write(list: AtlasEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)))
    return true
  } catch {
    return false
  }
}

export function saveEntry(entry: AtlasEntry): boolean {
  const list = listEntries().filter((e) => e.id !== entry.id)
  return write([entry, ...list])
}

export function removeEntry(id: string): void {
  write(listEntries().filter((e) => e.id !== id))
}
