import { useState } from 'react'
import type { Shape } from '../gen/types'
import { useAtlas } from '../store/atlas'
import { Segmented, Slider } from './controls'
import { Icon } from './Icon'
import styles from './Panel.module.css'

const SHAPES: { value: Shape; label: string }[] = [
  { value: 'ilha', label: 'Ilha' },
  { value: 'arquipelago', label: 'Arquipélago' },
  { value: 'continente', label: 'Continente' }
]

const pct = (v: number) => `${Math.round(v * 100)}%`

export function WorldTab() {
  const params = useAtlas((s) => s.params)
  const world = useAtlas((s) => s.world)
  const setParam = useAtlas((s) => s.setParam)
  const reroll = useAtlas((s) => s.reroll)
  const [seed, setSeed] = useState(params.seed)
  const [seen, setSeen] = useState(params.seed)

  if (params.seed !== seen) {
    setSeen(params.seed)
    setSeed(params.seed)
  }

  const commitSeed = () => {
    const next = seed.trim().slice(0, 60)
    if (next && next !== params.seed) setParam('seed', next)
    else setSeed(params.seed)
  }

  return (
    <div className={styles.stack}>
      {world && (
        <p className={styles.summary}>
          {world.kingdoms.length} {world.kingdoms.length === 1 ? 'reino' : 'reinos'}, {world.cities.length} cidades e {world.rivers.length} rios
          em {Math.round(world.landRatio * 100)}% de terra firme.
        </p>
      )}

      <div className={styles.seed}>
        <label htmlFor="seed">Semente</label>
        <div>
          <input
            id="seed"
            value={seed}
            spellCheck={false}
            onChange={(e) => setSeed(e.target.value)}
            onBlur={commitSeed}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSeed()
            }}
          />
          <button type="button" onClick={reroll} title="Sortear outra semente">
            <Icon name="dice" />
            Sortear
          </button>
        </div>
        <p>A mesma semente sempre desenha o mesmo mundo.</p>
      </div>

      <Segmented label="Formato" value={params.shape} options={SHAPES} onChange={(v) => setParam('shape', v)} />

      <div className={styles.group}>
        <h3>Terreno</h3>
        <Slider label="Nível do mar" value={params.seaLevel} min={0} max={1} ends={['Mais terra', 'Mais mar']} onChange={(v) => setParam('seaLevel', v)} />
        <Slider label="Montanhas" value={params.mountains} min={0} max={1} format={pct} onChange={(v) => setParam('mountains', v)} />
        <Slider label="Rios" value={params.rivers} min={0} max={1} ends={['Poucos', 'Muitos']} onChange={(v) => setParam('rivers', v)} />
      </div>

      <div className={styles.group}>
        <h3>Clima</h3>
        <Slider label="Umidade" value={params.moisture} min={0} max={1} ends={['Árido', 'Úmido']} onChange={(v) => setParam('moisture', v)} />
        <Slider label="Temperatura" value={params.temperature} min={0} max={1} ends={['Glacial', 'Tropical']} onChange={(v) => setParam('temperature', v)} />
      </div>

      <div className={styles.group}>
        <h3>Povos</h3>
        <Slider label="Cidades" value={params.cities} min={3} max={40} step={1} format={String} onChange={(v) => setParam('cities', v)} />
        <Slider label="Reinos" value={params.kingdoms} min={1} max={8} step={1} format={String} onChange={(v) => setParam('kingdoms', v)} />
      </div>
    </div>
  )
}
