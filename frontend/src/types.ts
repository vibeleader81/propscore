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
  deposit?: number
  property_type: PropertyType
  recaptcha_token?: string
  form_load_time?: number
  domain_listing_url?: string
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

export interface PropertyListing {
  listing_id: string
  address: string
  suburb: string
  state: string
  postcode: string
  price?: number
  display_price: string
  bedrooms?: number
  bathrooms?: number
  parking?: number
  land_size_sqm?: number
  property_type: string
  photos: string[]
  listing_url: string
  headline: string
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

export type AIFlagType = 'red' | 'golden' | 'green' | 'fixable'

export interface AIFlag {
  type: AIFlagType
  factor: string
  explanation: string
}

export interface AIDimensionScore {
  score: number
  rationale: string
}

export interface AIDimensionScores {
  location_liveability?: AIDimensionScore
  environmental_risk?: AIDimensionScore
  property_land_quality?: AIDimensionScore
  capital_growth_potential?: AIDimensionScore
  neighbourhood_quality?: AIDimensionScore
}

export interface AIAnalysis {
  available: boolean
  flags: AIFlag[]
  dimension_scores?: AIDimensionScores
  composite_score?: number
  has_critical_veto: boolean
  veto_reasons: string[]
  verdict?: string
  data_gaps: string[]
}

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
  alternative_listings?: PropertyListing[]
  monthly_repayment: number
  borrowing_capacity: number
  deposit: number
  lvr_pct: number
  lmi_required: boolean
  ai_analysis?: AIAnalysis
}

export interface GeocodeResult {
  description: string
  place_id: string
}
