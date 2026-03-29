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
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: '#3a2444',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Blueprint grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(201%2C242%2C153%2C0.05)' stroke-width='0.5'/%3E%3C/svg%3E\")",
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow from centre */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 700px 500px at 50% 40%, rgba(93,78,109,0.4) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Corner coordinate markers */}
      <div style={{
        position: 'absolute', top: '20px', left: '24px',
        fontFamily: "'DM Mono', monospace",
        fontSize: '9px',
        color: 'rgba(143,169,152,0.25)',
        letterSpacing: '0.06em',
        userSelect: 'none',
      }}>
        ANALYSING
      </div>
      <div style={{
        position: 'absolute', top: '20px', right: '24px',
        fontFamily: "'DM Mono', monospace",
        fontSize: '9px',
        color: 'rgba(143,169,152,0.25)',
        letterSpacing: '0.06em',
        userSelect: 'none',
      }}>
        PROPSCORE ENGINE v2
      </div>

      {/* Main content card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '520px',
        padding: '0 24px',
      }}>

        {/* Address being assessed */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '9px',
            color: 'rgba(143,169,152,0.5)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Assessing
          </div>
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontSize: '18px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            maxWidth: '420px',
            margin: '0 auto',
          }}>
            {address}
          </div>
        </div>

        {/* Stage icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'rgba(201,242,153,0.06)',
            border: '1px solid rgba(201,242,153,0.12)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
          }}>
            {stage.emoji}
          </div>
        </div>

        {/* Current stage label */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '15px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.01em',
          }}>
            {stage.label}
            <span style={{ color: '#9cbfa7', opacity: 0.7 }}>…</span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            height: '3px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '100px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: '100px',
              background: 'linear-gradient(90deg, #9cbfa7, #c9f299)',
              width: `${pct}%`,
              transition: 'width 0.3s ease-linear',
              boxShadow: '0 0 12px rgba(201,242,153,0.4)',
            }} />
          </div>
        </div>

        {/* Pct + step count */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '36px',
        }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            color: '#8fa998',
            letterSpacing: '0.06em',
          }}>
            {Math.round(pct)}% complete
          </span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            color: 'rgba(143,169,152,0.5)',
            letterSpacing: '0.06em',
          }}>
            Step {Math.min(stageIdx + 1, STAGES.length)} of {STAGES.length}
          </span>
        </div>

        {/* Stage dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '36px' }}>
          {STAGES.map((s, i) => (
            <div
              key={i}
              title={s.label}
              style={{
                height: '4px',
                borderRadius: '100px',
                transition: 'all 0.4s ease',
                width: i < stageIdx ? '16px' : i === stageIdx ? '24px' : '6px',
                background: i < stageIdx
                  ? '#9cbfa7'
                  : i === stageIdx
                  ? '#c9f299'
                  : 'rgba(255,255,255,0.1)',
                boxShadow: i === stageIdx ? '0 0 8px rgba(201,242,153,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        {/* AI stage notice */}
        {isAIStage && (
          <div style={{
            background: 'rgba(201,242,153,0.04)',
            border: '1px solid rgba(201,242,153,0.12)',
            borderRadius: '16px',
            padding: '20px 24px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '16px',
              fontWeight: 500,
              color: '#c9f299',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}>
              🤖 AI Expert Analysis Running
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: 'rgba(156,191,167,0.8)',
              lineHeight: 1.6,
              marginBottom: '8px',
            }}>
              Claude is evaluating 10 property criteria including orientation, noise, zoning,
              flood risk, neighbourhood quality, and capital growth signals.
            </p>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '10px',
              color: 'rgba(143,169,152,0.6)',
              letterSpacing: '0.06em',
            }}>
              15–25 seconds — your detailed expert report is worth the wait
            </p>
          </div>
        )}

        {/* Completed stages list */}
        {stageIdx > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STAGES.slice(0, stageIdx).map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="#9cbfa7" style={{ flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '10px',
                  color: 'rgba(143,169,152,0.55)',
                  letterSpacing: '0.04em',
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
