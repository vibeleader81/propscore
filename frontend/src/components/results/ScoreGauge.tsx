import { useEffect, useRef, useState } from 'react'
import type { AssessmentBand } from '../../types'

interface ScoreGaugeProps {
  score: number
  band: AssessmentBand
}

function getArcColor(score: number): string {
  if (score >= 80) return '#c9f299' // lime
  if (score >= 65) return '#8fa998' // teal
  if (score >= 50) return '#f59e0b' // amber
  if (score >= 35) return '#f97316' // orange
  return '#f43f5e'                  // rose
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const start = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) }
  const end = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) }
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export default function ScoreGauge({ score, band }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const animFrameRef = useRef<number | null>(null)

  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = 86
  const startAngle = 160
  const arcDegrees = 220
  const circumference = 2 * Math.PI * radius
  const arcLength = (arcDegrees / 360) * circumference

  useEffect(() => {
    const duration = 900
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => { if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current) }
  }, [score])

  const arcColor = getArcColor(score)
  const filledFraction = score / 100
  const filledLength = filledFraction * arcLength
  const trackPath = describeArc(cx, cy, radius, startAngle, startAngle + arcDegrees)
  const fillPath = describeArc(cx, cy, radius, startAngle, startAngle + arcDegrees)

  // Tip dot position
  const toRad = (d: number) => (d * Math.PI) / 180
  const tipAngle = startAngle + filledFraction * arcDegrees
  const tx = cx + radius * Math.cos(toRad(tipAngle))
  const ty = cy + radius * Math.sin(toRad(tipAngle))

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-2xl p-4 flex flex-col items-center"
        style={{ background: 'linear-gradient(135deg, #3a2444 0%, #4f345a 100%)', boxShadow: '0 4px 24px rgba(79,52,90,0.3)' }}
      >
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="block">
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8fa998" />
                <stop offset="100%" stopColor={arcColor} />
              </linearGradient>
            </defs>
            {/* Track */}
            <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
            {/* Fill */}
            <path
              d={fillPath}
              fill="none"
              stroke={score >= 65 ? 'url(#arcGrad)' : arcColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${filledLength} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)' }}
            />
            {/* Glow tip */}
            {score > 0 && (
              <circle
                cx={tx}
                cy={ty}
                r="7"
                fill={arcColor}
                style={{ filter: `drop-shadow(0 0 6px ${arcColor})` }}
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="tabular-nums leading-none"
              style={{ fontSize: 52, fontWeight: 800, color: arcColor, fontFamily: "'Fraunces', serif" }}
            >
              {displayScore}
            </span>
            <span className="text-xs uppercase tracking-widest mt-1" style={{ color: '#8fa998', fontFamily: "'DM Mono', monospace" }}>
              out of 100
            </span>
          </div>
        </div>

        {/* Band */}
        <div
          className="mt-1 mb-1 px-4 py-1.5 rounded-lg font-bold text-sm"
          style={{ background: 'rgba(201,242,153,0.12)', color: '#c9f299', border: '1px solid rgba(201,242,153,0.25)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.03em' }}
        >
          {band}
        </div>
      </div>
    </div>
  )
}
