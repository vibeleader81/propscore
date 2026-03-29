import type { PropertyListing } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface PropertyListingsPanelProps {
  listings: PropertyListing[]
}

function SpecPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
      style={{ background: 'rgba(40,146,215,0.08)', color: '#2892d7', fontFamily: "'DM Mono', monospace" }}
    >
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  )
}

function ListingCard({ listing }: { listing: PropertyListing }) {
  const photo = listing.photos[0]
  const hasPrice = listing.price != null

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderTop: '3px solid #2892d7',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      {/* Photo */}
      {photo ? (
        <div className="relative overflow-hidden" style={{ height: 160 }}>
          <img
            src={photo}
            alt={listing.address}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {hasPrice && (
            <div
              className="absolute bottom-0 left-0 right-0 px-3 py-2"
              style={{ background: 'linear-gradient(transparent, rgba(23,55,83,0.85))' }}
            >
              <span
                className="text-base font-extrabold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {listing.display_price || formatCurrency(listing.price!)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ height: 120, background: 'linear-gradient(135deg, #f4f8fb 0%, #e2e8f0 100%)' }}
        >
          <span style={{ color: '#94a3b8', fontSize: 32 }}>🏠</span>
          {hasPrice && (
            <span
              className="absolute font-extrabold"
              style={{ color: '#173753', fontFamily: "'Playfair Display', serif", fontSize: 18 }}
            >
              {listing.display_price || formatCurrency(listing.price!)}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 py-4 gap-3">
        <div>
          <p className="text-sm font-semibold leading-snug" style={{ color: '#1e293b' }}>
            {listing.address}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
            {listing.suburb}{listing.state ? `, ${listing.state}` : ''}{listing.postcode ? ` ${listing.postcode}` : ''}
          </p>
        </div>

        {/* Spec pills */}
        <div className="flex flex-wrap gap-1.5">
          {listing.bedrooms != null && <SpecPill label="bed" value={listing.bedrooms} />}
          {listing.bathrooms != null && <SpecPill label="bath" value={listing.bathrooms} />}
          {listing.parking != null && <SpecPill label="car" value={listing.parking} />}
          {listing.land_size_sqm != null && <SpecPill label="land" value={`${listing.land_size_sqm}m²`} />}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          <a
            href={listing.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center text-xs font-bold py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{
              background: '#2892d7',
              color: '#ffffff',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.02em',
            }}
          >
            View on Domain →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function PropertyListingsPanel({ listings }: PropertyListingsPanelProps) {
  if (!listings.length) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.listing_id} listing={listing} />
      ))}
    </div>
  )
}
