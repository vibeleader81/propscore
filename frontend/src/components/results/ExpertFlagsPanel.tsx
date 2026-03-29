import type { AIFlag } from '../../types'

interface ExpertFlagsPanelProps {
  flags: AIFlag[]
  hasVeto: boolean
  vetoReasons: string[]
}

const FLAG_CONFIG = {
  red: {
    emoji: '🚩',
    label: 'Red Flag',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800',
    text: 'text-rose-800',
    headerBg: 'bg-rose-100',
  },
  golden: {
    emoji: '⭐',
    label: 'Golden Flag',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-800',
    headerBg: 'bg-amber-100',
  },
  green: {
    emoji: '✅',
    label: 'Green Flag',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-800',
    headerBg: 'bg-emerald-100',
  },
  fixable: {
    emoji: '🔧',
    label: 'Fixable',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700',
    headerBg: 'bg-slate-100',
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
        <div className="bg-rose-600 text-white rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm uppercase tracking-wide">
            <span>⛔</span> CRITICAL — PURCHASE NOT RECOMMENDED
          </div>
          <ul className="space-y-1">
            {vetoReasons.map((r, i) => (
              <li key={i} className="text-sm text-rose-100 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Flag legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span>🚩</span> Unchangeable negative</span>
        <span className="flex items-center gap-1"><span>⭐</span> Unchangeable positive</span>
        <span className="flex items-center gap-1"><span>✅</span> Changeable positive</span>
        <span className="flex items-center gap-1"><span>🔧</span> Fixable (cost implication)</span>
      </div>

      {/* Flag groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FLAG_ORDER.map(type => {
          const items = grouped[type]
          if (items.length === 0) return null
          const cfg = FLAG_CONFIG[type]
          return (
            <div key={type} className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cfg.emoji}</span>
                <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>
                  {cfg.label}s
                </span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {items.length}
                </span>
              </div>
              <ul className="space-y-2.5">
                {items.map((flag, i) => (
                  <li key={i} className="space-y-0.5">
                    <div className={`text-xs font-semibold ${cfg.text}`}>{flag.factor}</div>
                    <div className={`text-xs leading-relaxed ${cfg.text} opacity-80`}>{flag.explanation}</div>
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
