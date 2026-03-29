interface HeaderProps {
  hasResult: boolean
  onReset: () => void
}

export default function Header({ hasResult, onReset }: HeaderProps) {
  return (
    <header
      style={{
        background: '#1b4353',
        borderBottom: '1px solid rgba(40,146,215,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              background: '#2892d7',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 14px rgba(40,146,215,0.28)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#1b4353">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'white',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                PropScore
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 500,
                  color: '#2892d7',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  background: 'rgba(40,146,215,0.1)',
                  border: '1px solid rgba(40,146,215,0.2)',
                  padding: '3px 8px',
                  borderRadius: '100px',
                }}
              >
                AU
              </span>
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '10px',
                color: '#6daedb',
                letterSpacing: '0.07em',
                marginTop: '3px',
                textTransform: 'uppercase',
              }}
            >
              Property Intelligence
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasResult ? (
            <button
              onClick={onReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '9px 18px',
                borderRadius: '10px',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New Assessment
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'DM Mono', monospace",
                fontSize: '10px',
                color: '#6daedb',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              <div
                className="dot-pulse"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#2892d7',
                }}
              />
              Live
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
