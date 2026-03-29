/**
 * testDomainApi.ts
 *
 * End-to-end test for domainApi.ts.
 * Run with: npm test
 * (requires DOMAIN_CLIENT_ID and DOMAIN_CLIENT_SECRET in env or .env.local)
 */

import { fetchDomainProperty } from './domainApi.js'

// Load .env.local if present (no external deps — manual parse)
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return
  const lines = readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) {
      process.env[key] = val
    }
  }
}

// Try .env.local in the domain-api dir, then the repo root
loadEnvFile(resolve(import.meta.dirname, '.env.local'))
loadEnvFile(resolve(import.meta.dirname, '..', '.env.local'))

// ---------------------------------------------------------------------------

const TEST_ADDRESS = '3 Spring Street, Sydney NSW 2000'

console.log('━'.repeat(60))
console.log(`Domain API — end-to-end test`)
console.log(`Address: ${TEST_ADDRESS}`)
console.log('━'.repeat(60))

try {
  const result = await fetchDomainProperty(TEST_ADDRESS)

  console.log('\n✅ Success\n')
  console.log(JSON.stringify(result, null, 2))

  // Summary report
  console.log('\n' + '─'.repeat(60))
  console.log('SUMMARY')
  console.log('─'.repeat(60))
  console.log(`Property ID   : ${result.propertyId}`)
  console.log(`Address       : ${result.address.full}`)
  console.log(`Type          : ${result.details.propertyType ?? 'unknown'}`)
  console.log(`Beds/Bath/Car : ${result.details.bedrooms ?? '?'} / ${result.details.bathrooms ?? '?'} / ${result.details.carspaces ?? '?'}`)
  console.log(`Land area     : ${result.details.landArea ?? 'unknown'} sqm`)
  console.log(`Year built    : ${result.details.yearBuilt ?? 'unknown'}`)
  console.log(`Est. value    : ${result.priceData.estimatedValue != null ? `$${result.priceData.estimatedValue.toLocaleString()}` : 'not available'}`)
  console.log(`Last sold     : ${result.priceData.lastSoldDate ?? 'unknown'} @ ${result.priceData.lastSoldPrice != null ? `$${result.priceData.lastSoldPrice.toLocaleString()}` : 'unknown'}`)
  console.log(`Price history : ${result.priceData.priceHistory.length} entries`)
  console.log(`Photos        : ${result.details.photos.length}`)
  console.log(`Features      : ${result.details.features.join(', ') || 'none'}`)
  console.log(`Fetched at    : ${result.fetchedAt}`)

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    result.warnings.forEach(w => console.log(`   • ${w}`))
  }
} catch (err) {
  console.error('\n❌ Error:', err instanceof Error ? err.message : err)
  process.exit(1)
}
