import type { AIDimensionScores } from '../../types'

interface DimensionScoresProps {
  scores: AIDimensionScores
  compositeScore: number
}

const DIMENSIONS = [
  {
    key: 'location_liveability' as const,
    label: 'Location & Liveability',
    emoji: '🏙️',
    max: 25,
    desc: 'Schools, transport, parks, amenities, beach/harbour access',
  },
  {
    key: 'environmental_risk' as const,
    label: 'Environmental Risk',
    emoji: '🌊',
    max: 20,
    desc: 'Flood zone, bushfire, coastal erosion, contamination',
  },
  {
    key: 'property_land_quality' as const,
    label: 'Property & Land Quality',
    emoji: '🏡',
    max: 20,
    desc: 'Block size, orientation, construction, zoning, easements',
  },
  {
    key: 'capital_growth_potential' as const,
    label: 'Capital Growth Potential',
    emoji: '📈',
    max: 20,
    desc: '10yr CAGR, vacancy rate, infrastructure, gentrification signals',
  },
  {
    key: 'neighbourhood_quality' as const,
    label: 'Neighbourhood Quality',
    emoji: '🏘️',
    max: 15,
    desc: 'Owner-occupier ratio, streetscape, social housing proximity',
  },
]

function scoreColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.8) return 'text-emerald-600'
  if (pct >= 0.6) return 'text-green-600'
  if (pct >= 0.4) return 'text-amber-600'
  if (pct >= 0.2) return 'text-orange-600'
  return 'text-rose-600'
}

function barColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.8) return 'bg-emerald-500'
  if (pct >= 0.6) return 'bg-green-500'
  if (pct >= 0.4) return 'bg-amber-500'
  if (pct >= 0.2) return 'bg-orange-500'
  return 'bg-rose-500'
}

export default function DimensionScores({ scores, compositeScore }: DimensionScoresProps) {
  return (
    <div className="space-y-3">
      {DIMENSIONS.map(dim => {
        const data = scores[dim.key]
        if (!data) return null
        const pct = Math.min(100, (data.score / dim.max) * 100)
        return (
          <div key={dim.key} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{dim.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{dim.label}</div>
                  <div className="text-xs text-slate-400">{dim.desc}</div>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`text-xl font-extrabold ${scoreColor(data.score, dim.max)}`}>
                  {data.score}
                </span>
                <span className="text-xs text-slate-400">/{dim.max}</span>
              </div>
            </div>
            {/* Bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor(data.score, dim.max)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Rationale */}
            <p className="text-xs text-slate-500 leading-relaxed">{data.rationale}</p>
          </div>
        )
      })}

      {/* Composite total */}
      <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          ⚖️ Composite Score
        </span>
        <span className="text-2xl font-extrabold text-white">
          {compositeScore}<span className="text-slate-400 text-sm font-normal">/100</span>
        </span>
      </div>
    </div>
  )
}
