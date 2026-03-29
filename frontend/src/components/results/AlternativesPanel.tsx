import type { AlternativeSuburb } from '../../types'
import { formatShortCurrency, formatPercent } from '../../utils/formatters'

interface AlternativesPanelProps {
  alternatives: AlternativeSuburb[]
}

function ScoreDeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(201,242,153,0.15)', color: '#c9f299', border: '1px solid rgba(201,242,153,0.3)', fontFamily: "'DM Mono', monospace" }}
      >
        ↑ +{delta}pts
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)', fontFamily: "'DM Mono', monospace" }}
    >
      ↓ {delta}pts
    </span>
  )
}

function AlternativeCard({ alt }: { alt: AlternativeSuburb }) {
  const domainUrl = `https://www.domain.com.au/sale/?suburb=${encodeURIComponent(alt.suburb.toLowerCase())}&state=${alt.state.toLowerCase()}`

  return (
    <div
      className="flex-shrink-0 w-64 rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(160deg, #3a2444 0%, #4f345a 100%)', border: '1px solid rgba(201,242,153,0.15)', boxShadow: '0 4px 20px rgba(58,36,68,0.3)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(201,242,153,0.1)' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-white leading-tight" style={{ fontFamily: "'Fraunces', serif", fontSize: 16 }}>
              {alt.suburb}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>
              {alt.state} · {alt.postcode}
            </p>
          </div>
          <ScoreDeltaBadge delta={alt.score_delta} />
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b" style={{ borderColor: 'rgba(201,242,153,0.1)' }}>
        <div>
          <p className="text-xs mb-1" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>Median Price</p>
          <p className="font-extrabold text-white" style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>
            {formatShortCurrency(alt.median_price)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>10yr Growth</p>
          <p className="font-bold" style={{ color: '#c9f299', fontFamily: "'Fraunces', serif", fontSize: 15 }}>
            {formatPercent(alt.ten_year_growth)} pa
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>Gross Yield</p>
          <p className="font-bold text-white" style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>
            {formatPercent(alt.gross_yield)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>Distance</p>
          <p className="font-bold text-white" style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>
            {alt.distance_km.toFixed(1)}km
          </p>
        </div>
      </div>

      {/* Rationale */}
      <div className="px-5 py-4 flex-1">
        <p className="text-xs leading-relaxed italic" style={{ color: '#8fa998' }}>{alt.rationale}</p>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <a
          href={domainUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
          style={{ background: '#c9f299', color: '#3a2444', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em' }}
        >
          Search on Domain
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default function AlternativesPanel({ alternatives }: AlternativesPanelProps) {
  if (alternatives.length === 0) return null

  return (
    <div className="flex gap-5 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
      {alternatives.map((alt, i) => (
        <div key={i} className="snap-start">
          <AlternativeCard alt={alt} />
        </div>
      ))}
    </div>
  )
}
