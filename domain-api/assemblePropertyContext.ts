/**
 * assemblePropertyContext.ts
 *
 * Assembles a complete property intelligence context object by calling
 * all available data APIs in parallel with graceful degradation.
 *
 * Required environment variables:
 *   DOMAIN_CLIENT_ID, DOMAIN_CLIENT_SECRET
 *   GOOGLE_MAPS_API_KEY
 *   PROPTECHDATA_API_KEY
 *   ANTHROPIC_API_KEY  (used by evaluateProperty.ts)
 *
 * Optional:
 *   DEBUG=true   — verbose per-call logging
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertyAddress {
  full: string
  streetNumber: string
  streetName: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
}

export interface PropertyData {
  propertyId: string | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  carspaces: number | null
  landArea: number | null
  buildingArea: number | null
  yearBuilt: number | null
  features: string[]
  photos: string[]
  streetViewUrl: string
}

export interface PricingData {
  lastSoldDate: string | null
  lastSoldPrice: number | null
  estimatedValue: number | null
  estimatedValueLow: number | null
  estimatedValueHigh: number | null
  priceHistory: Array<{ date: string; price: number; type: string }>
}

export interface SuburbStats {
  medianPrice: number | null
  priceGrowth1yr: number | null
  priceGrowth3yr: number | null
  priceGrowth5yr: number | null
  priceGrowth10yr: number | null
  daysOnMarket: number | null
  vacancyRate: number | null
  rentalYield: number | null
  ownerOccupierRatio: number | null
  salesVolume: number | null
  medianRent: number | null
}

export interface Demographics {
  medianHouseholdIncome: number | null
  ownerOccupierPct: number | null
  renterPct: number | null
  medianMortgageRepayment: number | null
  medianWeeklyRent: number | null
  medianAge: number | null
}

export interface LocationData {
  transitDurationMins: number | null
  drivingDurationMins: number | null
  transitDistanceKm: number | null
  nearMainRoad: boolean
  nearestRoadName: string | null
  nearestRoadDistanceMetres: number | null
  eateries500m: number
  schools1500m: number
  nearestSchools: Array<{ name: string; distanceMetres: number }>
  trainStations1500m: number
  nearestTrainStation: { name: string; distanceMetres: number } | null
  supermarkets1km: number
}

export interface PlanningData {
  subjectZone: string | null
  adjacentZones: string[]
  densityRisk: boolean
  heritageOverlay: boolean
  inFloodZone: boolean
  floodCategory: string | null
  inBushfireProneLand: boolean
  bushfireBAL: string | null
  elevationAHD: number | null
  lowLyingRisk: boolean
  nearbyDAsCount: number
  hasLargeDevelopmentNearby: boolean
  recentDAs: Array<{ applicationNumber: string; description: string; lodgedDate: string; status: string }>
}

export interface NeighbourhoodData {
  socialHousingNearby: boolean
  industrialZoneNearby: boolean
  pubNearby: boolean
  substationNearby: boolean
  osmNearbyFeatures: Array<{ type: string; name: string; distanceMetres: number }>
}

export interface BlockData {
  rearAspect: 'North' | 'East' | 'South' | 'West' | null
  rearAspectBearing: number | null
  rearAspectRating: 'GOLDEN_FLAG' | 'GREEN_FLAG' | 'FIXABLE' | 'RED_FLAG' | null
}

export interface SchoolRecord {
  name: string
  type: string
  sector: string
  icsea: number
  icseaPercentile: number
  suburb: string
  postcode: string
}

export interface PropertyContext {
  fetchedAt: string
  address: PropertyAddress
  property: PropertyData
  pricing: PricingData
  suburbStats: SuburbStats
  demographics: Demographics
  location: LocationData
  planning: PlanningData
  neighbourhood: NeighbourhoodData
  block: BlockData
  schools: SchoolRecord[]
  warnings: string[]
  dataCompleteness: number
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const DEBUG = process.env.DEBUG === 'true'

function log(msg: string): void {
  if (DEBUG) console.log(`[assemble] ${msg}`)
}

function logError(msg: string, body?: string): void {
  console.error(`[assemble] ERROR: ${msg}`)
  if (DEBUG && body) console.error(`[assemble] Body: ${body}`)
}

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Compass bearing from point A to point B, in degrees 0–360 */
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function bearingToAspect(deg: number): { aspect: 'North' | 'East' | 'South' | 'West'; rating: 'GOLDEN_FLAG' | 'GREEN_FLAG' | 'FIXABLE' | 'RED_FLAG' } {
  if (deg >= 315 || deg < 45) return { aspect: 'North', rating: 'GOLDEN_FLAG' }
  if (deg >= 45 && deg < 135) return { aspect: 'East', rating: 'GREEN_FLAG' }
  if (deg >= 135 && deg < 225) return { aspect: 'South', rating: 'RED_FLAG' }
  return { aspect: 'West', rating: 'FIXABLE' }
}

/** Centroid of the first polygon ring */
function polygonCentroid(rings: number[][][]): [number, number] {
  const ring = rings[0]
  let x = 0, y = 0
  for (const [px, py] of ring) { x += px; y += py }
  return [x / ring.length, y / ring.length]
}

/** Midpoint of an edge */
function edgeMidpoint(p1: number[], p2: number[]): [number, number] {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Wrap a promise with a per-call timeout; resolves null on timeout */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  const timeout = new Promise<null>(resolve => setTimeout(() => {
    log(`Timeout: ${label} exceeded ${ms}ms`)
    resolve(null)
  }, ms))
  return Promise.race([promise, timeout])
}

const COASTAL_KEYWORDS = ['Beach', 'Bay', 'Cove', 'Harbour', 'Harbor', 'Point', 'Heads', 'Inlet', 'Coast']

function isCoastalSuburb(suburb: string, postcode: string): boolean {
  if (COASTAL_KEYWORDS.some(k => suburb.toLowerCase().includes(k.toLowerCase()))) return true
  // NSW coastal postcodes roughly 2000–2099, 2250–2263, 2480–2489, 2530–2540
  const pc = parseInt(postcode, 10)
  return (pc >= 2000 && pc <= 2099) || (pc >= 2250 && pc <= 2263) || (pc >= 2480 && pc <= 2489) || (pc >= 2530 && pc <= 2540)
}

// ---------------------------------------------------------------------------
// Domain OAuth2 token cache
// ---------------------------------------------------------------------------

interface TokenCache { token: string; expiresAt: number }
let _domainTokenCache: TokenCache | null = null

async function getDomainToken(): Promise<string | null> {
  const now = Date.now()
  if (_domainTokenCache && _domainTokenCache.expiresAt - now > 60_000) {
    return _domainTokenCache.token
  }
  const id = process.env.DOMAIN_CLIENT_ID
  const secret = process.env.DOMAIN_CLIENT_SECRET
  if (!id || !secret) return null

  try {
    const t0 = Date.now()
    const res = await fetch('https://auth.domain.com.au/v1/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: id,
        client_secret: secret,
        scope: 'api_listings_read api_properties_read',
      }).toString(),
    })
    log(`Domain auth: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      const body = await res.text()
      logError(`Domain OAuth2 failed: ${res.status}`, body)
      return null
    }
    const data = await res.json() as { access_token: string; expires_in: number }
    _domainTokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 }
    return _domainTokenCache.token
  } catch (e) {
    logError(`Domain OAuth2 exception: ${e}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Step 1a: Geocode
// ---------------------------------------------------------------------------

interface GeocodeResult {
  lat: number
  lng: number
  suburb: string
  state: string
  postcode: string
  streetNumber: string
  streetName: string
  formattedAddress: string
  council: string | null
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not set.')

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
  log(`Geocoding: ${address}`)
  const t0 = Date.now()
  const res = await fetch(url)
  log(`Geocode response: ${res.status} (${Date.now() - t0}ms)`)

  if (!res.ok) throw new Error(`Geocoding failed: ${res.status} ${res.statusText}`)
  const data = await res.json() as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } }; formatted_address: string; address_components: Array<{ types: string[]; long_name: string; short_name: string }> }> }

  if (data.status !== 'OK' || !data.results.length) {
    throw new Error('Address could not be geocoded — check the address format and try again.')
  }

  const result = data.results[0]
  const loc = result.geometry.location
  const components = result.address_components

  const get = (type: string, short = false) =>
    components.find(c => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] ?? ''

  return {
    lat: loc.lat,
    lng: loc.lng,
    suburb: get('locality') || get('sublocality'),
    state: get('administrative_area_level_1', true),
    postcode: get('postal_code'),
    streetNumber: get('street_number'),
    streetName: get('route'),
    formattedAddress: result.formatted_address,
    council: get('administrative_area_level_2') || null,
  }
}

// ---------------------------------------------------------------------------
// Step 1b: Domain property ID
// ---------------------------------------------------------------------------

async function resolveDomainPropertyId(address: string, token: string): Promise<string | null> {
  const url = `https://api.domain.com.au/v1/properties/_suggest?terms=${encodeURIComponent(address)}&channel=All`
  log(`Domain suggest: ${address}`)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    log(`Domain suggest: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) return null
    const results = await res.json() as Array<{ id: string; relativeScore: number }>
    if (!Array.isArray(results) || !results.length) return null
    const best = results.sort((a, b) => b.relativeScore - a.relativeScore)[0]
    if (best.relativeScore < 50) return null
    log(`Domain propertyId: ${best.id} (score ${best.relativeScore})`)
    return best.id
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Step 2a: Domain property details
// ---------------------------------------------------------------------------

async function fetchDomainDetails(propertyId: string, token: string, warnings: string[]): Promise<Partial<PropertyData>> {
  const url = `https://api.domain.com.au/v1/properties/${propertyId}`
  log(`Domain details: ${propertyId}`)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    log(`Domain details: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      const body = await res.text()
      logError(`Domain details ${res.status}`, body)
      warnings.push(`Property details unavailable — Domain API returned ${res.status} — verify property specs manually on domain.com.au`)
      return {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await res.json() as any
    const photos: string[] = []
    if (Array.isArray(raw?.photos)) {
      for (const p of raw.photos.slice(0, 3)) {
        const u = p?.url ?? p?.fullUrl ?? p?.thumbnailUrl ?? null
        if (u) photos.push(u as string)
      }
    }
    return {
      propertyType: raw?.propertyType ?? raw?.type ?? null,
      bedrooms: raw?.bedrooms ?? null,
      bathrooms: raw?.bathrooms ?? null,
      carspaces: raw?.carSpaces ?? raw?.carspaces ?? null,
      landArea: raw?.landArea ?? raw?.areaSize ?? null,
      buildingArea: raw?.buildingArea ?? null,
      yearBuilt: raw?.yearBuilt ?? null,
      features: Array.isArray(raw?.features) ? raw.features : [],
      photos,
    }
  } catch (e) {
    warnings.push(`Property details unavailable — network error: ${e} — verify specs manually`)
    return {}
  }
}

// ---------------------------------------------------------------------------
// Step 2b: Domain price history
// ---------------------------------------------------------------------------

async function fetchDomainPricing(propertyId: string, token: string, warnings: string[]): Promise<Partial<PricingData>> {
  const url = `https://api.domain.com.au/v1/properties/${propertyId}/priceDetails`
  log(`Domain pricing: ${propertyId}`)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    log(`Domain pricing: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      const body = await res.text()
      logError(`Domain pricing ${res.status}`, body)
      const reason = res.status === 403 ? 'requires higher API tier' : `HTTP ${res.status}`
      warnings.push(`AVM / price history unavailable — ${reason} — check prior sales on domain.com.au manually`)
      warnings.push('Estimated value (AVM) not available — Domain free tier does not include AVM — obtain independent valuation')
      return {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await res.json() as any
    const history: PricingData['priceHistory'] = []
    if (Array.isArray(raw?.priceHistory)) {
      for (const e of raw.priceHistory) {
        history.push({ date: e?.date ?? '', price: e?.price ?? 0, type: e?.type ?? 'Sale' })
      }
    }
    const lastSale = history.find(h => h.type === 'Sale')
    if (!raw?.estimatedValue && !raw?.avm?.value) {
      warnings.push('Estimated value (AVM) not returned by Domain — may require higher API tier — obtain independent valuation')
    }
    return {
      estimatedValue: raw?.estimatedValue ?? raw?.avm?.value ?? null,
      estimatedValueLow: raw?.estimatedValueLow ?? raw?.avm?.low ?? null,
      estimatedValueHigh: raw?.estimatedValueHigh ?? raw?.avm?.high ?? null,
      lastSoldDate: raw?.lastSoldDate ?? lastSale?.date ?? null,
      lastSoldPrice: raw?.lastSoldPrice ?? lastSale?.price ?? null,
      priceHistory: history,
    }
  } catch (e) {
    warnings.push(`Price history unavailable — network error: ${e} — check domain.com.au manually`)
    return {}
  }
}

// ---------------------------------------------------------------------------
// Step 2c: PropTechData suburb stats
// ---------------------------------------------------------------------------

async function fetchSuburbStats(suburb: string, state: string, warnings: string[]): Promise<SuburbStats> {
  const blank: SuburbStats = {
    medianPrice: null, priceGrowth1yr: null, priceGrowth3yr: null,
    priceGrowth5yr: null, priceGrowth10yr: null, daysOnMarket: null,
    vacancyRate: null, rentalYield: null, ownerOccupierRatio: null,
    salesVolume: null, medianRent: null,
  }
  const key = process.env.PROPTECHDATA_API_KEY
  if (!key) {
    warnings.push('Suburb growth statistics unavailable — PROPTECHDATA_API_KEY not set — Capital growth dimension will be partially assessed')
    return blank
  }
  const url = `https://api.proptechdata.com.au/suburbs/stats?suburb=${encodeURIComponent(suburb)}&state=${encodeURIComponent(state)}&propertyType=house`
  log(`PropTechData: ${suburb} ${state}`)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } })
    log(`PropTechData: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      const body = await res.text()
      logError(`PropTechData ${res.status}`, body)
      warnings.push('Suburb growth statistics unavailable — PropTechData API error — Capital growth dimension will be partially assessed')
      return blank
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await res.json() as any
    return {
      medianPrice: d?.medianPrice ?? null,
      priceGrowth1yr: d?.priceGrowth1yr ?? null,
      priceGrowth3yr: d?.priceGrowth3yr ?? null,
      priceGrowth5yr: d?.priceGrowth5yr ?? null,
      priceGrowth10yr: d?.priceGrowth10yr ?? null,
      daysOnMarket: d?.daysOnMarket ?? null,
      vacancyRate: d?.vacancyRate ?? null,
      rentalYield: d?.rentalYield ?? null,
      ownerOccupierRatio: d?.ownerOccupierRatio ?? null,
      salesVolume: d?.salesVolume ?? null,
      medianRent: d?.medianRent ?? null,
    }
  } catch (e) {
    warnings.push(`Suburb growth statistics unavailable — network error: ${e} — Capital growth dimension will be partially assessed`)
    return blank
  }
}

// ---------------------------------------------------------------------------
// Step 2d: ABS demographics
// ---------------------------------------------------------------------------

async function fetchDemographics(suburb: string, state: string, warnings: string[]): Promise<Demographics> {
  const blank: Demographics = {
    medianHouseholdIncome: null, ownerOccupierPct: null, renterPct: null,
    medianMortgageRepayment: null, medianWeeklyRent: null, medianAge: null,
  }

  // Try local file first
  const localFile = resolve(__dirname, 'data', 'abs-suburb-stats.json')
  if (existsSync(localFile)) {
    try {
      const raw = JSON.parse(readFileSync(localFile, 'utf8')) as Record<string, Demographics>
      const key = `${suburb.toUpperCase()}_${state.toUpperCase()}`
      if (raw[key]) {
        log(`ABS demographics: loaded from local file for ${key}`)
        return raw[key]
      }
    } catch {
      // fall through to API
    }
  }

  // ABS API fallback (requires SA2 code — skip if unavailable)
  warnings.push('ABS demographics unavailable — local data/abs-suburb-stats.json not found and SA2 code resolution not available — check ABS Census data manually at abs.gov.au')
  return blank
}

// ---------------------------------------------------------------------------
// Step 2e: Google Places — Nearby Amenities
// ---------------------------------------------------------------------------

interface PlaceResult { name: string; distanceMetres: number; rating?: number }

async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  type: string,
  radius: number,
  label: string,
  key: string,
  warnings: string[]
): Promise<PlaceResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${encodeURIComponent(type)}&key=${key}`
  log(`Places (${label}): r=${radius}m`)
  const t0 = Date.now()
  try {
    const res = await fetch(url)
    log(`Places (${label}): ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      const body = await res.text()
      logError(`Places ${label} ${res.status}`, body)
      warnings.push(`Nearby ${label} data unavailable — Google Places API error ${res.status} — verify amenities manually`)
      return []
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { results: any[] }
    return (data.results ?? []).map(p => ({
      name: p.name as string,
      distanceMetres: haversineMetres(lat, lng, p.geometry?.location?.lat ?? lat, p.geometry?.location?.lng ?? lng),
      rating: p.rating as number | undefined,
    })).sort((a, b) => a.distanceMetres - b.distanceMetres)
  } catch (e) {
    warnings.push(`Nearby ${label} data unavailable — network error: ${e}`)
    return []
  }
}

async function fetchAllAmenities(lat: number, lng: number, warnings: string[]): Promise<{
  eateries: PlaceResult[]
  schools: PlaceResult[]
  trainStations: PlaceResult[]
  busStops: PlaceResult[]
  supermarkets: PlaceResult[]
}> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    warnings.push('Nearby amenities unavailable — GOOGLE_MAPS_API_KEY not set — assess walkability manually')
    return { eateries: [], schools: [], trainStations: [], busStops: [], supermarkets: [] }
  }

  // 100ms stagger to respect Google free-tier rate limits
  const [eateries, schools, trainStations, busStops, supermarkets] = await Promise.all([
    fetchNearbyPlaces(lat, lng, 'cafe|restaurant', 500, 'eateries', key, warnings),
    delay(100).then(() => fetchNearbyPlaces(lat, lng, 'school', 1500, 'schools', key, warnings)),
    delay(200).then(() => fetchNearbyPlaces(lat, lng, 'train_station|subway_station', 1500, 'train stations', key, warnings)),
    delay(300).then(() => fetchNearbyPlaces(lat, lng, 'bus_station', 500, 'bus stops', key, warnings)),
    delay(400).then(() => fetchNearbyPlaces(lat, lng, 'supermarket|grocery_or_supermarket', 1000, 'supermarkets', key, warnings)),
  ])

  return { eateries, schools, trainStations, busStops, supermarkets }
}

// ---------------------------------------------------------------------------
// Step 2f: Google Distance Matrix — Commute times
// ---------------------------------------------------------------------------

async function fetchCommuteTimes(lat: number, lng: number, warnings: string[]): Promise<{ transit: number | null; driving: number | null; distanceKm: number | null }> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    warnings.push('Commute times unavailable — GOOGLE_MAPS_API_KEY not set — estimate commute manually')
    return { transit: null, driving: null, distanceKm: null }
  }

  const base = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=Sydney+CBD,Australia&key=${key}`
  log('Distance matrix: transit + driving')
  const t0 = Date.now()
  try {
    const [transitRes, drivingRes] = await Promise.all([
      fetch(`${base}&mode=transit&departure_time=now`),
      delay(100).then(() => fetch(`${base}&mode=driving`)),
    ])
    log(`Distance matrix: ${Date.now() - t0}ms`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseMatrix = async (res: Response): Promise<{ durationMins: number | null; distanceKm: number | null }> => {
      if (!res.ok) return { durationMins: null, distanceKm: null }
      const d = await res.json() as { rows: Array<{ elements: Array<{ duration: { value: number }; distance: { value: number }; status: string }> }> }
      const el = d?.rows?.[0]?.elements?.[0]
      if (!el || el.status !== 'OK') return { durationMins: null, distanceKm: null }
      return {
        durationMins: Math.round(el.duration.value / 60),
        distanceKm: Math.round(el.distance.value / 100) / 10,
      }
    }

    const [transit, driving] = await Promise.all([parseMatrix(transitRes), parseMatrix(drivingRes)])
    return { transit: transit.durationMins, driving: driving.durationMins, distanceKm: transit.distanceKm }
  } catch (e) {
    warnings.push(`Commute times unavailable — network error: ${e} — estimate manually`)
    return { transit: null, driving: null, distanceKm: null }
  }
}

// ---------------------------------------------------------------------------
// Step 2g: NSW Planning — Zoning
// ---------------------------------------------------------------------------

async function fetchNSWZoning(lat: number, lng: number, warnings: string[]): Promise<{ subjectZone: string | null; adjacentZones: string[]; densityRisk: boolean; heritageOverlay: boolean }> {
  const blank = { subjectZone: null, adjacentZones: [], densityRisk: false, heritageOverlay: false }
  const mapExtent = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`
  const url = `https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/identify?geometry=${lng},${lat}&geometryType=esriGeometryPoint&layers=all&tolerance=80&mapExtent=${mapExtent}&imageDisplay=800,600,96&returnGeometry=false&f=json`
  log('NSW zoning query')
  const t0 = Date.now()
  try {
    const res = await fetch(url)
    log(`NSW zoning: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      warnings.push(`NSW zoning data unavailable — ArcGIS returned ${res.status} — check NSW Planning Portal manually`)
      return blank
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { results?: any[] }
    if (!data.results?.length) return blank

    const DENSITY_ZONES = new Set(['R3', 'R4', 'B1', 'B2', 'B3', 'B4'])
    const zones: string[] = []
    let heritageOverlay = false

    for (const r of data.results) {
      const attrs = r.attributes ?? {}
      const zone = attrs.SYM_CODE ?? attrs.LAY_CLASS ?? attrs.ZONE_CODE ?? attrs.EPI_NAME ?? ''
      if (zone) zones.push(zone as string)
      const layerName = (r.layerName ?? '').toLowerCase()
      if (layerName.includes('heritage')) heritageOverlay = true
    }

    const uniqueZones = [...new Set(zones)]
    // The most precise result (smallest tolerance hit) is usually index 0
    const subjectZone = uniqueZones[0] ?? null
    const adjacentZones = uniqueZones.slice(1)
    const densityRisk = adjacentZones.some(z => DENSITY_ZONES.has(z))

    return { subjectZone, adjacentZones, densityRisk, heritageOverlay }
  } catch (e) {
    warnings.push(`NSW zoning data unavailable — network error: ${e} — check NSW Planning Portal manually`)
    return blank
  }
}

// ---------------------------------------------------------------------------
// Step 2h: NSW Planning — Flood + Bushfire
// ---------------------------------------------------------------------------

async function fetchNSWHazards(lat: number, lng: number, warnings: string[]): Promise<{ inFloodZone: boolean; floodCategory: string | null; inBushfireProneLand: boolean; bushfireBAL: string | null }> {
  const mapExtent = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`
  const baseParams = `geometry=${lng},${lat}&geometryType=esriGeometryPoint&layers=all&tolerance=5&mapExtent=${mapExtent}&imageDisplay=800,600,96&returnGeometry=false&f=json`

  log('NSW flood + bushfire query')
  const t0 = Date.now()
  try {
    const [floodRes, fireRes] = await Promise.all([
      fetch(`https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Flood/MapServer/identify?${baseParams}`),
      fetch(`https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer/identify?${baseParams}`),
    ])
    log(`NSW hazards: ${Date.now() - t0}ms`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const floodData = floodRes.ok ? await floodRes.json() as { results?: any[] } : { results: [] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fireData = fireRes.ok ? await fireRes.json() as { results?: any[] } : { results: [] }

    const inFloodZone = !!(floodData.results?.length)
    const floodCategory = floodData.results?.[0]?.attributes?.FLOOD_CLASS ?? floodData.results?.[0]?.attributes?.FLOOD_PLAN_LEVEL ?? null

    const inBushfireProneLand = !!(fireData.results?.length)
    const bushfireBAL = fireData.results?.[0]?.attributes?.BAL_RATING ?? fireData.results?.[0]?.attributes?.BAL ?? null

    return { inFloodZone, floodCategory, inBushfireProneLand, bushfireBAL }
  } catch (e) {
    warnings.push(`NSW flood/bushfire data unavailable — network error: ${e} — check NSW Planning Portal manually`)
    return { inFloodZone: false, floodCategory: null, inBushfireProneLand: false, bushfireBAL: null }
  }
}

// ---------------------------------------------------------------------------
// Step 2i: Elevation
// ---------------------------------------------------------------------------

async function fetchElevation(lat: number, lng: number, warnings: string[]): Promise<number | null> {
  log('Elevation query')
  const t0 = Date.now()
  try {
    const res = await fetch(`https://elevation.fsdf.org.au/api/v1/lidar?lat=${lat}&lon=${lng}`)
    log(`Elevation: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      warnings.push(`Elevation data unavailable — Geoscience Australia API returned ${res.status} — check elevation manually if near coast`)
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    return data?.results?.[0]?.elevation ?? data?.elevation ?? null
  } catch (e) {
    warnings.push(`Elevation data unavailable — network error: ${e} — verify manually if near coast`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Step 2j: NSW Development Applications
// ---------------------------------------------------------------------------

async function fetchNearbyDAs(lat: number, lng: number, council: string | null, warnings: string[]): Promise<{ count: number; recentDAs: PlanningData['recentDAs']; hasLargeDevelopment: boolean }> {
  if (!council) {
    warnings.push('Development Applications unavailable — council name not resolved from geocoding — check council DA tracker manually')
    return { count: 0, recentDAs: [], hasLargeDevelopment: false }
  }

  const filters = JSON.stringify([
    { name: 'CouncilName', values: [council] },
    { name: 'ApplicationType', values: ['Development Application'] },
  ])
  const url = `https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA?filters=${encodeURIComponent(filters)}&PageSize=50&PageNumber=1`
  log(`NSW DAs: ${council}`)
  const t0 = Date.now()
  try {
    const res = await fetch(url)
    log(`NSW DAs: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      warnings.push(`Development Applications unavailable — NSW Planning API returned ${res.status} — check ${council} council DA tracker manually`)
      return { count: 0, recentDAs: [], hasLargeDevelopment: false }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { Application?: any[] }
    const all = data?.Application ?? []

    const LARGE_DEV_KEYWORDS = ['residential flat building', 'mixed use', 'apartment', 'multi-dwelling', 'demolish']

    // Filter to within 300m where possible
    const nearby = all.filter(da => {
      const daLat = da?.Location?.[0]?.Y ?? da?.Latitude ?? null
      const daLng = da?.Location?.[0]?.X ?? da?.Longitude ?? null
      if (!daLat || !daLng) return true // include if no coords (can't filter)
      return haversineMetres(lat, lng, daLat, daLng) <= 300
    })

    const hasLargeDevelopment = nearby.some(da => {
      const desc = (da?.ApplicationType ?? da?.DevelopmentDescription ?? '').toLowerCase()
      return LARGE_DEV_KEYWORDS.some(k => desc.includes(k))
    })

    const recentDAs = nearby.slice(0, 5).map(da => ({
      applicationNumber: da?.ApplicationNumber ?? '',
      description: da?.DevelopmentDescription ?? da?.ApplicationType ?? '',
      lodgedDate: da?.LodgementDate ?? '',
      status: da?.ApplicationStatus ?? '',
    }))

    return { count: nearby.length, recentDAs, hasLargeDevelopment }
  } catch (e) {
    warnings.push(`Development Applications unavailable — network error: ${e} — check council DA tracker manually`)
    return { count: 0, recentDAs: [], hasLargeDevelopment: false }
  }
}

// ---------------------------------------------------------------------------
// Step 2k: OSM Overpass — Sensitive features
// ---------------------------------------------------------------------------

async function fetchOSMFeatures(lat: number, lng: number, warnings: string[]): Promise<NeighbourhoodData> {
  const blank: NeighbourhoodData = { socialHousingNearby: false, industrialZoneNearby: false, pubNearby: false, substationNearby: false, osmNearbyFeatures: [] }
  const query = `[out:json];(node["social_facility"](around:500,${lat},${lng});node["amenity"="social_facility"](around:500,${lat},${lng});node["landuse"="industrial"](around:400,${lat},${lng});way["landuse"="industrial"](around:400,${lat},${lng});node["amenity"="pub"](around:200,${lat},${lng});node["amenity"="nightclub"](around:300,${lat},${lng});node["power"="substation"](around:300,${lat},${lng}););out body;`
  log('OSM Overpass query')
  const t0 = Date.now()
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    log(`OSM Overpass: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      warnings.push(`OSM neighbourhood data unavailable — Overpass API returned ${res.status} — check Google Maps manually for pubs/industrial areas`)
      return blank
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { elements: any[] }
    const features: NeighbourhoodData['osmNearbyFeatures'] = []
    let socialHousingNearby = false
    let industrialZoneNearby = false
    let pubNearby = false
    let substationNearby = false

    for (const el of data.elements ?? []) {
      const tags = el.tags ?? {}
      const elLat = el.lat ?? el.center?.lat ?? null
      const elLng = el.lon ?? el.center?.lon ?? null
      const dist = elLat && elLng ? Math.round(haversineMetres(lat, lng, elLat, elLng)) : 0
      const name = tags.name ?? tags.amenity ?? tags.landuse ?? tags.power ?? 'unknown'
      const type = tags.social_facility ?? tags.amenity ?? tags.landuse ?? tags.power ?? 'unknown'

      features.push({ type, name, distanceMetres: dist })

      if (tags.social_facility || tags.amenity === 'social_facility') socialHousingNearby = true
      if (tags.landuse === 'industrial') industrialZoneNearby = true
      if (tags.amenity === 'pub' || tags.amenity === 'nightclub') pubNearby = true
      if (tags.power === 'substation') substationNearby = true
    }

    return { socialHousingNearby, industrialZoneNearby, pubNearby, substationNearby, osmNearbyFeatures: features }
  } catch (e) {
    warnings.push(`OSM neighbourhood data unavailable — network error: ${e} — check Google Maps manually`)
    return blank
  }
}

// ---------------------------------------------------------------------------
// Step 2l: Block orientation from NSW LPI Cadastre
// ---------------------------------------------------------------------------

async function fetchBlockOrientation(lat: number, lng: number, warnings: string[]): Promise<BlockData> {
  const blank: BlockData = { rearAspect: null, rearAspectBearing: null, rearAspectRating: null }
  const url = `https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_Cadastre_Sydney/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&f=json`
  log('NSW Cadastre query')
  const t0 = Date.now()
  try {
    const res = await fetch(url)
    log(`NSW Cadastre: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      warnings.push('Block orientation could not be calculated — cadastre data unavailable — Verify north-facing rear yard on inspection')
      return blank
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { features?: any[] }
    const feature = data.features?.[0]
    if (!feature?.geometry?.rings?.length) {
      warnings.push('Block orientation could not be calculated — no cadastre polygon found — Verify north-facing rear yard on inspection')
      return blank
    }

    const rings: number[][][] = feature.geometry.rings
    const [centLng, centLat] = polygonCentroid(rings)
    const ring = rings[0]

    // Find the street frontage edge (closest edge to the input lat/lng point, which is typically on the street side)
    let frontageEdgeIdx = 0
    let minDist = Infinity
    for (let i = 0; i < ring.length - 1; i++) {
      const mid = edgeMidpoint(ring[i], ring[i + 1])
      const d = haversineMetres(lat, lng, mid[1], mid[0])
      if (d < minDist) { minDist = d; frontageEdgeIdx = i }
    }

    // Rear edge is roughly opposite — offset by half the ring length
    const rearEdgeIdx = (frontageEdgeIdx + Math.floor((ring.length - 1) / 2)) % (ring.length - 1)
    const rearMid = edgeMidpoint(ring[rearEdgeIdx], ring[rearEdgeIdx + 1])
    const bearing = bearingDeg(centLat, centLng, rearMid[1], rearMid[0])
    const { aspect, rating } = bearingToAspect(bearing)

    log(`Block aspect: ${aspect} (${bearing.toFixed(1)}°) → ${rating}`)
    return { rearAspect: aspect, rearAspectBearing: Math.round(bearing), rearAspectRating: rating }
  } catch (e) {
    warnings.push(`Block orientation could not be calculated — cadastre data unavailable — Verify north-facing rear yard on inspection`)
    return blank
  }
}

// ---------------------------------------------------------------------------
// Step 2n: Main road proximity
// ---------------------------------------------------------------------------

async function fetchRoadProximity(lat: number, lng: number, warnings: string[]): Promise<{ nearMainRoad: boolean; nearestRoadName: string | null; nearestRoadDistanceMetres: number | null }> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    warnings.push('Road proximity data unavailable — GOOGLE_MAPS_API_KEY not set — verify road proximity manually')
    return { nearMainRoad: false, nearestRoadName: null, nearestRoadDistanceMetres: null }
  }

  const ARTERIAL_KEYWORDS = ['Road', 'Highway', 'Parade', 'Boulevard', 'Avenue', 'Motorway', 'Freeway']
  log('Roads API query')
  const t0 = Date.now()
  try {
    const res = await fetch(`https://roads.googleapis.com/v1/nearestRoads?points=${lat},${lng}&key=${key}`)
    log(`Roads API: ${res.status} (${Date.now() - t0}ms)`)
    if (!res.ok) {
      warnings.push(`Road proximity data unavailable — Roads API returned ${res.status} — verify manually`)
      return { nearMainRoad: false, nearestRoadName: null, nearestRoadDistanceMetres: null }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { snappedPoints?: any[] }
    const nearest = data.snappedPoints?.[0]
    if (!nearest) return { nearMainRoad: false, nearestRoadName: null, nearestRoadDistanceMetres: null }

    const roadLat = nearest.location?.latitude ?? lat
    const roadLng = nearest.location?.longitude ?? lng
    const distMetres = Math.round(haversineMetres(lat, lng, roadLat, roadLng))
    const roadName = nearest.placeId ? null : null // placeId would need another call — skip for now

    // Use Places as fallback for road name
    await delay(100)
    const placesRes = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=300&type=route&key=${key}`)
    let nearestRoadName: string | null = null
    let nearMainRoad = false

    if (placesRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd = await placesRes.json() as { results: any[] }
      const first = pd.results?.[0]
      if (first) {
        nearestRoadName = first.name as string
        nearMainRoad = distMetres <= 150 && ARTERIAL_KEYWORDS.some(k => (first.name as string ?? '').includes(k))
      }
    }

    if (distMetres <= 150 && !nearMainRoad) {
      warnings.push(`Road proximity — nearest road is ${distMetres}m away — verify road type manually to confirm noise/traffic impact`)
    }

    return { nearMainRoad, nearestRoadName, nearestRoadDistanceMetres: distMetres }
  } catch (e) {
    warnings.push(`Road proximity data unavailable — network error: ${e} — verify manually`)
    return { nearMainRoad: false, nearestRoadName: null, nearestRoadDistanceMetres: null }
  }
}

// ---------------------------------------------------------------------------
// Step 3a: ACARA schools ICSEA lookup
// ---------------------------------------------------------------------------

async function fetchSchoolData(suburb: string, postcode: string, warnings: string[]): Promise<SchoolRecord[]> {
  const localFile = resolve(__dirname, 'data', 'acara-schools.json')
  if (!existsSync(localFile)) {
    warnings.push('ICSEA data file not found — Download from acara.edu.au/contact-us/acara-data-access and save as data/acara-schools.json')
    return []
  }
  try {
    const raw = JSON.parse(readFileSync(localFile, 'utf8')) as Array<SchoolRecord & { postcode: string; suburb: string }>
    const matches = raw.filter(s =>
      s.postcode === postcode || s.suburb?.toLowerCase() === suburb.toLowerCase()
    )
    return matches.slice(0, 3)
  } catch (e) {
    warnings.push(`ICSEA data unavailable — could not parse acara-schools.json: ${e}`)
    return []
  }
}

// ---------------------------------------------------------------------------
// Data completeness calculation
// ---------------------------------------------------------------------------

function countFields(obj: unknown, depth = 0): { total: number; nonNull: number } {
  if (depth > 4) return { total: 0, nonNull: 0 }
  if (obj === null || obj === undefined) return { total: 1, nonNull: 0 }
  if (Array.isArray(obj)) return { total: 1, nonNull: obj.length > 0 ? 1 : 0 }
  if (typeof obj === 'object') {
    let total = 0, nonNull = 0
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const sub = countFields(v, depth + 1)
        total += sub.total
        nonNull += sub.nonNull
      } else {
        total++
        if (v !== null && v !== undefined) nonNull++
      }
    }
    return { total, nonNull }
  }
  return { total: 1, nonNull: 1 }
}

function calculateCompleteness(ctx: Omit<PropertyContext, 'dataCompleteness' | 'warnings' | 'fetchedAt'>): number {
  const { total, nonNull } = countFields(ctx)
  return Math.round((nonNull / total) * 100)
}

// ---------------------------------------------------------------------------
// Main assembly function
// ---------------------------------------------------------------------------

export async function assemblePropertyContext(address: string): Promise<PropertyContext> {
  const warnings: string[] = []

  // Step 1a: Geocode
  const geo = await geocodeAddress(address)
  const { lat, lng, suburb, state, postcode, streetNumber, streetName, formattedAddress, council } = geo

  // Step 1b: Domain token + propertyId
  const domainToken = await getDomainToken()
  let propertyId: string | null = null
  if (domainToken) {
    propertyId = await resolveDomainPropertyId(address, domainToken)
    if (!propertyId) warnings.push('Property not found in Domain.com.au database — property specs and price history unavailable — verify on domain.com.au manually')
  } else {
    warnings.push('Domain.com.au API credentials not configured — property specs and price history unavailable — set DOMAIN_CLIENT_ID and DOMAIN_CLIENT_SECRET')
  }

  const isNSW = state === 'NSW'
  if (!isNSW) {
    warnings.push('Planning and cadastre data only available for NSW in this version — VIC/QLD support coming soon')
  }

  // Street View URL (no fetch required)
  const streetViewUrl = process.env.GOOGLE_MAPS_API_KEY
    ? `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lng}&heading=0&pitch=0&key=${process.env.GOOGLE_MAPS_API_KEY}`
    : ''

  // Step 2: Fire all parallel fetches with 10s individual timeouts
  log('Launching parallel data fetches...')
  const t0 = Date.now()

  const [
    domainDetailsResult,
    domainPricingResult,
    suburbStatsResult,
    demographicsResult,
    amenitiesResult,
    commuteResult,
    zoningResult,
    hazardsResult,
    elevationResult,
    daResult,
    osmResult,
    blockResult,
    roadResult,
  ] = await Promise.allSettled([
    // 2a: Domain details
    propertyId && domainToken
      ? withTimeout(fetchDomainDetails(propertyId, domainToken, warnings), 10000, 'domain-details')
      : Promise.resolve(null),

    // 2b: Domain pricing
    propertyId && domainToken
      ? withTimeout(fetchDomainPricing(propertyId, domainToken, warnings), 10000, 'domain-pricing')
      : Promise.resolve(null),

    // 2c: PropTechData
    withTimeout(fetchSuburbStats(suburb, state, warnings), 10000, 'proptechdata'),

    // 2d: ABS demographics
    withTimeout(fetchDemographics(suburb, state, warnings), 10000, 'abs-demographics'),

    // 2e: Google Places
    withTimeout(fetchAllAmenities(lat, lng, warnings), 12000, 'google-places'),

    // 2f: Commute times
    withTimeout(fetchCommuteTimes(lat, lng, warnings), 10000, 'distance-matrix'),

    // 2g: NSW Zoning (NSW only)
    isNSW ? withTimeout(fetchNSWZoning(lat, lng, warnings), 10000, 'nsw-zoning') : Promise.resolve(null),

    // 2h: NSW Hazards (NSW only)
    isNSW ? withTimeout(fetchNSWHazards(lat, lng, warnings), 10000, 'nsw-hazards') : Promise.resolve(null),

    // 2i: Elevation
    withTimeout(fetchElevation(lat, lng, warnings), 8000, 'elevation'),

    // 2j: NSW DAs (NSW only)
    isNSW ? withTimeout(fetchNearbyDAs(lat, lng, council, warnings), 12000, 'nsw-das') : Promise.resolve(null),

    // 2k: OSM
    withTimeout(fetchOSMFeatures(lat, lng, warnings), 10000, 'osm-overpass'),

    // 2l: Block orientation (NSW only)
    isNSW ? withTimeout(fetchBlockOrientation(lat, lng, warnings), 8000, 'nsw-cadastre') : Promise.resolve(null),

    // 2n: Road proximity
    withTimeout(fetchRoadProximity(lat, lng, warnings), 10000, 'roads-api'),
  ])

  log(`All parallel fetches completed in ${Date.now() - t0}ms`)

  // Handle any rejected promises (shouldn't happen given individual try/catch, but safety net)
  const safeGet = <T>(result: PromiseSettledResult<T | null>, fallback: T): T => {
    if (result.status === 'rejected') {
      warnings.push(`Data fetch failed unexpectedly: ${result.reason}`)
      return fallback
    }
    return result.value ?? fallback
  }

  const domainDetails = safeGet(domainDetailsResult, {})
  const domainPricing = safeGet(domainPricingResult, {})
  const suburbStats = safeGet(suburbStatsResult, null) ?? {
    medianPrice: null, priceGrowth1yr: null, priceGrowth3yr: null, priceGrowth5yr: null,
    priceGrowth10yr: null, daysOnMarket: null, vacancyRate: null, rentalYield: null,
    ownerOccupierRatio: null, salesVolume: null, medianRent: null,
  } as SuburbStats
  const demographics = safeGet(demographicsResult, null) ?? {
    medianHouseholdIncome: null, ownerOccupierPct: null, renterPct: null,
    medianMortgageRepayment: null, medianWeeklyRent: null, medianAge: null,
  } as Demographics
  const amenities = safeGet(amenitiesResult, null) ?? { eateries: [], schools: [], trainStations: [], busStops: [], supermarkets: [] }
  const commute = safeGet(commuteResult, null) ?? { transit: null, driving: null, distanceKm: null }
  const zoning = safeGet(zoningResult, null) ?? { subjectZone: null, adjacentZones: [], densityRisk: false, heritageOverlay: false }
  const hazards = safeGet(hazardsResult, null) ?? { inFloodZone: false, floodCategory: null, inBushfireProneLand: false, bushfireBAL: null }
  const elevationAHD = safeGet(elevationResult, null)
  const das = safeGet(daResult, null) ?? { count: 0, recentDAs: [], hasLargeDevelopment: false }
  const osm = safeGet(osmResult, null) ?? { socialHousingNearby: false, industrialZoneNearby: false, pubNearby: false, substationNearby: false, osmNearbyFeatures: [] }
  const block = safeGet(blockResult, null) ?? { rearAspect: null, rearAspectBearing: null, rearAspectRating: null }
  const roads = safeGet(roadResult, null) ?? { nearMainRoad: false, nearestRoadName: null, nearestRoadDistanceMetres: null }

  // Step 3: Static data lookups
  const schools = await fetchSchoolData(suburb, postcode, warnings)

  // Coastal/low-lying risk
  const lowLyingRisk = elevationAHD !== null && elevationAHD < 5 && isCoastalSuburb(suburb, postcode)

  // Assemble location data
  const nearestTrainStation = amenities.trainStations[0]
    ? { name: amenities.trainStations[0].name, distanceMetres: Math.round(amenities.trainStations[0].distanceMetres) }
    : null

  const nearestSchoolsList = amenities.schools.slice(0, 3).map(s => ({
    name: s.name,
    distanceMetres: Math.round(s.distanceMetres),
  }))

  // Build the output object
  const ctx: Omit<PropertyContext, 'dataCompleteness' | 'warnings' | 'fetchedAt'> = {
    address: {
      full: formattedAddress,
      streetNumber,
      streetName,
      suburb,
      state,
      postcode,
      lat,
      lng,
    },
    property: {
      propertyId,
      propertyType: (domainDetails as Partial<PropertyData>).propertyType ?? null,
      bedrooms: (domainDetails as Partial<PropertyData>).bedrooms ?? null,
      bathrooms: (domainDetails as Partial<PropertyData>).bathrooms ?? null,
      carspaces: (domainDetails as Partial<PropertyData>).carspaces ?? null,
      landArea: (domainDetails as Partial<PropertyData>).landArea ?? null,
      buildingArea: (domainDetails as Partial<PropertyData>).buildingArea ?? null,
      yearBuilt: (domainDetails as Partial<PropertyData>).yearBuilt ?? null,
      features: (domainDetails as Partial<PropertyData>).features ?? [],
      photos: (domainDetails as Partial<PropertyData>).photos ?? [],
      streetViewUrl,
    },
    pricing: {
      lastSoldDate: (domainPricing as Partial<PricingData>).lastSoldDate ?? null,
      lastSoldPrice: (domainPricing as Partial<PricingData>).lastSoldPrice ?? null,
      estimatedValue: (domainPricing as Partial<PricingData>).estimatedValue ?? null,
      estimatedValueLow: (domainPricing as Partial<PricingData>).estimatedValueLow ?? null,
      estimatedValueHigh: (domainPricing as Partial<PricingData>).estimatedValueHigh ?? null,
      priceHistory: (domainPricing as Partial<PricingData>).priceHistory ?? [],
    },
    suburbStats,
    demographics,
    location: {
      transitDurationMins: commute.transit,
      drivingDurationMins: commute.driving,
      transitDistanceKm: commute.distanceKm,
      nearMainRoad: roads.nearMainRoad,
      nearestRoadName: roads.nearestRoadName,
      nearestRoadDistanceMetres: roads.nearestRoadDistanceMetres,
      eateries500m: amenities.eateries.length,
      schools1500m: amenities.schools.length,
      nearestSchools: nearestSchoolsList,
      trainStations1500m: amenities.trainStations.length,
      nearestTrainStation,
      supermarkets1km: amenities.supermarkets.length,
    },
    planning: {
      subjectZone: zoning.subjectZone,
      adjacentZones: zoning.adjacentZones,
      densityRisk: zoning.densityRisk,
      heritageOverlay: zoning.heritageOverlay,
      inFloodZone: hazards.inFloodZone,
      floodCategory: hazards.floodCategory,
      inBushfireProneLand: hazards.inBushfireProneLand,
      bushfireBAL: hazards.bushfireBAL,
      elevationAHD,
      lowLyingRisk,
      nearbyDAsCount: das.count,
      hasLargeDevelopmentNearby: das.hasLargeDevelopment,
      recentDAs: das.recentDAs,
    },
    neighbourhood: osm as NeighbourhoodData,
    block: block as BlockData,
    schools,
  }

  const dataCompleteness = calculateCompleteness(ctx)

  return {
    fetchedAt: new Date().toISOString(),
    ...ctx,
    warnings,
    dataCompleteness,
  }
}
