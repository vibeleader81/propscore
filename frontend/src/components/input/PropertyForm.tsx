import { useState } from 'react'
import type { AssessmentRequest, PropertyType } from '../../types'
import AddressSearch from './AddressSearch'
import { lookupProperty, type DomainPropertyData } from '../../api/client'

interface PropertyFormProps {
  onSubmit: (data: AssessmentRequest) => void
  isLoading: boolean
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'house', label: 'House' },
  { value: 'unit', label: 'Unit' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
]

function NumberSelector({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex items-center border border-[#4f345a]/15 rounded-xl overflow-hidden bg-white shadow-sm">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-[#4f345a]/5 hover:text-[#4f345a] transition-colors font-bold text-lg"
        >
          −
        </button>
        <span className="flex-1 text-center font-semibold text-slate-800 text-base">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-[#4f345a]/5 hover:text-[#4f345a] transition-colors font-bold text-lg"
        >
          +
        </button>
      </div>
    </div>
  )
}

function CurrencyInput({
  label,
  value,
  onChange,
  placeholder,
  helpText,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helpText?: string
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    onChange(raw)
  }

  const display = value ? Number(value).toLocaleString('en-AU') : ''

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8fa998] font-medium text-sm pointer-events-none">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-7 pr-4 py-3 border border-[#4f345a]/15 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9cbfa7] focus:border-[#9cbfa7] transition-shadow text-sm bg-white shadow-sm"
        />
      </div>
      {helpText && <p className="mt-1 text-xs text-slate-400">{helpText}</p>}
    </div>
  )
}

export default function PropertyForm({ onSubmit, isLoading }: PropertyFormProps) {
  const [address, setAddress] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('house')
  const [priceStr, setPriceStr] = useState('')
  const [bedrooms, setBedrooms] = useState(3)
  const [bathrooms, setBathrooms] = useState(2)
  const [parking, setParking] = useState(1)
  const [landSizeStr, setLandSizeStr] = useState('')
  const [yearBuiltStr, setYearBuiltStr] = useState('')
  const [annualIncomeStr, setAnnualIncomeStr] = useState('')
  const [monthlyCostsStr, setMonthlyCostsStr] = useState('')
  const [depositStr, setDepositStr] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [domainData, setDomainData] = useState<DomainPropertyData | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const handleAddressSelected = async (selectedAddress: string) => {
    setAddress(selectedAddress)
    setDomainData(null)
    if (!selectedAddress || selectedAddress.length < 10) return
    setIsLookingUp(true)
    try {
      const data = await lookupProperty(selectedAddress)
      if (data.found) setDomainData(data)
    } catch { /* silent */ }
    finally { setIsLookingUp(false) }
  }

  const applyDomainAutofill = () => {
    if (!domainData) return
    if (domainData.property_type) setPropertyType(domainData.property_type as PropertyType)
    if (domainData.bedrooms != null) setBedrooms(domainData.bedrooms)
    if (domainData.bathrooms != null) setBathrooms(domainData.bathrooms)
    if (domainData.parking != null) setParking(domainData.parking)
    if (domainData.land_size_sqm != null) setLandSizeStr(String(Math.round(domainData.land_size_sqm)))
    if (domainData.year_built != null) setYearBuiltStr(String(domainData.year_built))
    if (domainData.price != null) setPriceStr(String(Math.round(domainData.price)))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!address.trim()) newErrors.address = 'Please enter a property address'
    if (!priceStr || Number(priceStr) < 50000) newErrors.price = 'Please enter a valid purchase price'
    if (!annualIncomeStr || Number(annualIncomeStr) < 1) newErrors.annual_income = 'Please enter your annual income'
    if (!monthlyCostsStr) newErrors.monthly_costs = 'Please enter your monthly costs (enter 0 if none)'
    if (!landSizeStr && propertyType !== 'apartment' && propertyType !== 'unit') {
      newErrors.land_size = 'Please enter land size (0 if not applicable)'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const data: AssessmentRequest = {
      address: address.trim(),
      price: Number(priceStr),
      bedrooms,
      bathrooms,
      parking,
      land_size_sqm: Number(landSizeStr) || 0,
      year_built: yearBuiltStr ? Number(yearBuiltStr) : undefined,
      annual_income: Number(annualIncomeStr),
      monthly_costs: Number(monthlyCostsStr) || 0,
      deposit: Number(depositStr) || 0,
      property_type: propertyType,
    }
    onSubmit(data)
  }

  const showLandSize = propertyType === 'house' || propertyType === 'townhouse'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Property Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#4f345a]/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#4f345a]/10 bg-[#4f345a]/5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4f345a] text-[#c9f299] rounded-full text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-bold text-slate-800 text-base">Property Details</h2>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Property Address <span className="text-rose-500">*</span>
              </label>
              <AddressSearch value={address} onChange={handleAddressSelected} />
              {errors.address && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {errors.address}
                </p>
              )}
              {/* Domain autofill card */}
              {isLookingUp && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-3 h-3 border border-[#9cbfa7] border-t-transparent rounded-full animate-spin" />
                  Looking up on Domain.com.au...
                </div>
              )}
              {domainData?.found && !isLookingUp && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-emerald-600 text-xs font-bold uppercase tracking-wide">✓ Found on Domain.com.au</span>
                      </div>
                      {domainData.headline && (
                        <p className="text-xs text-slate-600 truncate mb-1">{domainData.headline}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {domainData.bedrooms != null && <span>🛏 {domainData.bedrooms} bed</span>}
                        {domainData.bathrooms != null && <span>🚿 {domainData.bathrooms} bath</span>}
                        {domainData.parking != null && <span>🚗 {domainData.parking} car</span>}
                        {domainData.land_size_sqm != null && <span>📐 {Math.round(domainData.land_size_sqm)}m²</span>}
                        {domainData.display_price && <span>💰 {domainData.display_price}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={applyDomainAutofill}
                      className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Autofill
                    </button>
                  </div>
                  {domainData.listing_url && (
                    <a
                      href={domainData.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-xs text-emerald-600 hover:underline"
                    >
                      View listing on Domain.com.au →
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Property Type</label>
              <div className="grid grid-cols-4 gap-2">
                {PROPERTY_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPropertyType(pt.value)}
                    className={`py-2.5 px-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                      propertyType === pt.value
                        ? 'bg-[#4f345a] text-white border-[#4f345a]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#8fa998]'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <CurrencyInput
              label="Purchase Price *"
              value={priceStr}
              onChange={setPriceStr}
              placeholder="850,000"
              helpText="Enter the listed or expected purchase price"
            />
            {errors.price && <p className="text-xs text-rose-600 mt-1">{errors.price}</p>}

            {/* Bedrooms / Bathrooms / Parking */}
            <div className="grid grid-cols-3 gap-4">
              <NumberSelector label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={1} />
              <NumberSelector label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={1} />
              <NumberSelector label="Parking" value={parking} onChange={setParking} min={0} />
            </div>

            {/* Land Size + Year Built */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Land Size (m²) {showLandSize && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="number"
                  value={landSizeStr}
                  onChange={e => setLandSizeStr(e.target.value)}
                  placeholder={showLandSize ? '450' : '0 (not applicable)'}
                  min="0"
                  className="w-full px-4 py-3 border border-[#4f345a]/15 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9cbfa7] focus:border-[#9cbfa7] text-sm bg-white shadow-sm"
                />
                {errors.land_size && <p className="text-xs text-rose-600 mt-1">{errors.land_size}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Year Built (optional)</label>
                <input
                  type="number"
                  value={yearBuiltStr}
                  onChange={e => setYearBuiltStr(e.target.value)}
                  placeholder="e.g. 1995"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="w-full px-4 py-3 border border-[#4f345a]/15 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9cbfa7] focus:border-[#9cbfa7] text-sm bg-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Profile */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#4f345a]/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#4f345a]/10 bg-[#4f345a]/5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4f345a] text-[#c9f299] rounded-full text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-bold text-slate-800 text-base">Your Financial Profile</h2>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-3.5 bg-[#4f345a]/5 rounded-xl border border-[#4f345a]/10">
              <svg className="w-4 h-4 text-[#8fa998] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-slate-600 leading-relaxed">
                We use these to assess affordability and mortgage stress risk. Your data stays in your browser session and is not stored.
              </p>
            </div>

            <CurrencyInput
              label="Annual Household Income *"
              value={annualIncomeStr}
              onChange={setAnnualIncomeStr}
              placeholder="120,000"
              helpText="Combined gross income of all borrowers"
            />
            {errors.annual_income && <p className="text-xs text-rose-600 -mt-3">{errors.annual_income}</p>}

            <CurrencyInput
              label="Monthly Committed Costs *"
              value={monthlyCostsStr}
              onChange={setMonthlyCostsStr}
              placeholder="2,500"
              helpText="Existing loan repayments, rent, credit card minimums, etc."
            />
            {errors.monthly_costs && <p className="text-xs text-rose-600 -mt-3">{errors.monthly_costs}</p>}

            <CurrencyInput
              label="Available Deposit"
              value={depositStr}
              onChange={setDepositStr}
              placeholder="200,000"
              helpText="Cash available for deposit — excludes stamp duty and purchase costs"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 bg-[#c9f299] hover:bg-[#b8e07a] disabled:bg-slate-300 disabled:text-slate-500 text-[#4f345a] font-bold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-[#4f345a] border-t-transparent rounded-full animate-spin" />
              Assessing...
            </>
          ) : (
            <>
              Assess This Property
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
