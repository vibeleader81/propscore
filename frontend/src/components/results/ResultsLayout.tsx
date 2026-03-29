import type { AssessmentResponse } from '../../types'
import { formatCurrency } from '../../utils/formatters'
import ScoreGauge from './ScoreGauge'
import BuyersAgentSummary from './BuyersAgentSummary'
import FlagsPanel from './FlagsPanel'
import ExpertFlagsPanel from './ExpertFlagsPanel'
import DimensionScores from './DimensionScores'
import PillarGrid from './PillarGrid'
import NearbyPOIs from './NearbyPOIs'
import AlternativesPanel from './AlternativesPanel'

interface ResultsLayoutProps {
  result: AssessmentResponse
  address: string
}

function SectionTitle({ children, mono }: { children: React.ReactNode; mono?: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-5">
      {mono && (
        <span className="font-mono text-xs tracking-[0.2em] uppercase opacity-30 flex-shrink-0" style={{ color: '#4f345a' }}>
          {mono}
        </span>
      )}
      <h2 className="text-base font-bold uppercase tracking-widest" style={{ color: '#4f345a', fontFamily: "'DM Sans', sans-serif" }}>
        {children}
      </h2>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #c9f299 0%, transparent 100%)' }} />
    </div>
  )
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl px-5 py-4 text-center"
      style={{
        background: highlight ? 'linear-gradient(135deg, #4f345a 0%, #3a2444 100%)' : 'white',
        borderTop: `3px solid ${highlight ? '#c9f299' : '#e2e8f0'}`,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: highlight ? '#8fa998' : '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
        {label}
      </p>
      <p className="text-xl font-extrabold leading-none" style={{ color: highlight ? '#c9f299' : '#1e293b', fontFamily: "'Fraunces', serif" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: highlight ? '#8fa998' : '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
          {sub}
        </p>
      )}
    </div>
  )
}

export default function ResultsLayout({ result, address }: ResultsLayoutProps) {
  const ai = result.ai_analysis
  const hasAI = ai?.available === true

  const displayScore = hasAI && ai.composite_score != null ? ai.composite_score : result.overall_score
  const displayBand = hasAI && ai.has_critical_veto ? 'Not Recommended' : result.band

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-[fadeIn_0.4s_ease-out]">

      {/* Address hero */}
      <div
        className="rounded-2xl px-7 py-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3a2444 0%, #4f345a 60%, #2d1a36 100%)' }}
      >
        {/* Blueprint grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle fill='%23c9f299' cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>
                ◈ Assessed Property
              </span>
              {hasAI && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: 'rgba(201,242,153,0.15)', color: '#c9f299', border: '1px solid rgba(201,242,153,0.3)', fontFamily: "'DM Mono', monospace" }}
                >
                  AI Expert
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white leading-snug truncate" style={{ fontFamily: "'Fraunces', serif" }}>
              {address}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>
              {result.suburb} · {result.state} {result.postcode}
            </p>
          </div>
          <div
            className="px-5 py-2 rounded-lg font-bold text-sm flex-shrink-0 self-start sm:self-center"
            style={{ background: '#c9f299', color: '#3a2444', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em' }}
          >
            {displayBand}
          </div>
        </div>
      </div>

      {/* Score gauge + stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-1 flex justify-center">
          <ScoreGauge score={displayScore} band={displayBand} />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Monthly Repayment" value={formatCurrency(result.monthly_repayment)} sub="estimated P&I" />
          <StatCard label="Borrowing Capacity" value={formatCurrency(result.borrowing_capacity)} sub="based on income" />
          <StatCard label="Expert Score" value={`${Math.round(displayScore)}/100`} sub={hasAI ? 'AI composite' : 'composite'} highlight />
          {result.deposit > 0 && (
            <StatCard label="Deposit" value={formatCurrency(result.deposit)} sub={result.lmi_required ? '⚠ LMI required' : '✓ No LMI'} />
          )}
          {result.deposit > 0 && (
            <StatCard label="LVR" value={`${result.lvr_pct.toFixed(1)}%`} sub={result.lmi_required ? 'above 80%' : 'below 80% — clean'} />
          )}
          <StatCard label="Location Score" value={`${result.pillars.location.score}/100`} sub="location pillar" />
        </div>
      </div>

      {/* AI Verdict / Buyers Agent */}
      <div>
        <SectionTitle mono="01">
          {hasAI && ai.verdict ? 'Expert Agent Verdict' : 'Buyers Agent Perspective'}
        </SectionTitle>
        {hasAI && ai.verdict ? (
          <div
            className="rounded-2xl p-7 relative overflow-hidden"
            style={{ background: 'white', borderLeft: '4px solid #8fa998', boxShadow: '0 2px 12px rgba(79,52,90,0.06)' }}
          >
            <div
              className="absolute top-5 right-6 font-serif text-7xl leading-none select-none pointer-events-none"
              style={{ color: '#f1f5f9', fontFamily: "'Fraunces', serif" }}
            >
              "
            </div>
            {ai.verdict.split('\n\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className={`text-sm leading-relaxed ${i > 0 ? 'mt-4' : ''}`} style={{ color: '#334155' }}>
                {para}
              </p>
            ))}
          </div>
        ) : (
          <BuyersAgentSummary summary={result.buyers_agent_summary} />
        )}
      </div>

      {/* Flags */}
      <div>
        <SectionTitle mono="02">Risk & Opportunity Flags</SectionTitle>
        {hasAI && ai.flags.length > 0 ? (
          <ExpertFlagsPanel flags={ai.flags} hasVeto={ai.has_critical_veto} vetoReasons={ai.veto_reasons} />
        ) : (
          <FlagsPanel redFlags={result.red_flags} greenFlags={result.green_flags} />
        )}
      </div>

      {/* Score Breakdown */}
      <div>
        <SectionTitle mono="03">Score Breakdown</SectionTitle>
        {hasAI && ai.dimension_scores && ai.composite_score != null ? (
          <DimensionScores scores={ai.dimension_scores} compositeScore={ai.composite_score} />
        ) : (
          <PillarGrid pillars={result.pillars} />
        )}
      </div>

      {/* Nearby POIs */}
      <div>
        <SectionTitle mono="04">Nearby Amenities</SectionTitle>
        <NearbyPOIs pois={result.nearby_pois} />
      </div>

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div>
          <SectionTitle mono="05">Consider These Alternatives</SectionTitle>
          <AlternativesPanel alternatives={result.alternatives} />
        </div>
      )}

      {/* Data Gaps */}
      {hasAI && ai.data_gaps.length > 0 && (
        <div>
          <SectionTitle mono="06">Data Gaps — Verify Manually</SectionTitle>
          <div
            className="rounded-xl p-5"
            style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
          >
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#92400e', fontFamily: "'DM Mono', monospace" }}>
              Could not be assessed from available data — check before proceeding:
            </p>
            <ul className="space-y-2">
              {ai.data_gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#78350f' }}>
                  <span className="mt-0.5 flex-shrink-0 font-mono">›</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-2 pb-6">
        <div className="inline-block px-4 py-1 rounded-full mb-3" style={{ background: '#f8f7f9' }}>
          <span className="text-xs" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>PROPSCORE · AU PROPERTY INTELLIGENCE</span>
        </div>
        <p className="text-xs max-w-lg mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
          AI-generated analysis for informational purposes only. Not financial advice.
          Always consult a licensed professional before making property investment decisions.
        </p>
      </div>
    </div>
  )
}
