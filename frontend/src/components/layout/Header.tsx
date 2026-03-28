interface HeaderProps {
  hasResult: boolean
  onReset: () => void
}

export default function Header({ hasResult, onReset }: HeaderProps) {
  return (
    <header className="bg-[#0f172a] shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-white tracking-tight">PropScore</span>
                <span className="hidden sm:inline-block text-xs font-semibold text-blue-400 uppercase tracking-wider bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                  AU
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-none hidden sm:block">Your AI-Powered Buyers Agent</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {hasResult && (
              <button
                onClick={onReset}
                className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-150 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                New Assessment
              </button>
            )}
            {!hasResult && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span>AI analysis active</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
