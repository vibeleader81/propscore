interface ScorePillarProps {
  title: string
  score: number
  sub_scores: Record<string, number>
  insights: string[]
  icon: string
}

function formatSubKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function barColor(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #8fa998, #c9f299)'
  if (score >= 65) return 'linear-gradient(90deg, #8fa998, #86efac)'
  if (score >= 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  if (score >= 35) return 'linear-gradient(90deg, #f97316, #fb923c)'
  return 'linear-gradient(90deg, #f43f5e, #fb7185)'
}

function scoreColor(score: number): string {
  if (score >= 80) return '#c9f299'
  if (score >= 65) return '#8fa998'
  if (score >= 50) return '#f59e0b'
  if (score >= 35) return '#f97316'
  return '#f43f5e'
}

export default function ScorePillar({ title, score, sub_scores, insights, icon }: ScorePillarProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: 'white',
        border: '1px solid #f1f5f9',
        borderLeft: `3px solid ${scoreColor(score)}`,
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="font-bold text-sm" style={{ color: '#1e293b', fontFamily: "'DM Sans', sans-serif" }}>
              {title}
            </span>
          </div>
          <span
            className="font-extrabold"
            style={{ fontSize: 18, color: scoreColor(score), fontFamily: "'Fraunces', serif" }}
          >
            {score}
            <span className="text-xs font-normal" style={{ color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>/100</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${score}%`, background: barColor(score), transition: 'width 0.7s ease-out' }}
          />
        </div>
      </div>

      {/* Sub scores */}
      {Object.keys(sub_scores).length > 0 && (
        <div className="px-5 py-3 space-y-2.5" style={{ borderBottom: '1px solid #f8fafc' }}>
          {Object.entries(sub_scores).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs" style={{ color: '#64748b', fontFamily: "'DM Mono', monospace" }}>
                  {formatSubKey(key)}
                </span>
                <span className="text-xs font-semibold" style={{ color: scoreColor(val), fontFamily: "'DM Mono', monospace" }}>
                  {val}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${val}%`, background: barColor(val), transition: 'width 0.7s ease-out' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="px-5 py-3 flex-1">
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#64748b' }}>
                <span className="mt-0.5 flex-shrink-0 font-mono" style={{ color: '#8fa998' }}>›</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
