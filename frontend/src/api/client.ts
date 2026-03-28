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
