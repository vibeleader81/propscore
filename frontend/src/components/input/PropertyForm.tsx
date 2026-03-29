import { useState, useRef } from 'react'
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

function SectionLabel({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ padding: '18px 28px 16px', borderBottom: '1px solid rgba(27,67,83,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '32px',
          fontWeight: 300,
          color: 'rgba(27,67,83,0.15)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          userSelect: 'none',
        }}>{number}</span>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '10px',
          fontWeight: 500,
          color: '#1b4353',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>{title}</span>
      </div>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: "'Inter', sans-serif",
      fontSize: '12px',
      fontWeight: 600,
      color: '#1b4353',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      marginBottom: '8px',
    }}>
      {children}
      {required && <span style={{ color: '#2892d7', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid rgba(27,67,83,0.15)',
  borderRadius: '10px',
  fontFamily: "'Inter', sans-serif",
  fontSize: '14px',
  color: '#0d1e2c',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        borderColor: focused ? '#5ba3d0' : 'rgba(27,67,83,0.15)',
        boxShadow: focused ? '0 0 0 3px rgba(109,174,219,0.18)' : 'none',
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function CurrencyInput({
  label, value, onChange, placeholder, helpText, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; helpText?: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.replace(/[^0-9]/g, ''))
  }
  const display = value ? Number(value).toLocaleString('en-AU') : ''
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
          fontFamily: "'DM Mono', monospace",
          fontSize: '14px',
          color: focused ? '#6daedb' : 'rgba(109,174,219,0.7)',
          pointerEvents: 'none',
          transition: 'color 0.15s',
        }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingLeft: '28px',
            fontFamily: "'DM Mono', monospace",
            borderColor: focused ? '#5ba3d0' : 'rgba(27,67,83,0.15)',
            boxShadow: focused ? '0 0 0 3px rgba(109,174,219,0.18)' : 'none',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      {helpText && <p style={{ marginTop: '5px', fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#6daedb' }}>{helpText}</p>}
    </div>
  )
}

function NumberSelector({
  label, value, onChange, min = 0, max = 10,
}: {
  label: string; value: number; onChange: (n: number) => void; min?: number; max?: number
}) {
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none',
    border: '1px solid rgba(27,67,83,0.18)',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'rgba(27,67,83,0.3)' : '#1b4353',
    fontSize: '16px',
    fontWeight: 500,
    transition: 'all 0.12s',
    flexShrink: 0,
  })
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={btnStyle(value <= min)}>−</button>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '22px',
          fontWeight: 500,
          color: '#1b4353',
          minWidth: '28px',
          textAlign: 'center',
          letterSpacing: '-0.02em',
        }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} style={btnStyle(value >= max)}>+</button>
      </div>
    </div>
  )
}

export default function PropertyForm({ onSubmit, isLoading }: PropertyFormProps) {
  const [address, setAddress] = useState('')
  const [domainListingUrl, setDomainListingUrl] = useState('')
  const [urlValid, setUrlValid] = useState<boolean | null>(null)
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
  const [autoFilled, setAutoFilled] = useState(false)
  const formLoadTime = useRef<number>(Date.now() / 1000)

  const applyDomainData = (data: DomainPropertyData) => {
    if (data.property_type) setPropertyType(data.property_type as PropertyType)
    if (data.bedrooms != null) setBedrooms(data.bedrooms)
    if (data.bathrooms != null) setBathrooms(data.bathrooms)
    if (data.parking != null) setParking(data.parking)
    if (data.land_size_sqm != null) setLandSizeStr(String(Math.round(data.land_size_sqm)))
    if (data.year_built != null) setYearBuiltStr(String(data.year_built))
    if (data.price != null) setPriceStr(String(Math.round(data.price)))
    setAutoFilled(true)
  }

  const handleAddressSelected = async (selectedAddress: string) => {
    setAddress(selectedAddress)
    setDomainData(null)
    setAutoFilled(false)
    if (!selectedAddress || selectedAddress.length < 10) return
    setIsLookingUp(true)
    try {
      const data = await lookupProperty(selectedAddress)
      if (data.found) {
        setDomainData(data)
        applyDomainData(data)   // ← auto-apply immediately
      }
    } catch { /* silent */ }
    finally { setIsLookingUp(false) }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // Get reCAPTCHA v3 token if available
    let recaptchaToken: string | undefined
    try {
      const w = window as unknown as Record<string, unknown>
      const siteKey = w.__RECAPTCHA_SITE_KEY__ as string | undefined
      if (siteKey && typeof w.grecaptcha !== 'undefined') {
        const grecaptcha = w.grecaptcha as {
          execute: (key: string, opts: { action: string }) => Promise<string>
          ready: (fn: () => void) => void
        }
        recaptchaToken = await new Promise<string>((resolve) => {
          grecaptcha.ready(async () => {
            const token = await grecaptcha.execute(siteKey, { action: 'assess' })
            resolve(token)
          })
        })
      }
    } catch { /* reCAPTCHA unavailable — backend will skip check */ }

    onSubmit({
      address: address.trim(),
      price: Number(priceStr),
      bedrooms, bathrooms, parking,
      land_size_sqm: Number(landSizeStr) || 0,
      year_built: yearBuiltStr ? Number(yearBuiltStr) : undefined,
      annual_income: Number(annualIncomeStr),
      monthly_costs: Number(monthlyCostsStr) || 0,
      deposit: Number(depositStr) || 0,
      property_type: propertyType,
      recaptcha_token: recaptchaToken,
      form_load_time: formLoadTime.current,
      domain_listing_url: domainListingUrl.trim() || undefined,
    })
  }

  const showLandSize = propertyType === 'house' || propertyType === 'townhouse'

  const specPillStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: '10px',
    color: '#2a7aaa',
    background: 'rgba(29,112,162,0.1)',
    border: '1px solid rgba(29,112,162,0.2)',
    borderRadius: '6px',
    padding: '3px 8px',
    whiteSpace: 'nowrap' as const,
  }

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    border: '1px solid rgba(27,67,83,0.1)',
    overflow: 'hidden',
    boxShadow: '0 2px 24px rgba(27,67,83,0.06)',
    borderTop: '3px solid #2892d7',
  }

  const errorStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '11px',
    color: '#e53e3e',
    marginTop: '5px',
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px 80px' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── SECTION 01: Property Details ── */}
          <div style={cardStyle}>
            <SectionLabel number="01" title="Property Details" />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

              {/* Address */}
              <div>
                <FieldLabel required>Property Address</FieldLabel>
                <AddressSearch value={address} onChange={handleAddressSelected} />
                {errors.address && <p style={errorStyle}>{errors.address}</p>}

                {/* Domain lookup indicator */}
                {isLookingUp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#6daedb', letterSpacing: '0.06em' }}>
                    <div style={{ width: '12px', height: '12px', border: '1.5px solid #5ba3d0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Looking up on Domain.com.au...
                  </div>
                )}

                {/* Domain autofill card */}
                {domainData?.found && !isLookingUp && (
                  <div style={{
                    marginTop: '12px',
                    background: 'rgba(40,146,215,0.04)',
                    border: '1px solid rgba(40,146,215,0.25)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                  }}>
                    {/* Header row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      padding: '10px 14px',
                      background: autoFilled ? 'rgba(16,185,129,0.08)' : 'rgba(40,146,215,0.08)',
                      borderBottom: '1px solid rgba(40,146,215,0.15)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {autoFilled ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#059669', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Form auto-filled from Domain.com.au
                          </span>
                        ) : (
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#2a7aaa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            ◈ Found on Domain.com.au
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {domainData.listing_url && (
                          <a href={domainData.listing_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#6daedb', letterSpacing: '0.06em', textDecoration: 'none' }}>
                            View on Domain →
                          </a>
                        )}
                        {autoFilled && (
                          <button
                            type="button"
                            onClick={() => applyDomainData(domainData)}
                            style={{
                              padding: '4px 10px',
                              background: 'none',
                              color: '#6daedb',
                              border: '1px solid rgba(109,174,219,0.35)',
                              borderRadius: '6px',
                              fontFamily: "'DM Mono', monospace",
                              fontSize: '9px',
                              letterSpacing: '0.08em',
                              cursor: 'pointer',
                            }}
                          >
                            Re-apply
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Property specs */}
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {domainData.headline && (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600, color: '#0e3252', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {domainData.headline}
                        </p>
                      )}

                      {/* Specs row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {domainData.bedrooms != null && (
                          <span style={specPillStyle}>🛏 {domainData.bedrooms} bed</span>
                        )}
                        {domainData.bathrooms != null && (
                          <span style={specPillStyle}>🚿 {domainData.bathrooms} bath</span>
                        )}
                        {domainData.parking != null && (
                          <span style={specPillStyle}>🚗 {domainData.parking} car</span>
                        )}
                        {domainData.land_size_sqm != null && (
                          <span style={specPillStyle}>📐 {Math.round(domainData.land_size_sqm)}m²</span>
                        )}
                        {domainData.year_built != null && (
                          <span style={specPillStyle}>🏗 {domainData.year_built}</span>
                        )}
                      </div>

                      {/* Price intelligence */}
                      {(domainData.display_price || domainData.last_sold_price) && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: domainData.display_price && domainData.last_sold_price ? '1fr 1fr' : '1fr',
                          gap: '8px',
                        }}>
                          {domainData.display_price && (
                            <div style={{ background: 'rgba(27,67,83,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#6daedb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
                                AVM Estimate
                              </div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 700, color: '#1b4353' }}>
                                {domainData.display_price}
                              </div>
                              {domainData.estimated_value_low != null && domainData.estimated_value_high != null && (
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#6daedb', marginTop: '2px' }}>
                                  ${(domainData.estimated_value_low / 1000).toFixed(0)}k – ${(domainData.estimated_value_high / 1000).toFixed(0)}k range
                                </div>
                              )}
                            </div>
                          )}
                          {domainData.last_sold_price != null && (
                            <div style={{ background: 'rgba(27,67,83,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#6daedb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
                                Last Sold
                              </div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 700, color: '#1b4353' }}>
                                ${domainData.last_sold_price.toLocaleString('en-AU')}
                              </div>
                              {domainData.last_sold_date && (
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#6daedb', marginTop: '2px' }}>
                                  {new Date(domainData.last_sold_date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Domain listing URL — optional, enriches AI analysis */}
              <div>
                <FieldLabel>Domain Listing URL <span style={{ fontWeight: 400, color: '#6daedb', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>(optional — unlocks richer AI analysis)</span></FieldLabel>
                <div style={{ position: 'relative' }}>
                  <TextInput
                    type="url"
                    value={domainListingUrl}
                    onChange={e => {
                      const val = e.target.value
                      setDomainListingUrl(val)
                      if (!val) { setUrlValid(null); return }
                      const isDomain = /domain\.com\.au\/.+-\d{7,12}/.test(val)
                      setUrlValid(isDomain)
                    }}
                    placeholder="https://www.domain.com.au/3-example-st-suburb-nsw-2000-2016839485"
                  />
                  {urlValid === true && (
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#059669',
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Valid listing URL
                    </span>
                  )}
                  {urlValid === false && domainListingUrl && (
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#e53e3e',
                    }}>
                      Paste a Domain listing link
                    </span>
                  )}
                </div>
                <p style={{ marginTop: '5px', fontFamily: "'Inter', sans-serif", fontSize: '11px', color: 'rgba(109,174,219,0.7)', lineHeight: 1.5 }}>
                  Paste the Domain.com.au property listing URL to feed the agent description, room details and features directly into the AI analysis.
                </p>
              </div>

              {/* Property type */}
              <div>
                <FieldLabel>Property Type</FieldLabel>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PROPERTY_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setPropertyType(pt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '9px 18px',
                        borderRadius: '100px',
                        border: propertyType === pt.value ? '1px solid #1b4353' : '1px solid rgba(27,67,83,0.15)',
                        background: propertyType === pt.value ? '#1b4353' : 'white',
                        color: propertyType === pt.value ? 'white' : '#2a5f7a',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '13px',
                        fontWeight: propertyType === pt.value ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {propertyType === pt.value && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2892d7', flexShrink: 0 }} />
                      )}
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <CurrencyInput label="Purchase Price" value={priceStr} onChange={setPriceStr} placeholder="850,000" helpText="Listed or expected purchase price in AUD" required />
                {errors.price && <p style={errorStyle}>{errors.price}</p>}
              </div>

              {/* Bed / Bath / Parking */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <NumberSelector label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={1} />
                <NumberSelector label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={1} />
                <NumberSelector label="Parking" value={parking} onChange={setParking} min={0} />
              </div>

              {/* Land size + Year built */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <FieldLabel required={showLandSize}>Land Size (m²)</FieldLabel>
                  <TextInput
                    type="number"
                    value={landSizeStr}
                    onChange={e => setLandSizeStr(e.target.value)}
                    placeholder={showLandSize ? '450' : '0'}
                    min="0"
                  />
                  {errors.land_size && <p style={errorStyle}>{errors.land_size}</p>}
                </div>
                <div>
                  <FieldLabel>Year Built</FieldLabel>
                  <TextInput
                    type="number"
                    value={yearBuiltStr}
                    onChange={e => setYearBuiltStr(e.target.value)}
                    placeholder="e.g. 1995"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ── SECTION 02: Financial Profile ── */}
          <div style={cardStyle}>
            <SectionLabel number="02" title="Financial Profile" />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 16px',
                background: 'rgba(27,67,83,0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(27,67,83,0.07)',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5ba3d0', marginTop: '5px', flexShrink: 0 }} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#6daedb', lineHeight: 1.55 }}>
                  Used to assess affordability and mortgage stress. Your data stays in your browser and is never stored.
                </p>
              </div>

              <div>
                <CurrencyInput label="Annual Household Income" value={annualIncomeStr} onChange={setAnnualIncomeStr} placeholder="120,000" helpText="Combined gross income of all borrowers" required />
                {errors.annual_income && <p style={errorStyle}>{errors.annual_income}</p>}
              </div>

              <div>
                <CurrencyInput label="Monthly Committed Costs" value={monthlyCostsStr} onChange={setMonthlyCostsStr} placeholder="2,500" helpText="Existing loan repayments, rent, credit card minimums" required />
                {errors.monthly_costs && <p style={errorStyle}>{errors.monthly_costs}</p>}
              </div>

              <CurrencyInput label="Available Deposit" value={depositStr} onChange={setDepositStr} placeholder="200,000" helpText="Cash available — excludes stamp duty and purchase costs" />

            </div>
          </div>

          {/* ── Honeypot — hidden from humans, bots fill it ── */}
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              onChange={() => {/* intentionally blank — bots fill this */}}
            />
          </div>

          {/* ── SUBMIT ── */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: isLoading ? 'rgba(27,67,83,0.2)' : '#2892d7',
              color: isLoading ? '#6daedb' : '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: isLoading ? 'none' : '0 4px 20px rgba(40,146,215,0.35)',
            }}
          >
            {isLoading ? (
              <>
                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(109,174,219,0.4)', borderTopColor: '#6daedb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Assessing...
              </>
            ) : (
              <>
                Analyse This Property
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

        </div>
      </form>
    </div>
  )
}
