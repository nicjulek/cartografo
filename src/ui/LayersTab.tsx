import { useAtlas, type LayerKey } from '../store/atlas'
import { Toggle } from './controls'
import styles from './Panel.module.css'

const LAYERS: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'biomes', label: 'Biomas', hint: 'Aquarelas de florestas, desertos e neves' },
  { key: 'relief', label: 'Relevo', hint: 'Montanhas, colinas, árvores e curvas de nível' },
  { key: 'rivers', label: 'Rios', hint: 'Mais grossos conforme recebem afluentes' },
  { key: 'roads', label: 'Estradas', hint: 'Caminhos que evitam serras e pântanos' },
  { key: 'borders', label: 'Fronteiras', hint: 'Território de cada reino' },
  { key: 'labels', label: 'Nomes', hint: 'Reinos, cidades, mares e lugares marcados' },
  { key: 'graticule', label: 'Grade', hint: 'Linhas de navegação sobre o mar' }
]

export function LayersTab() {
  const layers = useAtlas((s) => s.layers)
  const toggle = useAtlas((s) => s.toggleLayer)
  return (
    <div className={styles.stack}>
      <div>
        {LAYERS.map((l) => (
          <Toggle key={l.key} label={l.label} hint={l.hint} checked={layers[l.key]} onChange={() => toggle(l.key)} />
        ))}
      </div>
    </div>
  )
}
