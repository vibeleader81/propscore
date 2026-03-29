/**
 * domainApi.ts
 * Domain.com.au property data fetcher using OAuth2 client credentials.
 *
 * Environment variables required:
 *   DOMAIN_CLIENT_ID
 *   DOMAIN_CLIENT_SECRET
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainAddress {
  full: string
  streetNumber: string | null
  streetName: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
}

export interface DomainDetails {
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  carspaces: number | null
  landArea: number | null
  buildingArea: number | null
  yearBuilt: number | null
  features: string[]
  photos: string[]
}

export interface PriceEntry {
  date: string
  price: number
  type: 'Sale' | 'Rental' | 'Auction' | string
}

export interface DomainPriceData {
  estimatedValue: number | null
  estimatedValueLow: number | null
  estimatedValueHigh: number | null
  lastSoldDate: string | null
  lastSoldPrice: number | null
  priceHistory: PriceEntry[]
  daysOnMarket: number | null
}

export interface DomainPropertyResult {
  propertyId: string
  address: DomainAddress
  details: DomainDetails
  priceData: DomainPriceData
  warnings: string[]
  fetchedAt: string
}

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string
  expiresAt: number // Unix ms
}

let _tokenCache: TokenCache | null = null

const AUTH_URL = 'https://auth.domain.com.au/v1/connect/token'
const API_BASE = 'https://api.domain.com.au'

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  // Reuse cached token if it has more than 60 seconds left
  if (_tokenCache && _tokenCache.expiresAt - now > 60_000) {
    return _tokenCache.token
  }

  const clientId = process.env.DOMAIN_CLIENT_ID
  const clientSecret = process.env.DOMAIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing DOMAIN_CLIENT_ID or DOMAIN_CLIENT_SECRET environment variables.'
    )
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'api_listings_read api_properties_read',
  })

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[domainApi] Auth response body:', text)
    throw new Error(
      `Domain OAuth2 authentication failed: ${res.status} ${res.statusText}`
    )
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  _tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return _tokenCache.token
}

// ---------------------------------------------------------------------------
// Step 1: Address → propertyId
// ---------------------------------------------------------------------------

interface SuggestResult {
  id: string
  relativeScore: number
  suggestion?: string
  [key: string]: unknown
}

async function resolvePropertyId(address: string, token: string): Promise<string> {
  const url =
    `${API_BASE}/v1/properties/_suggest` +
    `?terms=${encodeURIComponent(address)}&channel=All`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const raw = await res.text()
  console.debug('[domainApi] Suggest raw response:', raw)

  if (!res.ok) {
    throw new Error(
      `Domain suggest endpoint failed: ${res.status} ${res.statusText}\n${raw}`
    )
  }

  const results = JSON.parse(raw) as SuggestResult[]

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Address not found in Domain database (empty suggest response).')
  }

  // Sort by relativeScore descending and take the best match
  const sorted = [...results].sort((a, b) => b.relativeScore - a.relativeScore)
  const best = sorted[0]

  if (best.relativeScore < 50) {
    throw new Error(
      `Address not found in Domain database (best relativeScore was ${best.relativeScore}, below threshold of 50).`
    )
  }

  console.debug(`[domainApi] Resolved to propertyId: ${best.id} (score: ${best.relativeScore})`)
  return best.id
}

// ---------------------------------------------------------------------------
// Step 2: Property details
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDetails(raw: any): { address: DomainAddress; details: DomainDetails } {
  const addr = raw?.address ?? {}
  const photos: string[] = []

  if (Array.isArray(raw?.photos)) {
    for (const p of raw.photos.slice(0, 3)) {
      const url = p?.url ?? p?.fullUrl ?? p?.thumbnailUrl ?? null
      if (url) photos.push(url as string)
    }
  }

  const address: DomainAddress = {
    full: [
      addr.streetNumber,
      addr.streetName,
      addr.streetType,
      addr.suburb,
      addr.state,
      addr.postcode,
    ]
      .filter(Boolean)
      .join(' '),
    streetNumber: addr.streetNumber ?? null,
    streetName: [addr.streetName, addr.streetType].filter(Boolean).join(' ') || null,
    suburb: addr.suburb ?? null,
    state: addr.state ?? null,
    postcode: addr.postcode ?? null,
  }

  const details: DomainDetails = {
    propertyType: raw?.propertyType ?? raw?.type ?? null,
    bedrooms: raw?.bedrooms ?? null,
    bathrooms: raw?.bathrooms ?? null,
    carspaces: raw?.carSpaces ?? raw?.carspaces ?? null,
    landArea: raw?.landArea ?? raw?.areaSize ?? null,
    buildingArea: raw?.buildingArea ?? null,
    yearBuilt: raw?.yearBuilt ?? null,
    features: Array.isArray(raw?.features) ? (raw.features as string[]) : [],
    photos,
  }

  return { address, details }
}

async function fetchPropertyDetails(
  propertyId: string,
  token: string,
  warnings: string[]
): Promise<{ address: DomainAddress; details: DomainDetails }> {
  const url = `${API_BASE}/v1/properties/${propertyId}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[domainApi] Property details response body:', text)
    warnings.push(
      `Property details unavailable: ${res.status} ${res.statusText}`
    )
    return {
      address: {
        full: '',
        streetNumber: null,
        streetName: null,
        suburb: null,
        state: null,
        postcode: null,
      },
      details: {
        propertyType: null,
        bedrooms: null,
        bathrooms: null,
        carspaces: null,
        landArea: null,
        buildingArea: null,
        yearBuilt: null,
        features: [],
        photos: [],
      },
    }
  }

  const raw = await res.json()
  return extractDetails(raw)
}

// ---------------------------------------------------------------------------
// Step 3: Price history
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPriceData(raw: any): DomainPriceData {
  const history: PriceEntry[] = []

  if (Array.isArray(raw?.priceHistory)) {
    for (const entry of raw.priceHistory) {
      history.push({
        date: entry?.date ?? '',
        price: entry?.price ?? 0,
        type: entry?.type ?? 'Sale',
      })
    }
  }

  // lastSoldPrice/lastSoldDate may be nested under priceHistory[0] for Sale type
  const lastSale = history.find(h => h.type === 'Sale')

  return {
    estimatedValue: raw?.estimatedValue ?? raw?.avm?.value ?? null,
    estimatedValueLow: raw?.estimatedValueLow ?? raw?.avm?.low ?? null,
    estimatedValueHigh: raw?.estimatedValueHigh ?? raw?.avm?.high ?? null,
    lastSoldDate: raw?.lastSoldDate ?? lastSale?.date ?? null,
    lastSoldPrice: raw?.lastSoldPrice ?? lastSale?.price ?? null,
    priceHistory: history,
    daysOnMarket: raw?.daysOnMarket ?? null,
  }
}

async function fetchPriceDetails(
  propertyId: string,
  token: string,
  warnings: string[]
): Promise<DomainPriceData> {
  const url = `${API_BASE}/v1/properties/${propertyId}/priceDetails`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[domainApi] Price details response body:', text)

    if (res.status === 403) {
      warnings.push(
        'Price/AVM data not available on current Domain API tier (403 Forbidden).'
      )
    } else {
      warnings.push(
        `Price details unavailable: ${res.status} ${res.statusText}`
      )
    }

    return {
      estimatedValue: null,
      estimatedValueLow: null,
      estimatedValueHigh: null,
      lastSoldDate: null,
      lastSoldPrice: null,
      priceHistory: [],
      daysOnMarket: null,
    }
  }

  const raw = await res.json()
  return extractPriceData(raw)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch full Domain property data for a plain-text Australian address.
 *
 * @param address - e.g. "14 Beach Street, Bondi NSW 2026"
 * @returns Structured property result with warnings for any partial failures.
 */
export async function fetchDomainProperty(address: string): Promise<DomainPropertyResult> {
  const warnings: string[] = []

  try {
    const token = await getAccessToken()
    const propertyId = await resolvePropertyId(address, token)

    const [{ address: resolvedAddress, details }, priceData] = await Promise.all([
      fetchPropertyDetails(propertyId, token, warnings),
      fetchPriceDetails(propertyId, token, warnings),
    ])

    return {
      propertyId,
      address: resolvedAddress,
      details,
      priceData,
      warnings,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Auth and address resolution errors are fatal — rethrow
    throw new Error(`[domainApi] Failed to fetch property: ${message}`)
  }
}
