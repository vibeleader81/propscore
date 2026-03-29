import { useEffect, useState, useRef } from 'react'

interface Stage {
  label: string
  short: string
  targetPct: number
  durationMs: number
}

const STAGES: Stage[] = [
  { label: 'Geocoding address',                      short: 'ADDRESS LOCK',   targetPct: 8,  durationMs: 700   },
  { label: 'Finding schools, transport & parks',      short: 'AMENITY SCAN',   targetPct: 24, durationMs: 1800  },
  { label: 'Analysing walkability & local amenities', short: 'WALK SCORE',     targetPct: 40, durationMs: 2800  },
  { label: 'Checking flood & bushfire risk',          short: 'HAZARD CHECK',   targetPct: 53, durationMs: 1600  },
  { label: 'Fetching Domain property data',           short: 'PROPERTY DATA',  targetPct: 63, durationMs: 1200  },
  { label: 'Gathering suburb market statistics',      short: 'MARKET INTEL',   targetPct: 72, durationMs: 1000  },
  { label: 'Running AI expert analysis',              short: 'AI SYNTHESIS',   targetPct: 94, durationMs: 16000 },
  { label: 'Finalising your report',                  short: 'COMPILING',      targetPct: 99, durationMs: 4000  },
]

// Unique geometric SVG icon per stage
const STAGE_ICONS = [
  // 0: Crosshair — address lock
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="7"/>
    <line x1="12" y1="17" x2="12" y2="22"/><line x1="2" y1="12" x2="7" y2="12"/>
    <line x1="17" y1="12" x2="22" y2="12"/>
  </svg>,
  // 1: Grid — amenity scan
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>,
  // 2: Path — walkability
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 17c4-8 6-8 9 0s5 8 9 0"/>
    <circle cx="3" cy="17" r="1.5" fill="currentColor"/><circle cx="21" cy="17" r="1.5" fill="currentColor"/>
  </svg>,
  // 3: Shield — hazard check
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 2l7 3v5c0 5-3 9-7 11-4-2-7-6-7-11V5l7-3z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="16" r="0.8" fill="currentColor"/>
  </svg>,
  // 4: Building — property data
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/>
    <path d="M9 22V12h6v10"/>
  </svg>,
  // 5: Bar chart — market intel
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="20" x2="21" y2="20"/>
    <rect x="4" y="12" width="4" height="8" rx="0.5"/><rect x="10" y="6" width="4" height="14" rx="0.5"/>
    <rect x="16" y="9" width="4" height="11" rx="0.5"/>
  </svg>,
  // 6: Circuit — AI synthesis
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="8" y="8" width="8" height="8" rx="1"/>
    <line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/>
    <line x1="5" y1="5" x2="8" y2="8"/><line x1="19" y1="5" x2="16" y2="8"/>
    <line x1="5" y1="19" x2="8" y2="16"/><line x1="19" y1="19" x2="16" y2="16"/>
  </svg>,
  // 7: Check circle — compiling
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><path d="M7 12l3.5 3.5L17 8.5"/>
  </svg>,
]

// Scramble text on stage change
function useScramble(text: string, key: number) {
  const [display, setDisplay] = useState(text)
  const raf = useRef<number>()

  useEffect(() => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·—▒'
    let frame = 0
    const TOTAL = 20

    const tick = () => {
      setDisplay(
        text.split('').map((ch, idx) => {
          if (ch === ' ') return ' '
          if (idx < (frame / TOTAL) * text.length) return ch
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
      )
      frame++
      if (frame <= TOTAL) raf.current = requestAnimationFrame(tick)
      else setDisplay(text)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [text, key])

  return display
}

interface LoadingProgressProps {
  address: string
}

export default function LoadingProgress({ address }: LoadingProgressProps) {
  const [stageIdx, setStageIdx] = useState(0)
  const [pct, setPct] = useState(0)
  const [cursorOn, setCursorOn] = useState(true)

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setCursorOn(c => !c), 530)
    return () => clearInterval(id)
  }, [])

  // Progress animation per stage
  useEffect(() => {
    const stage = STAGES[stageIdx]
    if (!stage) return
    const prevPct = stageIdx === 0 ? 0 : STAGES[stageIdx - 1].targetPct
    const steps = 40
    const stepDuration = stage.durationMs / steps
    const pctPerStep = (stage.targetPct - prevPct) / steps
    let step = 0
    const interval = setInterval(() => {
      step++
      setPct(prevPct + step * pctPerStep)
      if (step >= steps) {
        clearInterval(interval)
        if (stageIdx < STAGES.length - 1) setStageIdx(i => i + 1)
      }
    }, stepDuration)
    return () => clearInterval(interval)
  }, [stageIdx])

  const stage = STAGES[Math.min(stageIdx, STAGES.length - 1)]
  const isAIStage = stageIdx === 6
  const scrambled = useScramble(stage.short, stageIdx)

  // Compute active segment fill pct
  const prevPct = stageIdx === 0 ? 0 : STAGES[stageIdx - 1].targetPct
  const segFill = stage.targetPct > prevPct
    ? Math.min(1, (pct - prevPct) / (stage.targetPct - prevPct))
    : 1

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: '#09172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Radar sweep overlay (rotating conic gradient) ── */}
      <div
        className="radar-spin"
        style={{
          position: 'absolute',
          inset: '-50%',
          background: 'conic-gradient(from 0deg at 50% 50%, transparent 330deg, rgba(40,146,215,0.025) 348deg, rgba(40,146,215,0.07) 358deg, rgba(40,146,215,0.025) 360deg)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Blueprint dot grid ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='0.8' fill='rgba(40%2C146%2C215%2C0.1)'/%3E%3C/svg%3E\")",
        backgroundSize: '40px 40px',
      }} />

      {/* ── Radial vignette ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 55% at 50% 48%, transparent, rgba(9,23,42,0.65) 100%)',
      }} />

      {/* ── Horizontal scan line ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '1px', pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(40,146,215,0.12) 20%, rgba(40,146,215,0.22) 50%, rgba(40,146,215,0.12) 80%, transparent)',
        animation: 'scanLine 7s linear infinite',
        animationDelay: '2s',
      }} />

      {/* ── Corner labels ── */}
      {[
        { pos: { top: 20, left: 24 },  text: `INTEL GATHERING${cursorOn ? '█' : ' '}` },
        { pos: { top: 20, right: 24 }, text: 'PROPSCORE ENGINE v2' },
        { pos: { bottom: 20, left: 24 }, text: 'AU · NSW · LIVE' },
        { pos: { bottom: 20, right: 24 }, text: new Date().toISOString().slice(0, 10) },
      ].map(({ pos, text }, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          fontFamily: "'DM Mono', monospace",
          fontSize: '8px',
          color: 'rgba(109,174,219,0.18)',
          letterSpacing: '0.12em',
          userSelect: 'none',
        }}>
          {text}
        </div>
      ))}

      {/* ── Main card ── */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '560px', padding: '0 28px' }}>

        {/* Live status pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 44 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#2892d7',
            animation: 'dotPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '8px',
            color: 'rgba(109,174,219,0.4)',
            letterSpacing: '0.2em',
          }}>
            LIVE ANALYSIS
          </span>
        </div>

        {/* Address */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '8px',
            color: 'rgba(109,174,219,0.3)',
            letterSpacing: '0.22em',
            marginBottom: 12,
          }}>
            ASSESSING
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(18px, 4vw, 24px)',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.025em',
            lineHeight: 1.25,
            margin: '0 auto',
            maxWidth: 420,
          }}>
            {address}
          </h1>
          {/* Thin centred rule */}
          <div style={{
            height: '1px',
            maxWidth: 300,
            margin: '18px auto 0',
            background: 'linear-gradient(90deg, transparent, rgba(40,146,215,0.2) 30%, rgba(40,146,215,0.2) 70%, transparent)',
          }} />
        </div>

        {/* Stage icon with pulsing rings */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 38 }}>
          <div style={{ position: 'relative', marginBottom: 22 }}>
            {/* Outer pulse ring */}
            <div className="glow-pulse" style={{
              position: 'absolute', inset: -16,
              borderRadius: '50%',
              border: '1px solid rgba(40,146,215,0.1)',
            }} />
            {/* Middle ring */}
            <div style={{
              position: 'absolute', inset: -8,
              borderRadius: '50%',
              border: '1px solid rgba(40,146,215,0.16)',
            }} />
            {/* Icon circle */}
            <div style={{
              width: 72, height: 72,
              background: 'rgba(40,146,215,0.05)',
              border: '1px solid rgba(40,146,215,0.18)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6daedb',
            }}>
              <div key={stageIdx} style={{ width: 26, height: 26, animation: 'fadeIn 0.3s ease-out' }}>
                {STAGE_ICONS[Math.min(stageIdx, STAGE_ICONS.length - 1)]}
              </div>
            </div>
          </div>

          {/* Scrambled short label */}
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            color: '#2892d7',
            letterSpacing: '0.2em',
            marginBottom: 8,
          }}>
            {scrambled}
          </div>

          {/* Full stage label */}
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
          }}>
            {stage.label}<span style={{ color: 'rgba(40,146,215,0.5)' }}>…</span>
          </div>
        </div>

        {/* Segmented progress bar (8 segments) */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: '2px', height: '3px' }}>
            {STAGES.map((_s, i) => {
              const done = i < stageIdx
              const active = i === stageIdx
              const fill = active ? `${Math.round(segFill * 100)}%` : done ? '100%' : '0%'
              return (
                <div key={i} style={{ flex: 1, borderRadius: 100, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{
                    height: '100%',
                    width: fill,
                    borderRadius: 100,
                    background: done ? '#5ba3d0' : active ? 'linear-gradient(90deg, #5ba3d0, #2892d7)' : 'transparent',
                    boxShadow: active ? '0 0 8px rgba(40,146,215,0.6)' : 'none',
                    transition: active ? 'width 0.3s linear' : 'none',
                  }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Pct + step counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#6daedb', letterSpacing: '0.06em' }}>
            {Math.round(pct)}% complete
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'rgba(109,174,219,0.35)', letterSpacing: '0.06em' }}>
            Step {Math.min(stageIdx + 1, STAGES.length)} of {STAGES.length}
          </span>
        </div>

        {/* Stage pills (variable-width dots) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: 36 }}>
          {STAGES.map((_, i) => (
            <div key={i} style={{
              height: 3, borderRadius: 100,
              transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
              width: i < stageIdx ? 14 : i === stageIdx ? 24 : 5,
              background: i < stageIdx ? '#5ba3d0' : i === stageIdx ? '#2892d7' : 'rgba(255,255,255,0.07)',
              boxShadow: i === stageIdx ? '0 0 10px rgba(40,146,215,0.6)' : 'none',
            }} />
          ))}
        </div>

        {/* AI stage expanded notice */}
        {isAIStage && (
          <div style={{
            background: 'rgba(40,146,215,0.03)',
            border: '1px solid rgba(40,146,215,0.13)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 28,
            animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#2892d7',
                animation: 'dotPulse 1.5s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '8px', color: '#2892d7', letterSpacing: '0.18em',
              }}>
                CLAUDE SONNET ANALYSIS ENGINE ACTIVE
              </span>
            </div>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px', color: 'rgba(109,174,219,0.7)', lineHeight: 1.65, marginBottom: 10,
            }}>
              Evaluating 10 property dimensions — orientation, noise, flood risk, zoning,
              density pressure, school quality, capital growth signals, and comparable sales.
            </p>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px', color: 'rgba(109,174,219,0.35)', letterSpacing: '0.08em',
            }}>
              15–25 seconds — comprehensive expert report incoming
            </p>
          </div>
        )}

        {/* Completed stages */}
        {stageIdx > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAGES.slice(0, stageIdx).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5ba3d0" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '9px', color: 'rgba(109,174,219,0.35)', letterSpacing: '0.08em',
                }}>
                  {s.short}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(40,146,215,0.05)' }} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
