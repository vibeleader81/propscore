import { getScoreBgColor, getScoreBarColor } from '../../utils/formatters'

interface ScorePillarProps {
  title: string
  score: number
  sub_scores: Record<string, number>
  insights: string[]
  icon: string
}

function formatSubKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

export default function ScorePillar({ title, score, sub_scores, insights, icon }: ScorePillarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" role="img" aria-label={title}>{icon}</span>
            <span className="font-bold text-slate-800 text-sm">{title}</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getScoreBgColor(score)}`}>
            {score}<span className="font-normal opacity-70">/100</span>
          </span>
        </div>

        {/* Overall bar */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Sub scores */}
      {Object.keys(sub_scores).length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 space-y-2.5">
          {Object.entries(sub_scores).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500">{formatSubKey(key)}</span>
                <span className="text-xs font-semibold text-slate-700">{val}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(val)}`}
                  style={{ width: `${val}%` }}
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
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
