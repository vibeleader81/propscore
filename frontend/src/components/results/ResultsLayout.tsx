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
import PropertyListingsPanel from './PropertyListingsPanel'

interface ResultsLayoutProps {
  result: AssessmentResponse
  address: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:    '#09172a',
  deepBlue:'#173753',
  mid:     '#1b4353',
  sky:     '#6daedb',
  blue:    '#2892d7',
  blueMid: '#5ba3d0',
  page:    '#f0f5f9',
  white:   '#ffffff',
  slate:   '#334155',
  muted:   '#64748b',
  border:  '#e2ecf4',
}

// ─── Section title with ghost ordinal ────────────────────────────────────────
function SectionTitle({ children, mono }: { children: React.ReactNode; mono?: string }) {
  return (
    <div style={{ position: 'relative', marginBottom: 24, paddingTop: 4 }}>
      {/* Ghost ordinal number behind */}
      {mono && (
        <span style={{
          position: 'absolute',
          top: -28,
          left: -8,
          fontFamily: "'Playfair Display', serif",
          fontSize: 88,
          lineHeight: 1,
          color: 'rgba(40,146,215,0.045)',
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: '-0.04em',
        }}>
          {mono.padStart(2, '0')}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {mono && (
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            color: C.blue,
            letterSpacing: '0.2em',
            opacity: 0.6,
            flexShrink: 0,
          }}>
            {mono.padStart(2, '0')}
          </span>
        )}
        <h2 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: C.mid,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          margin: 0,
          flexShrink: 0,
        }}>
          {children}
        </h2>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(40,146,215,0.25), transparent)` }} />
      </div>
    </div>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight, accent }: {
  label: string; value: string; sub?: string; highlight?: boolean; accent?: string
}) {
  const isHighlight = highlight
  return (
    <div style={{
      borderRadius: 14,
      padding: '16px 18px',
      textAlign: 'center',
      background: isHighlight
        ? `linear-gradient(145deg, ${C.deepBlue} 0%, ${C.navy} 100%)`
        : C.white,
      borderTop: `3px solid ${isHighlight ? C.blue : (accent ?? C.border)}`,
      boxShadow: isHighlight
        ? '0 4px 20px rgba(9,23,42,0.25)'
        : '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <p style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: isHighlight ? C.sky : C.muted,
        marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1,
        color: isHighlight ? C.blue : '#0f2336',
        letterSpacing: '-0.02em',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          marginTop: 5,
          color: isHighlight ? 'rgba(109,174,219,0.6)' : C.muted,
          letterSpacing: '0.06em',
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function ResultsLayout({ result, address }: ResultsLayoutProps) {
  const ai = result.ai_analysis
  const hasAI = ai?.available === true

  const displayScore = hasAI && ai.composite_score != null ? ai.composite_score : result.overall_score
  const displayBand  = hasAI && ai.has_critical_veto ? 'Not Recommended' : result.band
  const isVeto       = hasAI && ai.has_critical_veto

  return (
    <div style={{
      maxWidth: 960,
      margin: '0 auto',
      padding: '40px 20px 64px',
      background: C.page,
      animation: 'fadeIn 0.4s ease-out',
    }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="section-reveal" style={{
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 28,
        position: 'relative',
        background: `linear-gradient(150deg, ${C.navy} 0%, ${C.deepBlue} 50%, #0d2232 100%)`,
        boxShadow: '0 8px 40px rgba(9,23,42,0.3)',
      }}>
        {/* Blueprint dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.07,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='1.2' fill='%232892d7'/%3E%3C/svg%3E\")",
          backgroundSize: '48px 48px',
        }} />

        {/* Diagonal light accent */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(125deg, rgba(40,146,215,0.04) 0%, transparent 60%)',
        }} />

        {/* Veto banner */}
        {isVeto && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))',
            borderBottom: '1px solid rgba(220,38,38,0.2)',
            padding: '10px 28px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#ef4444"/>
            </svg>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#fca5a5', letterSpacing: '0.12em' }}>
              CRITICAL VETO TRIGGERED — PROCEED WITH EXTREME CAUTION
            </span>
          </div>
        )}

        {/* Hero body */}
        <div style={{ padding: '28px 32px 32px', position: 'relative' }}>
          {/* Top meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.sky, letterSpacing: '0.2em', opacity: 0.7 }}>
              ◈ ASSESSED PROPERTY
            </span>
            {hasAI && (
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 8, letterSpacing: '0.12em',
                padding: '3px 8px', borderRadius: 4,
                background: 'rgba(40,146,215,0.12)',
                color: C.blue,
                border: '1px solid rgba(40,146,215,0.25)',
              }}>
                AI EXPERT
              </span>
            )}
          </div>

          {/* Address + band badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(20px, 3.5vw, 28px)',
                fontWeight: 600,
                color: C.white,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                margin: 0,
              }}>
                {address}
              </h1>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11, color: C.sky, opacity: 0.65,
                marginTop: 8, letterSpacing: '0.06em',
              }}>
                {result.suburb} · {result.state} {result.postcode}
              </p>
            </div>

            {/* Band badge — stamp style */}
            <div style={{
              flexShrink: 0, alignSelf: 'center',
              padding: '8px 18px',
              borderRadius: 8,
              background: isVeto
                ? 'rgba(220,38,38,0.15)'
                : 'rgba(40,146,215,0.14)',
              border: `1.5px solid ${isVeto ? 'rgba(220,38,38,0.35)' : 'rgba(40,146,215,0.3)'}`,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11, fontWeight: 700,
                color: isVeto ? '#fca5a5' : C.blue,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {displayBand}
              </span>
            </div>
          </div>

          {/* Bottom decorative rule */}
          <div style={{
            marginTop: 24,
            height: 1,
            background: 'linear-gradient(90deg, rgba(40,146,215,0.2), rgba(40,146,215,0.06) 60%, transparent)',
          }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12,
          }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(109,174,219,0.3)', letterSpacing: '0.15em' }}>
              PROPSCORE INTELLIGENCE BRIEF
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'rgba(109,174,219,0.3)', letterSpacing: '0.1em' }}>
              {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ── SCORE + STATS ─────────────────────────────────────────────────── */}
      <div className="section-reveal-1" style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 20,
        alignItems: 'center',
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ScoreGauge score={displayScore} band={displayBand} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatCard
            label="Monthly Repayment"
            value={formatCurrency(result.monthly_repayment)}
            sub="estimated P&I"
          />
          <StatCard
            label="Borrowing Capacity"
            value={formatCurrency(result.borrowing_capacity)}
            sub="based on income"
          />
          <StatCard
            label="Expert Score"
            value={`${Math.round(displayScore)}/100`}
            sub={hasAI ? 'AI composite' : 'composite'}
            highlight
          />
          {result.deposit > 0 && (
            <StatCard
              label="Deposit"
              value={formatCurrency(result.deposit)}
              sub={result.lmi_required ? '⚠ LMI required' : '✓ No LMI'}
              accent={result.lmi_required ? '#fbbf24' : '#34d399'}
            />
          )}
          {result.deposit > 0 && (
            <StatCard
              label="LVR"
              value={`${result.lvr_pct.toFixed(1)}%`}
              sub={result.lmi_required ? 'above 80%' : 'below 80%'}
              accent={result.lmi_required ? '#fbbf24' : '#34d399'}
            />
          )}
          <StatCard
            label="Location Score"
            value={`${result.pillars.location.score}/100`}
            sub="location pillar"
          />
        </div>
      </div>

      {/* ── EXPERT VERDICT ────────────────────────────────────────────────── */}
      <section className="section-reveal-2" style={{ marginBottom: 36 }}>
        <SectionTitle mono="1">
          {hasAI && ai.verdict ? 'Expert Agent Verdict' : 'Buyers Agent Perspective'}
        </SectionTitle>
        {hasAI && ai.verdict ? (
          <div style={{
            background: C.white,
            borderRadius: 16,
            borderLeft: `4px solid ${C.sky}`,
            padding: '28px 32px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 16px rgba(27,67,83,0.06)',
          }}>
            {/* Decorative quote mark */}
            <div style={{
              position: 'absolute', top: 16, right: 20,
              fontFamily: "'Playfair Display', serif",
              fontSize: 100,
              lineHeight: 1,
              color: 'rgba(40,146,215,0.05)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}>
              "
            </div>
            {ai.verdict.split('\n\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                lineHeight: 1.75,
                color: C.slate,
                marginTop: i > 0 ? 16 : 0,
              }}>
                {para}
              </p>
            ))}
          </div>
        ) : (
          <BuyersAgentSummary summary={result.buyers_agent_summary} />
        )}
      </section>

      {/* ── FLAGS ─────────────────────────────────────────────────────────── */}
      <section className="section-reveal-3" style={{ marginBottom: 36 }}>
        <SectionTitle mono="2">Risk & Opportunity Flags</SectionTitle>
        {hasAI && ai.flags.length > 0 ? (
          <ExpertFlagsPanel flags={ai.flags} hasVeto={ai.has_critical_veto} vetoReasons={ai.veto_reasons} />
        ) : (
          <FlagsPanel redFlags={result.red_flags} greenFlags={result.green_flags} />
        )}
      </section>

      {/* ── SCORE BREAKDOWN ───────────────────────────────────────────────── */}
      <section className="section-reveal-3" style={{ marginBottom: 36 }}>
        <SectionTitle mono="3">Score Breakdown</SectionTitle>
        {hasAI && ai.dimension_scores && ai.composite_score != null ? (
          <DimensionScores scores={ai.dimension_scores} compositeScore={ai.composite_score} />
        ) : (
          <PillarGrid pillars={result.pillars} />
        )}
      </section>

      {/* ── NEARBY AMENITIES ──────────────────────────────────────────────── */}
      <section className="section-reveal-4" style={{ marginBottom: 36 }}>
        <SectionTitle mono="4">Nearby Amenities</SectionTitle>
        <NearbyPOIs pois={result.nearby_pois} />
      </section>

      {/* ── ALTERNATIVES ──────────────────────────────────────────────────── */}
      {(result.alternative_listings && result.alternative_listings.length > 0) ? (
        <section className="section-reveal-5" style={{ marginBottom: 36 }}>
          <SectionTitle mono="5">Properties Worth Considering</SectionTitle>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, color: C.muted, letterSpacing: '0.08em',
            marginBottom: 16, marginTop: -16,
          }}>
            LIVE LISTINGS FROM DOMAIN.COM.AU
          </p>
          <PropertyListingsPanel listings={result.alternative_listings} />
        </section>
      ) : result.alternatives.length > 0 && (
        <section className="section-reveal-5" style={{ marginBottom: 36 }}>
          <SectionTitle mono="5">Consider These Alternatives</SectionTitle>
          <AlternativesPanel alternatives={result.alternatives} />
        </section>
      )}

      {/* ── DATA GAPS ─────────────────────────────────────────────────────── */}
      {hasAI && ai.data_gaps.length > 0 && (
        <section className="section-reveal-6" style={{ marginBottom: 36 }}>
          <SectionTitle mono="6">Data Gaps — Verify Manually</SectionTitle>
          <div style={{
            background: '#fffbeb',
            border: '1px solid rgba(245,158,11,0.3)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 12,
            padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#d97706"/>
              </svg>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, color: '#92400e', letterSpacing: '0.16em', fontWeight: 700,
              }}>
                COULD NOT BE ASSESSED — VERIFY BEFORE EXCHANGE
              </span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ai.data_gaps.map((gap, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11, color: '#b45309', flexShrink: 0, marginTop: 1,
                  }}>›</span>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13, color: '#78350f', lineHeight: 1.5,
                  }}>
                    {gap}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(40,146,215,0.1)',
        paddingTop: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 20, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(40,146,215,0.3))',
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 8, color: C.sky, opacity: 0.4, letterSpacing: '0.2em',
          }}>
            PROPSCORE · AU PROPERTY INTELLIGENCE
          </span>
          <div style={{
            width: 20, height: 1,
            background: 'linear-gradient(90deg, rgba(40,146,215,0.3), transparent)',
          }} />
        </div>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11, color: C.muted, lineHeight: 1.6,
          maxWidth: 480, textAlign: 'center', margin: 0,
        }}>
          AI-generated analysis for informational purposes only. Not financial advice.
          Always consult a licensed professional before making property investment decisions.
        </p>
      </div>

    </div>
  )
}
