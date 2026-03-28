import type { Pillars } from '../../types'
import ScorePillar from './ScorePillar'

interface PillarGridProps {
  pillars: Pillars
}

const PILLAR_META: { key: keyof Pillars; title: string; icon: string }[] = [
  { key: 'location', title: 'Location', icon: '📍' },
  { key: 'affordability', title: 'Affordability', icon: '💰' },
  { key: 'features', title: 'Features', icon: '🏠' },
  { key: 'suburb_quality', title: 'Suburb Quality', icon: '📈' },
  { key: 'investment', title: 'Investment', icon: '💼' },
]

export default function PillarGrid({ pillars }: PillarGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {PILLAR_META.map(({ key, title, icon }) => {
        const pillar = pillars[key]
        return (
          <ScorePillar
            key={key}
            title={title}
            score={pillar.score}
            sub_scores={pillar.sub_scores}
            insights={pillar.insights}
            icon={icon}
          />
        )
      })}
    </div>
  )
}
