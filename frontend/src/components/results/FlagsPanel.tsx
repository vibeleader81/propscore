interface FlagsPanelProps {
  redFlags: string[]
  greenFlags: string[]
}

export default function FlagsPanel({ redFlags, greenFlags }: FlagsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Red Flags */}
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🚨</span>
          <h3 className="font-bold text-rose-800 text-sm uppercase tracking-wide">Red Flags</h3>
          {redFlags.length > 0 && (
            <span className="ml-auto bg-rose-200 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {redFlags.length}
            </span>
          )}
        </div>
        {redFlags.length === 0 ? (
          <div className="flex items-center gap-2 text-rose-400 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            No major issues found
          </div>
        ) : (
          <ul className="space-y-2.5">
            {redFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-rose-800 leading-relaxed">{flag}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Green Flags */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">✅</span>
          <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wide">Green Flags</h3>
          {greenFlags.length > 0 && (
            <span className="ml-auto bg-emerald-200 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {greenFlags.length}
            </span>
          )}
        </div>
        {greenFlags.length === 0 ? (
          <div className="text-emerald-500 text-sm">No standout positives identified</div>
        ) : (
          <ul className="space-y-2.5">
            {greenFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-emerald-800 leading-relaxed">{flag}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
