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
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f3f7' }}>
      <Header hasResult={!!result} onReset={handleReset} />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────── */}
        {showHero && (
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #4f345a 0%, #5d4e6d 55%, #7a6b8a 100%)',
            }}
          >
            {/* Subtle dot grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'radial-gradient(circle, #c9f299 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />

            <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 bg-[#c9f299]/10 border border-[#c9f299]/20 rounded-full px-4 py-1.5 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9f299] animate-pulse" />
                <span className="text-[#c9f299] text-xs font-bold uppercase tracking-widest">Expert AI Analysis</span>
                <span className="text-[#8fa998] text-xs">10 criteria</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-[1.1] tracking-tight">
                Your AI Buyers Agent<br />
                <span style={{ color: '#c9f299' }}>Before You Buy</span>
              </h1>

              {/* Sub */}
              <p className="text-[#9cbfa7] text-lg sm:text-xl mb-10 leading-relaxed max-w-xl mx-auto">
                Paste any Australian address. We'll evaluate orientation, flood risk, zoning,
                school catchments, capital growth and more — in seconds.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {FEATURES.map(f => (
                  <span
                    key={f.label}
                    className="flex items-center gap-1.5 text-xs text-white/70 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 px-3 py-1.5 rounded-full transition-colors duration-150"
                  >
                    <span>{f.emoji}</span>
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Wave transition to form */}
            <div className="h-10 relative">
              <svg
                viewBox="0 0 1440 40"
                className="absolute bottom-0 w-full"
                preserveAspectRatio="none"
                style={{ fill: '#f5f3f7' }}
              >
                <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" />
              </svg>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div className="max-w-3xl mx-auto px-4 mt-6">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-rose-800 mb-1">Assessment Failed</h3>
                <p className="text-sm text-rose-700 leading-relaxed">{error}</p>
                <button onClick={() => setError(null)} className="mt-2 text-sm font-semibold text-rose-600 hover:text-rose-800 underline underline-offset-2">
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── States ───────────────────────────────────────────── */}
        {isLoading && <LoadingProgress address={submittedAddress} />}

        {!isLoading && !result && <PropertyForm onSubmit={handleSubmit} isLoading={isLoading} />}

        {!isLoading && result && <ResultsLayout result={result} address={submittedAddress} />}

      </main>
    </div>
  )
}
