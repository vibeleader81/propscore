export type PropertyType = 'house' | 'unit' | 'apartment' | 'townhouse'

export interface AssessmentRequest {
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  parking: number
  land_size_sqm: number
  year_built?: number
  annual_income: number
  monthly_costs: number
  property_type: PropertyType
}

export interface PillarBreakdown {
  score: number
  sub_scores: Record<string, number>
  insights: string[]
}

export interface NearbyPOI {
  name: string
  distance_m: number
  type: string
}

export interface AlternativeSuburb {
  suburb: string
  state: string
  postcode: string
  rationale: string
  median_price: number
  ten_year_growth: number
  gross_yield: number
  distance_km: number
  score_delta: number
}

export interface NearbyPOIs {
  schools: NearbyPOI[]
  transport: NearbyPOI[]
  parks: NearbyPOI[]
}

export interface Pillars {
  location: PillarBreakdown
  affordability: PillarBreakdown
  features: PillarBreakdown
  suburb_quality: PillarBreakdown
  investment: PillarBreakdown
}

export type AssessmentBand =
  | 'Exceptional'
  | 'Strong Buy'
  | 'Consider with Caution'
  | 'Significant Concerns'
  | 'Not Recommended'

export interface AssessmentResponse {
  overall_score: number
  band: AssessmentBand
  lat: number
  lng: number
  suburb: string
  state: string
  postcode: string
  pillars: Pillars
  nearby_pois: NearbyPOIs
  buyers_agent_summary: string
  red_flags: string[]
  green_flags: string[]
  alternatives: AlternativeSuburb[]
  monthly_repayment: number
  borrowing_capacity: number
}

export interface GeocodeResult {
  description: string
  place_id: string
}
