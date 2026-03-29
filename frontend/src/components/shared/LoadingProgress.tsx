import { useEffect, useState } from 'react'

interface Stage {
  label: string
  emoji: string
  targetPct: number
  durationMs: number
}

const STAGES: Stage[] = [
  { label: 'Geocoding address', emoji: '📍', targetPct: 8, durationMs: 700 },
  { label: 'Finding schools, transport & parks', emoji: '🏫', targetPct: 24, durationMs: 1800 },
  { label: 'Analysing walkability & local amenities', emoji: '🚶', targetPct: 40, durationMs: 2800 },
  { label: 'Checking flood & bushfire risk', emoji: '🌊', targetPct: 53, durationMs: 1600 },
  { label: 'Fetching Domain property data', emoji: '🏠', targetPct: 63, durationMs: 1200 },
  { label: 'Gathering suburb market statistics', emoji: '📊', targetPct: 72, durationMs: 1000 },
  { label: 'Running AI expert analysis', emoji: '🤖', targetPct: 94, durationMs: 16000 },
  { label: 'Finalising your report', emoji: '✅', targetPct: 99, durationMs: 4000 },
]

interface LoadingProgressProps {
  address: string
}

export default function LoadingProgress({ address }: LoadingProgressProps) {
  const [stageIdx, setStageIdx] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    setPct(0)
    setStageIdx(0)
  }, [])

  useEffect(() => {
    const stage = STAGES[stageIdx]
    if (!stage) return

    const prevPct = stageIdx === 0 ? 0 : STAGES[stageIdx - 1].targetPct
    const targetPct = stage.targetPct
    const steps = 40
    const stepDuration = stage.durationMs / steps
    const pctPerStep = (targetPct - prevPct) / steps

    let step = 0
    const interval = setInterval(() => {
      step++
      setPct(prevPct + step * pctPerStep)
      if (step >= steps) {
        clearInterval(interval)
        if (stageIdx < STAGES.length - 1) {
          setStageIdx(i => i + 1)
        }
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [stageIdx])

  const stage = STAGES[Math.min(stageIdx, STAGES.length - 1)]
  const isAIStage = stageIdx === 6

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Property being assessed */}
      <div className="text-center mb-10">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Assessing</p>
        <p className="text-sm font-semibold text-slate-700 truncate px-4">{address}</p>
      </div>

      {/* Animated stage icon */}
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm animate-pulse">
          {stage.emoji}
        </div>
      </div>

      {/* Current stage label */}
      <p className="text-center text-sm font-medium text-slate-700 mb-5">
        {stage.label}<span className="animate-[ellipsis_1.5s_steps(4,end)_infinite]">...</span>
      </p>

      {/* Progress bar */}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-300 ease-linear"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
          }}
        />
      </div>

      {/* Percentage + step count */}
      <div className="flex justify-between text-xs text-slate-400 mb-8">
        <span>{Math.round(pct)}% complete</span>
        <span>Step {Math.min(stageIdx + 1, STAGES.length)} of {STAGES.length}</span>
      </div>

      {/* Stage dots */}
      <div className="flex justify-center gap-1.5 mb-8">
        {STAGES.map((s, i) => (
          <div
            key={i}
            title={s.label}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < stageIdx
                ? 'w-4 bg-blue-500'
                : i === stageIdx
                ? 'w-6 bg-blue-600'
                : 'w-1.5 bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* AI stage notice */}
      {isAIStage && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-blue-800 mb-1">
            🤖 AI Expert Analysis Running
          </p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Claude is evaluating 10 property criteria including orientation, noise, zoning,
            flood risk, neighbourhood quality, and capital growth signals.
          </p>
          <p className="text-xs text-blue-500 mt-2 font-medium">
            This takes 15–25 seconds — your detailed expert report is worth the wait.
          </p>
        </div>
      )}

      {/* Completed stages list */}
      {stageIdx > 0 && (
        <div className="mt-6 space-y-1.5">
          {STAGES.slice(0, stageIdx).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
