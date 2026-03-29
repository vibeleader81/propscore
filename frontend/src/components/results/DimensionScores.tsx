import type { AIDimensionScores } from '../../types'

interface DimensionScoresProps {
  scores: AIDimensionScores
  compositeScore: number
}

const DIMENSIONS = [
  {
    key: 'location_liveability' as const,
    label: 'Location & Liveability',
    mono: '01',
    max: 25,
    desc: 'Schools, transport, parks, amenities, beach/harbour access',
  },
  {
    key: 'environmental_risk' as const,
    label: 'Environmental Risk',
    mono: '02',
    max: 20,
    desc: 'Flood zone, bushfire, coastal erosion, contamination',
  },
  {
    key: 'property_land_quality' as const,
    label: 'Property & Land Quality',
    mono: '03',
    max: 20,
    desc: 'Block size, orientation, construction, zoning, easements',
  },
  {
    key: 'capital_growth_potential' as const,
    label: 'Capital Growth Potential',
    mono: '04',
    max: 20,
    desc: '10yr CAGR, vacancy rate, infrastructure, gentrification signals',
  },
  {
    key: 'neighbourhood_quality' as const,
    label: 'Neighbourhood Quality',
    mono: '05',
    max: 15,
    desc: 'Owner-occupier ratio, streetscape, social housing proximity',
  },
]

function barGradient(score: number, max: number): string {
  const pct = score / max
  if (pct >= 0.8) return 'linear-gradient(90deg, #8fa998, #c9f299)'
  if (pct >= 0.6) return 'linear-gradient(90deg, #8fa998, #86efac)'
  if (pct >= 0.4) return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  if (pct >= 0.2) return 'linear-gradient(90deg, #f97316, #fb923c)'
  return 'linear-gradient(90deg, #f43f5e, #fb7185)'
}

function scoreColor(score: number, max: number): string {
  const pct = score / max
  if (pct >= 0.8) return '#c9f299'
  if (pct >= 0.6) return '#8fa998'
  if (pct >= 0.4) return '#f59e0b'
  if (pct >= 0.2) return '#f97316'
  return '#f43f5e'
}

export default function DimensionScores({ scores, compositeScore }: DimensionScoresProps) {
  return (
    <div className="space-y-3">
      {DIMENSIONS.map(dim => {
        const data = scores[dim.key]
        if (!data) return null
        const pct = Math.min(100, (data.score / dim.max) * 100)
        return (
          <div
            key={dim.key}
            className="rounded-xl overflow-hidden"
            style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', borderLeft: `3px solid ${scoreColor(data.score, dim.max)}` }}
          >
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <span
                    className="text-xs mt-0.5 flex-shrink-0"
                    style={{ color: '#cbd5e1', fontFamily: "'DM Mono', monospace" }}
                  >
                    {dim.mono}
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#1e293b', fontFamily: "'DM Sans', sans-serif" }}>
                      {dim.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                      {dim.desc}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className="font-extrabold leading-none"
                    style={{ fontSize: 22, color: scoreColor(data.score, dim.max), fontFamily: "'Fraunces', serif" }}
                  >
                    {data.score}
                  </span>
                  <span className="text-xs" style={{ color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                    /{dim.max}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: '#f1f5f9' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: barGradient(data.score, dim.max),
                    transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
              </div>

              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                {data.rationale}
              </p>
            </div>
          </div>
        )
      })}

      {/* Composite total */}
      <div
        className="rounded-xl px-6 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #3a2444 0%, #4f345a 100%)', borderTop: '3px solid #c9f299' }}
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>
          Composite Score
        </span>
        <span style={{ fontFamily: "'Fraunces', serif" }}>
          <span className="font-extrabold" style={{ fontSize: 28, color: '#c9f299' }}>{compositeScore}</span>
          <span className="text-sm" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>/100</span>
        </span>
      </div>
    </div>
  )
}
