import type { AssessmentRequest, AssessmentResponse, GeocodeResult } from '../types'

export async function assessProperty(data: AssessmentRequest): Promise<AssessmentResponse> {
  const response = await fetch('/api/assess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Assessment failed (${response.status}): ${errorText}`)
  }

  return response.json()
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    throw new Error(`Geocode failed (${response.status})`)
  }

  return response.json()
}

export interface DomainPropertyData {
  found: boolean
  property_id?: string
  domain_listing_id?: string
  headline?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  parking?: number
  land_size_sqm?: number
  building_area_sqm?: number
  year_built?: number
  features?: string[]
  price?: number
  display_price?: string
  estimated_value_low?: number
  estimated_value_high?: number
  last_sold_price?: number
  last_sold_date?: string
  photos?: string[]
  listing_url?: string
  reason?: string
}

export async function lookupProperty(address: string): Promise<DomainPropertyData> {
  try {
    const response = await fetch('/api/property-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    if (!response.ok) return { found: false }
    return response.json()
  } catch {
    return { found: false }
  }
}
