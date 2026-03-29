import { useState } from 'react'
import type { AssessmentRequest, AssessmentResponse } from './types'
import { assessProperty } from './api/client'
import Header from './components/layout/Header'
import PropertyForm from './components/input/PropertyForm'
import ResultsLayout from './components/results/ResultsLayout'
import LoadingProgress from './components/shared/LoadingProgress'

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header hasResult={!!result} onReset={handleReset} />

      <main className="flex-1">
        {/* Error banner */}
        {error && !isLoading && (
          <div className="max-w-3xl mx-auto mt-6 mx-4 px-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-rose-800 mb-1">Assessment Failed</h3>
                <p className="text-sm text-rose-700 leading-relaxed">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-sm font-semibold text-rose-600 hover:text-rose-800 underline underline-offset-2 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* States */}
        {isLoading && <LoadingProgress address={submittedAddress} />}

        {!isLoading && !result && (
          <PropertyForm onSubmit={handleSubmit} isLoading={isLoading} />
        )}

        {!isLoading && result && (
          <ResultsLayout result={result} address={submittedAddress} />
        )}
      </main>
    </div>
  )
}
