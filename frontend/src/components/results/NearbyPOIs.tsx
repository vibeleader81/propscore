import type { NearbyPOIs as NearbyPOIsType, NearbyPOI } from '../../types'
import { formatDistance, getDistanceColor } from '../../utils/formatters'

interface NearbyPOIsProps {
  pois: NearbyPOIsType
}

interface POIColumnProps {
  title: string
  icon: string
  items: NearbyPOI[]
  accentColor: string
}

function POIColumn({ title, icon, items, accentColor }: POIColumnProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 ${accentColor}`}>
        <span className="text-base">{icon}</span>
        <h3 className="font-bold text-sm">{title}</h3>
        <span className="ml-auto text-xs font-medium opacity-70">{items.length} found</span>
      </div>
      <div className="divide-y divide-slate-50">
        {items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-400 italic">None found nearby</p>
        ) : (
          items.slice(0, 6).map((poi, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{poi.name}</p>
                {poi.type && (
                  <p className="text-xs text-slate-400 truncate capitalize">{poi.type.replace(/_/g, ' ')}</p>
                )}
              </div>
              <span className={`text-xs font-bold flex-shrink-0 ${getDistanceColor(poi.distance_m)}`}>
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
        icon="🎓"
        items={pois.schools}
        accentColor="bg-violet-50 text-violet-800"
      />
      <POIColumn
        title="Transport"
        icon="🚉"
        items={pois.transport}
        accentColor="bg-blue-50 text-blue-800"
      />
      <POIColumn
        title="Parks & Recreation"
        icon="🌳"
        items={pois.parks}
        accentColor="bg-emerald-50 text-emerald-800"
      />
    </div>
  )
}
