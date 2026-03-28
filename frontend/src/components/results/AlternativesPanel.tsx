import type { AlternativeSuburb } from '../../types'
import { formatShortCurrency, formatPercent } from '../../utils/formatters'

interface AlternativesPanelProps {
  alternatives: AlternativeSuburb[]
}

function ScoreDeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        +{delta} pts better
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      {delta} pts
    </span>
  )
}

function AlternativeCard({ alt }: { alt: AlternativeSuburb }) {
  const domainUrl = `https://www.domain.com.au/sale/?suburb=${encodeURIComponent(alt.suburb.toLowerCase())}&state=${alt.state.toLowerCase()}`

  return (
    <div className="flex-shrink-0 w-64 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">{alt.suburb}</p>
            <p className="text-xs text-slate-500">{alt.state} {alt.postcode}</p>
          </div>
          <ScoreDeltaBadge delta={alt.score_delta} />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2 border-b border-slate-100">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Median Price</p>
          <p className="text-sm font-bold text-slate-800">{formatShortCurrency(alt.median_price)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">10yr Growth</p>
          <p className="text-sm font-bold text-emerald-600">{formatPercent(alt.ten_year_growth)} pa</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Gross Yield</p>
          <p className="text-sm font-bold text-blue-600">{formatPercent(alt.gross_yield)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Distance</p>
          <p className="text-sm font-bold text-slate-700">{alt.distance_km.toFixed(1)}km away</p>
        </div>
      </div>

      {/* Rationale */}
      <div className="px-4 py-3 flex-1">
        <p className="text-xs text-slate-500 italic leading-relaxed">{alt.rationale}</p>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <a
          href={domainUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors border border-blue-100"
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
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-slate-800">Consider These Alternatives</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {alternatives.length} suburb{alternatives.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
        {alternatives.map((alt, i) => (
          <div key={i} className="snap-start">
            <AlternativeCard alt={alt} />
          </div>
        ))}
      </div>
    </div>
  )
}
