export const formatCurrency = (n: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export const formatShortCurrency = (n: number): string => {
  if (n >= 1_000_000) {
    const val = n / 1_000_000
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)}M`
  }
  if (n >= 1_000) {
    const val = n / 1_000
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`
  }
  return `$${n}`
}

export const formatPercent = (n: number): string => {
  return `${n.toFixed(1)}%`
}

export const formatDistance = (m: number): string => {
  if (m >= 1000) {
    return `${(m / 1000).toFixed(1)}km`
  }
  return `${Math.round(m)}m`
}

export const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 65) return 'text-green-500'
  if (score >= 50) return 'text-amber-500'
  if (score >= 35) return 'text-orange-500'
  return 'text-rose-600'
}

export const getScoreBgColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800'
  if (score >= 65) return 'bg-green-100 text-green-800'
  if (score >= 50) return 'bg-amber-100 text-amber-800'
  if (score >= 35) return 'bg-orange-100 text-orange-800'
  return 'bg-rose-100 text-rose-800'
}

export const getScoreBarColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 65) return 'bg-green-500'
  if (score >= 50) return 'bg-amber-400'
  if (score >= 35) return 'bg-orange-400'
  return 'bg-rose-500'
}

export const getDistanceColor = (m: number): string => {
  if (m < 500) return 'text-emerald-600'
  if (m < 1000) return 'text-amber-600'
  return 'text-rose-600'
}

export const getBandColor = (band: string): string => {
  switch (band) {
    case 'Exceptional': return 'bg-emerald-500 text-white'
    case 'Strong Buy': return 'bg-green-500 text-white'
    case 'Consider with Caution': return 'bg-amber-400 text-amber-900'
    case 'Significant Concerns': return 'bg-orange-500 text-white'
    case 'Not Recommended': return 'bg-rose-600 text-white'
    default: return 'bg-slate-400 text-white'
  }
}
