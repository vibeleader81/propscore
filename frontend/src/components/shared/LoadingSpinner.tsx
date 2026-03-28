import { useEffect, useState } from 'react'

const steps = [
  'Geocoding address...',
  'Fetching nearby schools & transport...',
  'Calculating suburb scores...',
  'Generating AI insights...',
]

export default function LoadingSpinner() {
  const [visibleSteps, setVisibleSteps] = useState<number>(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleSteps(i + 1)
        }, i * 700)
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Animated ring */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-400 animate-spin" />
        <div className="absolute inset-3 w-18 h-18 flex items-center justify-center">
          <span className="text-3xl">🏠</span>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Analysing Property</h2>
      <p className="text-slate-500 mb-8 text-sm">This takes about 10–20 seconds</p>

      {/* Step indicators */}
      <div className="space-y-3 w-full max-w-xs">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 transition-all duration-500 ${
              i < visibleSteps ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            }`}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                i < visibleSteps ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              {i < visibleSteps && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-medium ${i < visibleSteps ? 'text-slate-700' : 'text-slate-400'}`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
