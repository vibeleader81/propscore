/**
 * evaluateProperty.ts
 *
 * Assembles full property context then sends it to Claude for expert analysis.
 * Run with: npx tsx evaluateProperty.ts "189 Glenayr Avenue, North Bondi NSW 2026"
 */

import Anthropic from '@anthropic-ai/sdk'
import { assemblePropertyContext, type PropertyContext } from './assemblePropertyContext.js'
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

// ---------------------------------------------------------------------------
// Remove null values to reduce token count
// ---------------------------------------------------------------------------

function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined
  if (Array.isArray(obj)) {
    const filtered = obj.map(stripNulls).filter(v => v !== undefined)
    return filtered.length ? filtered : undefined
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const stripped = stripNulls(v)
      if (stripped !== undefined) out[k] = stripped
    }
    return Object.keys(out).length ? out : undefined
  }
  return obj
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert Australian property analyst. You will be given structured JSON data about a property. Produce a comprehensive evaluation report.

TAG every finding:
🚩 RED FLAG — Unchangeable negative (weight heavily against)
⭐ GOLDEN FLAG — Unchangeable positive (weight heavily in favour)
✅ GREEN FLAG — Changeable positive
🔧 FIXABLE — Changeable negative with cost implication

AUTOMATIC VETO (any single one overrides score):
- inFloodZone: true
- densityRisk: true combined with landArea < 300
- nearMainRoad: true AND nearestRoadDistanceMetres < 100
- socialHousingNearby: true AND within 200m
- rearAspect: "South" on a block < 250sqm (no mitigation possible)

SCORE out of 100 across 5 dimensions:
1. Location & Liveability (25pts): transit, walkability, schools, amenity
2. Environmental & Planning Risk (20pts): flood, fire, zoning, DAs
3. Property & Land Quality (20pts): size, aspect, features, year built
4. Capital Growth Potential (20pts): suburb CAGR, vacancy, DOM, demographics
5. Neighbourhood Quality (15pts): social housing, noise, amenity density

DATA COMPLETENESS NOTE: If dataCompleteness < 70, add a prominent "⚠️ PARTIAL DATA WARNING" section listing all gaps and what the buyer must verify before proceeding.

OUTPUT FORMAT:

## 📍 Property Summary
[address, type, key facts in 3 bullet points]

## 🚦 Flags
[all flags as a list — label | factor | 1-line explanation]

## 📊 Dimension Scores
[score/max — 2 sentence rationale per dimension]

## ⚖️ Composite Score: XX/100
[one sentence verdict]

## 💬 Agent Verdict
[3 paragraphs — be direct and commercially minded. Call out deal-breakers explicitly. Note what needs ground-truthing in person. Would you personally recommend proceeding to exchange?]

## ❓ Data Gaps — Verify Before Exchange
[bullet list of everything in warnings[] that materially affects the evaluation, with specific action for each]`

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

export async function evaluateProperty(address: string): Promise<{ context: PropertyContext; evaluation: string }> {
  console.log(`\nAssembling property context for: ${address}`)
  const context = await assemblePropertyContext(address)

  console.log(`Context assembled — completeness: ${context.dataCompleteness}% | warnings: ${context.warnings.length}`)
  console.log('Sending to Claude for analysis...\n')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.')

  const client = new Anthropic({ apiKey })

  // Strip nulls and serialize
  const stripped = stripNulls(context)
  const contextJson = JSON.stringify(stripped, null, 2)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Please evaluate this property:\n\n${contextJson}`,
      },
    ],
  })

  const evaluation = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  return { context, evaluation }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const addressArg = process.argv[2] ?? '189 Glenayr Avenue, North Bondi NSW 2026'

console.log('━'.repeat(70))
console.log('PropScore — Property Evaluation Engine')
console.log(`Address: ${addressArg}`)
console.log('━'.repeat(70))

try {
  const { context, evaluation } = await evaluateProperty(addressArg)

  console.log('\n' + '═'.repeat(70))
  console.log('CLAUDE EVALUATION REPORT')
  console.log('═'.repeat(70) + '\n')
  console.log(evaluation)

  console.log('\n' + '─'.repeat(70))
  console.log(`Data completeness: ${context.dataCompleteness}% | Fetched at: ${context.fetchedAt}`)
  if (context.warnings.length) {
    console.log(`\n${context.warnings.length} data warning(s):`)
    context.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
  }
} catch (err) {
  console.error('\n❌ Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
}
