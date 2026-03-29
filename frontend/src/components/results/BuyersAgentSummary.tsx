interface BuyersAgentSummaryProps {
  summary: string
}

export default function BuyersAgentSummary({ summary }: BuyersAgentSummaryProps) {
  return (
    <div
      className="rounded-2xl p-7 relative overflow-hidden"
      style={{ background: 'white', borderLeft: '4px solid #6daedb', boxShadow: '0 2px 12px rgba(27,67,83,0.06)' }}
    >
      {/* Large quote mark decoration */}
      <div
        className="absolute top-4 right-6 leading-none select-none pointer-events-none"
        style={{ fontSize: 80, color: '#f1f5f9', fontFamily: "'Playfair Display', serif" }}
      >
        "
      </div>

      <div className="flex items-center gap-3 mb-5 relative">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1b4353, #173753)' }}
        >
          <svg className="w-5 h-5" fill="#2892d7" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#1e293b', fontFamily: "'Inter', sans-serif" }}>
            AI Buyers Agent
          </p>
          <p className="text-xs" style={{ color: '#6daedb', fontFamily: "'DM Mono', monospace" }}>
            PropScore Analysis
          </p>
        </div>
      </div>

      <blockquote className="text-sm leading-relaxed italic pr-12 relative" style={{ color: '#334155' }}>
        {summary}
      </blockquote>
    </div>
  )
}
