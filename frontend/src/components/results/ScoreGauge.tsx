import { useEffect, useRef, useState } from 'react'
import type { AssessmentBand } from '../../types'

interface ScoreGaugeProps {
  score: number
  band: AssessmentBand
}

function getArcColor(score: number): string {
  if (score >= 80) return '#10b981' // emerald-500
  if (score >= 65) return '#22c55e' // green-500
  if (score >= 50) return '#f59e0b' // amber-500
  if (score >= 35) return '#f97316' // orange-500
  return '#f43f5e' // rose-500
}

function getBandBg(band: string): string {
  switch (band) {
    case 'Exceptional': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'Strong Buy': return 'bg-green-100 text-green-800 border-green-200'
    case 'Consider with Caution': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Significant Concerns': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'Not Recommended': return 'bg-rose-100 text-rose-800 border-rose-200'
    default: return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export default function ScoreGauge({ score, band }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const animFrameRef = useRef<number | null>(null)

  // Arc params
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = 86
  // Arc spans 220 degrees: from 160deg to 380deg (20deg)
  const startAngle = 160
  const arcDegrees = 220
  const circumference = 2 * Math.PI * radius
  const arcLength = (arcDegrees / 360) * circumference

  function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const toRad = (d: number) => (d * Math.PI) / 180
    const start = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) }
    const end = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) }
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  // Animate count-up
  useEffect(() => {
    const duration = 800
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
    }
  }, [score])

  const arcColor = getArcColor(score)
  const filledFraction = score / 100
  const filledLength = filledFraction * arcLength
  const trackPath = describeArc(cx, cy, radius, startAngle, startAngle + arcDegrees)
  const fillPath = describeArc(cx, cy, radius, startAngle, startAngle + arcDegrees)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
          {/* Background track */}
          <path
            d={trackPath}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Filled arc — use stroke-dasharray trick */}
          <path
            d={fillPath}
            fill="none"
            stroke={arcColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
          {/* Glow dot at tip */}
          {score > 0 && (() => {
            const toRad = (d: number) => (d * Math.PI) / 180
            const tipAngle = startAngle + filledFraction * arcDegrees
            const tx = cx + radius * Math.cos(toRad(tipAngle))
            const ty = cy + radius * Math.sin(toRad(tipAngle))
            return (
              <circle
                cx={tx}
                cy={ty}
                r="8"
                fill={arcColor}
                style={{ filter: 'drop-shadow(0 0 4px ' + arcColor + ')' }}
              />
            )
          })()}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-extrabold tabular-nums leading-none"
            style={{ color: arcColor }}
          >
            {displayScore}
          </span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            out of 100
          </span>
        </div>
      </div>

      {/* Band pill */}
      <div className={`mt-3 px-4 py-1.5 rounded-full border font-semibold text-sm ${getBandBg(band)}`}>
        {band}
      </div>
    </div>
  )
}
