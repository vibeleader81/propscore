import type { AssessmentResponse } from '../../types'
import { getBandColor, formatCurrency } from '../../utils/formatters'
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      {children}
    </h2>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 text-center">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-extrabold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ResultsLayout({ result, address }: ResultsLayoutProps) {
  const ai = result.ai_analysis
  const hasAI = ai?.available === true

  // Use AI composite score for the gauge if available
  const displayScore = hasAI && ai.composite_score != null ? ai.composite_score : result.overall_score
  const displayBand = hasAI && ai.has_critical_veto ? 'Not Recommended' : result.band

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-[fadeIn_0.4s_ease-out]">

      {/* Address + band hero */}
      <div className="bg-[#0f172a] rounded-2xl px-6 py-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Assessed Property</span>
            </div>
            <h1 className="text-xl font-bold text-white leading-snug truncate">{address}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {result.suburb}, {result.state} {result.postcode}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasAI && (
              <span className="px-2 py-1 rounded-lg bg-blue-900 text-blue-300 text-xs font-semibold">
                🤖 AI Analysis
              </span>
            )}
            <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow ${getBandColor(displayBand)}`}>
              {displayBand}
            </span>
          </div>
        </div>
      </div>

      {/* Score gauge + financial snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-1 flex justify-center">
          <ScoreGauge score={displayScore} band={displayBand} />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Monthly Repayment" value={formatCurrency(result.monthly_repayment)} sub="estimated P&I" />
          <StatCard label="Borrowing Capacity" value={formatCurrency(result.borrowing_capacity)} sub="based on your income" />
          <StatCard label="Overall Score" value={`${Math.round(displayScore)} / 100`} sub={hasAI ? 'AI expert score' : 'composite score'} />
          {result.deposit > 0 && (
            <StatCard label="Deposit" value={formatCurrency(result.deposit)} sub={result.lmi_required ? '⚠️ LMI required' : '✅ No LMI needed'} />
          )}
          {result.deposit > 0 && (
            <StatCard label="LVR" value={`${result.lvr_pct.toFixed(1)}%`} sub={result.lmi_required ? 'above 80% — adds cost' : 'below 80% — clean'} />
          )}
          <StatCard label="Location" value={`${result.pillars.location.score} / 100`} sub="location score" />
        </div>
      </div>

      {/* AI Verdict */}
      {hasAI && ai.verdict ? (
        <div>
          <SectionTitle>
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs">🤖</span>
            Expert Agent Verdict
          </SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            {ai.verdict.split('\n\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className={`text-sm text-slate-700 leading-relaxed ${i > 0 ? 'mt-4' : ''}`}>
                {para}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <SectionTitle>
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs">🤖</span>
            Buyers Agent Perspective
          </SectionTitle>
          <BuyersAgentSummary summary={result.buyers_agent_summary} />
        </div>
      )}

      {/* Flags */}
      <div>
        <SectionTitle>
          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-xs">⚑</span>
          Risk & Opportunity Flags
        </SectionTitle>
        {hasAI && ai.flags.length > 0 ? (
          <ExpertFlagsPanel
            flags={ai.flags}
            hasVeto={ai.has_critical_veto}
            vetoReasons={ai.veto_reasons}
          />
        ) : (
          <FlagsPanel redFlags={result.red_flags} greenFlags={result.green_flags} />
        )}
      </div>

      {/* Score Breakdown */}
      <div>
        <SectionTitle>
          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-xs">📊</span>
          Score Breakdown
        </SectionTitle>
        {hasAI && ai.dimension_scores && ai.composite_score != null ? (
          <DimensionScores scores={ai.dimension_scores} compositeScore={ai.composite_score} />
        ) : (
          <PillarGrid pillars={result.pillars} />
        )}
      </div>

      {/* Nearby POIs */}
      <div>
        <SectionTitle>
          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-xs">📍</span>
          Nearby Amenities
        </SectionTitle>
        <NearbyPOIs pois={result.nearby_pois} />
      </div>

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div>
          <AlternativesPanel alternatives={result.alternatives} />
        </div>
      )}

      {/* Data Gaps */}
      {hasAI && ai.data_gaps.length > 0 && (
        <div>
          <SectionTitle>
            <span className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center text-xs">🔎</span>
            Data Gaps — Verify Manually
          </SectionTitle>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 mb-3 font-medium">
              The following factors could not be assessed from available data. Check these before proceeding:
            </p>
            <ul className="space-y-1.5">
              {ai.data_gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          PropScore provides AI-generated analysis for informational purposes only. This is not financial advice.
          Always consult a licensed professional before making property investment decisions.
        </p>
      </div>
    </div>
  )
}
