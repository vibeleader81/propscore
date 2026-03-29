import type { NearbyPOIs as NearbyPOIsType, NearbyPOI } from '../../types'
import { formatDistance } from '../../utils/formatters'

interface NearbyPOIsProps {
  pois: NearbyPOIsType
}

interface POIColumnProps {
  title: string
  symbol: string
  items: NearbyPOI[]
  accentColor: string
  headerBg: string
  borderColor: string
}

function POIColumn({ title, symbol, items, accentColor, headerBg, borderColor }: POIColumnProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: `1px solid #f1f5f9`, borderTop: `3px solid ${borderColor}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: headerBg, borderBottom: '1px solid #f1f5f9' }}>
        <span className="text-sm">{symbol}</span>
        <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: accentColor, fontFamily: "'DM Mono', monospace" }}>
          {title}
        </h3>
        <span className="ml-auto text-xs" style={{ color: accentColor, opacity: 0.6, fontFamily: "'DM Mono', monospace" }}>
          {items.length} found
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: '#f8fafc' }}>
        {items.length === 0 ? (
          <p className="px-5 py-4 text-xs italic" style={{ color: '#94a3b8' }}>None found nearby</p>
        ) : (
          items.slice(0, 5).map((poi, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#334155' }}>{poi.name}</p>
                {poi.type && (
                  <p className="text-xs truncate capitalize" style={{ color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                    {poi.type.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
              <span
                className="text-xs font-bold flex-shrink-0"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: poi.distance_m < 500 ? '#c9f299' : poi.distance_m < 1000 ? '#8fa998' : '#94a3b8',
                }}
              >
                {formatDistance(poi.distance_m)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function NearbyPOIs({ pois }: NearbyPOIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <POIColumn
        title="Schools"
        symbol="🎓"
        items={pois.schools}
        accentColor="#4f345a"
        headerBg="#faf7fb"
        borderColor="#8fa998"
      />
      <POIColumn
        title="Transport"
        symbol="🚉"
        items={pois.transport}
        accentColor="#4f345a"
        headerBg="#f7f9f8"
        borderColor="#4f345a"
      />
      <POIColumn
        title="Parks & Recreation"
        symbol="🌳"
        items={pois.parks}
        accentColor="#4f345a"
        headerBg="#f7fdf0"
        borderColor="#c9f299"
      />
    </div>
  )
}
