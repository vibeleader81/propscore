import type { AIFlag } from '../../types'

interface ExpertFlagsPanelProps {
  flags: AIFlag[]
  hasVeto: boolean
  vetoReasons: string[]
}

const FLAG_CONFIG = {
  red: {
    symbol: '🚩',
    label: 'Red Flag',
    bg: '#fff5f5',
    border: '#fecaca',
    headerBg: '#fef2f2',
    labelColor: '#991b1b',
    textColor: '#7f1d1d',
    countBg: '#fee2e2',
    countColor: '#991b1b',
    desc: 'Unchangeable negative',
  },
  golden: {
    symbol: '⭐',
    label: 'Golden Flag',
    bg: '#fffbeb',
    border: '#fde68a',
    headerBg: '#fef9c3',
    labelColor: '#92400e',
    textColor: '#78350f',
    countBg: '#fef3c7',
    countColor: '#92400e',
    desc: 'Unchangeable positive',
  },
  green: {
    symbol: '✅',
    label: 'Green Flag',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    headerBg: '#dcfce7',
    labelColor: '#166534',
    textColor: '#14532d',
    countBg: '#bbf7d0',
    countColor: '#166534',
    desc: 'Changeable positive',
  },
  fixable: {
    symbol: '🔧',
    label: 'Fixable',
    bg: '#f8fafc',
    border: '#e2e8f0',
    headerBg: '#f1f5f9',
    labelColor: '#475569',
    textColor: '#334155',
    countBg: '#e2e8f0',
    countColor: '#475569',
    desc: 'Cost implication',
  },
}

const FLAG_ORDER: AIFlag['type'][] = ['red', 'golden', 'green', 'fixable']

export default function ExpertFlagsPanel({ flags, hasVeto, vetoReasons }: ExpertFlagsPanelProps) {
  const grouped = FLAG_ORDER.reduce((acc, type) => {
    acc[type] = flags.filter(f => f.type === type)
    return acc
  }, {} as Record<AIFlag['type'], AIFlag[]>)

  return (
    <div className="space-y-4">
      {/* Critical veto banner */}
      {hasVeto && vetoReasons.length > 0 && (
        <div
          className="rounded-xl px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)', border: '1px solid #b91c1c' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⛔</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white" style={{ fontFamily: "'DM Mono', monospace" }}>
              CRITICAL — PURCHASE NOT RECOMMENDED
            </span>
          </div>
          <ul className="space-y-1.5">
            {vetoReasons.map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#fca5a5' }}>
                <span className="mt-0.5 flex-shrink-0">›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {FLAG_ORDER.map(type => {
          const cfg = FLAG_CONFIG[type]
          return (
            <span key={type} className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b', fontFamily: "'DM Mono', monospace" }}>
              <span>{cfg.symbol}</span>
              <span>{cfg.desc}</span>
            </span>
          )
        })}
      </div>

      {/* Flag groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FLAG_ORDER.map(type => {
          const items = grouped[type]
          if (items.length === 0) return null
          const cfg = FLAG_CONFIG[type]
          return (
            <div
              key={type}
              className="rounded-2xl overflow-hidden"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderTop: `3px solid ${cfg.border}` }}
            >
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ background: cfg.headerBg, borderBottom: `1px solid ${cfg.border}` }}
              >
                <span className="text-sm">{cfg.symbol}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.labelColor, fontFamily: "'DM Mono', monospace" }}>
                  {cfg.label}s
                </span>
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.countBg, color: cfg.countColor, fontFamily: "'DM Mono', monospace" }}
                >
                  {items.length}
                </span>
              </div>
              <ul className="divide-y" style={{ borderColor: cfg.border }}>
                {items.map((flag, i) => (
                  <li key={i} className="px-4 py-3 space-y-0.5">
                    <div className="text-xs font-semibold" style={{ color: cfg.labelColor }}>
                      {flag.factor}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: cfg.textColor, opacity: 0.85 }}>
                      {flag.explanation}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
