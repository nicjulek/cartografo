import { useState } from 'react'
import { BIOME_LABEL, BIOMES } from '../gen/biomes'
import { HEIGHT, idx, WIDTH } from '../gen/grid'
import type { City, World } from '../gen/types'
import { useAtlas } from '../store/atlas'
import { Field } from './controls'
import { Icon } from './Icon'
import styles from './Panel.module.css'

const KIND_LABEL = { sea: 'Mar', range: 'Cordilheira', forest: 'Floresta', desert: 'Deserto' } as const

function coords(x: number, y: number): string {
  const lat = Math.round((0.5 - y / HEIGHT) * 80)
  const lon = Math.round((x / WIDTH - 0.5) * 120)
  return `${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon)}° ${lon >= 0 ? 'L' : 'O'}`
}

function terrainAt(world: World, x: number, y: number): string {
  const cell = idx(Math.min(WIDTH - 1, Math.floor(x)), Math.min(HEIGHT - 1, Math.floor(y)))
  return BIOME_LABEL[BIOMES[world.biome[cell]]]
}

function Notes({ id }: { id: string }) {
  const note = useAtlas((s) => s.notes[id] ?? '')
  const setNote = useAtlas((s) => s.setNote)
  return (
    <Field label="Lendas e anotações">
      {(fid) => (
        <textarea
          id={fid}
          value={note}
          placeholder="Quem governa, o que se conta nas tavernas, o que espera os viajantes…"
          onChange={(e) => setNote(id, e.target.value)}
        />
      )}
    </Field>
  )
}

function NameField({ id, fallback, label = 'Nome' }: { id: string; fallback: string; label?: string }) {
  const value = useAtlas((s) => s.names[id])
  const rename = useAtlas((s) => s.rename)
  const [draft, setDraft] = useState(value ?? fallback)
  return (
    <Field label={label}>
      {(fid) => (
        <input
          id={fid}
          value={draft}
          placeholder={fallback}
          onChange={(e) => {
            setDraft(e.target.value)
            rename(id, e.target.value === fallback ? '' : e.target.value)
          }}
        />
      )}
    </Field>
  )
}

export function DetailTab() {
  const world = useAtlas((s) => s.world)
  const selection = useAtlas((s) => s.selection)
  const names = useAtlas((s) => s.names)
  const pins = useAtlas((s) => s.pins)
  const select = useAtlas((s) => s.select)
  const updatePin = useAtlas((s) => s.updatePin)
  const removePin = useAtlas((s) => s.removePin)

  if (!world || !selection) {
    return (
      <div className={styles.emptyDetail}>
        <Icon name="compass" size={28} />
        <p>Toque num reino, cidade, mar ou marcador para dar nome a ele e escrever suas lendas.</p>
      </div>
    )
  }

  const nameOf = (id: string, fallback: string) => names[id] ?? fallback
  const kingdomName = (k: number) => {
    const kd = world.kingdoms[k]
    return kd ? nameOf(kd.id, kd.name) : 'terras sem dono'
  }

  if (selection.kind === 'city') {
    const city = world.cities.find((c) => c.id === selection.id)
    if (!city) return null
    const role = city.capital ? 'Capital' : city.port ? 'Cidade portuária' : 'Cidade'
    return (
      <div className={styles.stack}>
        <header className={styles.detailHead}>
          <p>
            {role} de{' '}
            <button type="button" className={styles.inlineLink} onClick={() => world.kingdoms[city.kingdom] && select({ kind: 'kingdom', id: world.kingdoms[city.kingdom].id })}>
              {kingdomName(city.kingdom)}
            </button>
          </p>
          <h2>{nameOf(city.id, city.name)}</h2>
          <dl className={styles.facts}>
            <div>
              <dt>Terreno</dt>
              <dd>{terrainAt(world, city.x, city.y)}</dd>
            </div>
            <div>
              <dt>Posição</dt>
              <dd>{coords(city.x, city.y)}</dd>
            </div>
          </dl>
        </header>
        <NameField key={`${city.id}:${city.name}`} id={city.id} fallback={city.name} />
        <Notes id={city.id} />
      </div>
    )
  }

  if (selection.kind === 'kingdom') {
    const kingdom = world.kingdoms.find((k) => k.id === selection.id)
    if (!kingdom) return null
    const cities = world.cities.filter((c) => c.kingdom === kingdom.index).sort((a, b) => Number(b.capital) - Number(a.capital))
    const land = world.kingdoms.reduce((s, k) => s + k.area, 0)
    const capital = world.cities.find((c) => c.id === kingdom.capital)
    return (
      <div className={styles.stack}>
        <header className={styles.detailHead}>
          <p>Reino</p>
          <h2>{nameOf(kingdom.id, kingdom.name)}</h2>
          <dl className={styles.facts}>
            <div>
              <dt>Território</dt>
              <dd>{Math.round((kingdom.area / Math.max(1, land)) * 100)}% das terras</dd>
            </div>
            {capital && (
              <div>
                <dt>Capital</dt>
                <dd>{nameOf(capital.id, capital.name)}</dd>
              </div>
            )}
          </dl>
        </header>
        <NameField key={`${kingdom.id}:${kingdom.name}`} id={kingdom.id} fallback={kingdom.name} />
        <Notes id={kingdom.id} />
        <CityList cities={cities} nameOf={nameOf} onPick={(c) => select({ kind: 'city', id: c.id })} />
      </div>
    )
  }

  if (selection.kind === 'label') {
    const label = world.labels.find((l) => l.id === selection.id)
    if (!label) return null
    return (
      <div className={styles.stack}>
        <header className={styles.detailHead}>
          <p>{KIND_LABEL[label.kind]}</p>
          <h2>{nameOf(label.id, label.name)}</h2>
        </header>
        <NameField key={`${label.id}:${label.name}`} id={label.id} fallback={label.name} />
        <Notes id={label.id} />
      </div>
    )
  }

  const pin = pins.find((p) => p.id === selection.id)
  if (!pin) return null
  return (
    <div className={styles.stack}>
      <header className={styles.detailHead}>
        <p>Lugar marcado em {terrainAt(world, pin.x, pin.y).toLowerCase()}</p>
        <h2>{pin.title || 'Lugar sem nome'}</h2>
        <dl className={styles.facts}>
          <div>
            <dt>Posição</dt>
            <dd>{coords(pin.x, pin.y)}</dd>
          </div>
        </dl>
      </header>
      <Field label="Nome">
        {(fid) => <input id={fid} value={pin.title} onChange={(e) => updatePin(pin.id, { title: e.target.value.slice(0, 80) })} />}
      </Field>
      <Field label="Lendas e anotações">
        {(fid) => (
          <textarea
            id={fid}
            value={pin.text}
            placeholder="Uma torre caída, um poço que sussurra, o lugar onde o dragão dorme…"
            onChange={(e) => updatePin(pin.id, { text: e.target.value.slice(0, 4000) })}
          />
        )}
      </Field>
      <button type="button" className={styles.danger} onClick={() => removePin(pin.id)}>
        <Icon name="trash" size={16} />
        Apagar marcador
      </button>
    </div>
  )
}

function CityList({ cities, nameOf, onPick }: { cities: City[]; nameOf: (id: string, f: string) => string; onPick: (c: City) => void }) {
  if (!cities.length) return null
  return (
    <div className={styles.group}>
      <h3>Cidades</h3>
      <ul className={styles.cityList}>
        {cities.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)}>
              <span className={c.capital ? styles.capitalDot : styles.townDot} aria-hidden="true" />
              {nameOf(c.id, c.name)}
              {c.capital && <span className={styles.tag}>capital</span>}
              {!c.capital && c.port && <span className={styles.tag}>porto</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
