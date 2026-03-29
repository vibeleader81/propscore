import { useState } from 'react'
import type { AssessmentRequest, AssessmentResponse } from './types'
import { assessProperty } from './api/client'
import Header from './components/layout/Header'
import PropertyForm from './components/input/PropertyForm'
import ResultsLayout from './components/results/ResultsLayout'
import LoadingProgress from './components/shared/LoadingProgress'

const FEATURES = [
  { emoji: '🚩', label: 'Deal-breaker detection' },
  { emoji: '🏫', label: 'School catchments' },
  { emoji: '🌊', label: 'Flood & fire risk' },
  { emoji: '📊', label: 'Domain.com.au data' },
  { emoji: '📈', label: 'Capital growth signals' },
  { emoji: '🤖', label: 'AI expert verdict' },
]

export default function App() {
  const [result, setResult] = useState<AssessmentResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedAddress, setSubmittedAddress] = useState('')

  const handleSubmit = async (data: AssessmentRequest) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setSubmittedAddress(data.address)
    try {
      const response = await assessProperty(data)
      setResult(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setSubmittedAddress('')
  }

  const showHero = !result && !isLoading

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f5f9' }}>
      <Header hasResult={!!result} onReset={handleReset} />

      <main className="flex-1">

        {/* ── HERO ─────────────────────────────── */}
        {showHero && (
          <div
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, #6b4d78 0%, #4f345a 50%, #3a2444 100%)',
              position: 'relative',
              overflow: 'hidden',
              paddingTop: '88px',
              paddingBottom: '100px',
            }}
          >
            {/* Blueprint survey grid */}
            <div className="blueprint-grid" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

            {/* Radial lime glow from top */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 900px 350px at 50% -80px, rgba(201,242,153,0.05) 0%, transparent 70%)',
            }} />

            {/* Corner coordinate labels */}
            <div style={{
              position: 'absolute', top: '20px', left: '24px',
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              color: 'rgba(143,169,152,0.35)',
              letterSpacing: '0.06em',
              userSelect: 'none',
            }}>
              33°52′S 151°12′E
            </div>
            <div style={{
              position: 'absolute', top: '20px', right: '24px',
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              color: 'rgba(143,169,152,0.35)',
              letterSpacing: '0.06em',
              userSelect: 'none',
            }}>
              GRID REF AU-2024
            </div>

            {/* Central content */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>

              {/* Intelligence badge */}
              <div
                className="animate-fade-up"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(201,242,153,0.07)',
                  border: '1px solid rgba(201,242,153,0.14)',
                  borderRadius: '100px',
                  padding: '8px 18px',
                  marginBottom: '40px',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9f299', boxShadow: '0 0 8px rgba(201,242,153,0.7)' }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#c9f299', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                  Property Intelligence Platform
                </span>
                <span style={{ width: '1px', height: '11px', background: 'rgba(201,242,153,0.18)' }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#8fa998', letterSpacing: '0.08em' }}>
                  10 criteria
                </span>
              </div>

              {/* Main headline */}
              <h1
                className="animate-fade-up-delay-1"
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 'clamp(52px, 9vw, 88px)',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1.0,
                  letterSpacing: '-0.035em',
                  marginBottom: '28px',
                }}
              >
                Know Before<br />
                <em style={{ fontStyle: 'italic', color: '#c9f299' }}>You Offer</em>
              </h1>

              {/* Subhead */}
              <p
                className="animate-fade-up-delay-2"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 'clamp(16px, 2.5vw, 19px)',
                  color: 'rgba(156,191,167,0.85)',
                  lineHeight: 1.65,
                  maxWidth: '500px',
                  margin: '0 auto 52px',
                  fontWeight: 400,
                }}
              >
                Expert-grade Australian property analysis in seconds — flood risk, zoning, capital growth, school catchments, and one decisive verdict.
              </p>

              {/* Feature pills */}
              <div
                className="animate-fade-up-delay-3"
                style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}
              >
                {FEATURES.map(f => (
                  <span
                    key={f.label}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.55)',
                      background: 'rgba(255,255,255,0.055)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '7px 14px',
                      borderRadius: '100px',
                    }}
                  >
                    {f.emoji} {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom bleed into form */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
              background: 'linear-gradient(to bottom, transparent, #f7f5f9)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* ── ERROR ─────────────────────────────── */}
        {error && !isLoading && (
          <div style={{ maxWidth: '720px', margin: '24px auto 0', padding: '0 24px' }}>
            <div style={{
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
            }}>
              <div style={{ width: '36px', height: '36px', background: '#fff0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="#e53e3e">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#c53030', marginBottom: '4px', fontSize: '14px' }}>Assessment Failed</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#742a2a', fontSize: '13px', lineHeight: 1.5 }}>{error}</div>
                <button onClick={() => setError(null)} style={{ marginTop: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#c53030', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── LOADING ───────────────────────────── */}
        {isLoading && <LoadingProgress address={submittedAddress} />}

        {/* ── FORM ──────────────────────────────── */}
        {!isLoading && !result && <PropertyForm onSubmit={handleSubmit} isLoading={isLoading} />}

        {/* ── RESULTS ───────────────────────────── */}
        {!isLoading && result && <ResultsLayout result={result} address={submittedAddress} />}

      </main>
    </div>
  )
}
