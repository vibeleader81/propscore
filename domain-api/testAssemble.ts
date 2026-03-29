/**
 * testAssemble.ts
 *
 * End-to-end test for assemblePropertyContext.ts
 * Run with: npx tsx testAssemble.ts
 */

import { assemblePropertyContext } from './assemblePropertyContext.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local if present
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
    if (key && !(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(resolve(__dirname, '.env.local'))
loadEnvFile(resolve(__dirname, '..', '.env.local'))

const TEST_ADDRESS = '189 Glenayr Avenue, North Bondi NSW 2026'

console.log('━'.repeat(70))
console.log('assemblePropertyContext — end-to-end test')
console.log(`Address: ${TEST_ADDRESS}`)
console.log('━'.repeat(70))

try {
  const t0 = Date.now()
  const result = await assemblePropertyContext(TEST_ADDRESS)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('\n' + JSON.stringify(result, null, 2))

  console.log('\n' + '─'.repeat(70))
  console.log(`Data completeness: ${result.dataCompleteness}% | Warnings: ${result.warnings.length} | Time: ${elapsed}s`)
  console.log('─'.repeat(70))

  if (result.warnings.length > 0) {
    console.log('\nWarnings:')
    result.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
  }
} catch (err) {
  console.error('\n❌ Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
}
