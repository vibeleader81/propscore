interface FlagsPanelProps {
  redFlags: string[]
  greenFlags: string[]
}

export default function FlagsPanel({ redFlags, greenFlags }: FlagsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Red Flags */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#fff5f5', border: '1px solid #fecaca', borderTop: '3px solid #f43f5e' }}
      >
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
          <span className="text-sm">🚩</span>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#991b1b', fontFamily: "'DM Mono', monospace" }}>
            Red Flags
          </h3>
          {redFlags.length > 0 && (
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#991b1b', fontFamily: "'DM Mono', monospace" }}>
              {redFlags.length}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          {redFlags.length === 0 ? (
            <p className="text-xs italic" style={{ color: '#fca5a5' }}>No major issues found</p>
          ) : (
            <ul className="space-y-2.5">
              {redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#7f1d1d' }}>
                  <span className="mt-0.5 flex-shrink-0 font-mono">›</span>
                  {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Green Flags */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#f7fdf0', border: '1px solid #bbf7d0', borderTop: '3px solid #c9f299' }}
      >
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
          <span className="text-sm">✅</span>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#166534', fontFamily: "'DM Mono', monospace" }}>
            Green Flags
          </h3>
          {greenFlags.length > 0 && (
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#bbf7d0', color: '#166534', fontFamily: "'DM Mono', monospace" }}>
              {greenFlags.length}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          {greenFlags.length === 0 ? (
            <p className="text-xs italic" style={{ color: '#86efac' }}>No standout positives identified</p>
          ) : (
            <ul className="space-y-2.5">
              {greenFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#14532d' }}>
                  <span className="mt-0.5 flex-shrink-0 font-mono">›</span>
                  {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
