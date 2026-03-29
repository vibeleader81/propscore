interface HeaderProps {
  hasResult: boolean
  onReset: () => void
}

export default function Header({ hasResult, onReset }: HeaderProps) {
  return (
    <header className="bg-[#4f345a] sticky top-0 z-50 shadow-[0_2px_20px_rgba(79,52,90,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#c9f299] rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-5 h-5 text-[#4f345a]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-white tracking-tight">PropScore</span>
                <span className="hidden sm:inline text-[10px] font-bold text-[#c9f299] uppercase tracking-widest bg-[#c9f299]/10 border border-[#c9f299]/25 px-2 py-0.5 rounded-full">
                  AU
                </span>
              </div>
              <p className="text-[11px] text-[#9cbfa7] leading-none hidden sm:block mt-0.5">AI-Powered Buyers Agent</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {hasResult ? (
              <button
                onClick={onReset}
                className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl border border-white/15 hover:border-white/25 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                New Assessment
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#9cbfa7]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c9f299] animate-pulse" />
                AI analysis active
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
