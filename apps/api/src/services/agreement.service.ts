/**
 * Rater agreement statistics for the misconception labels (Week 3 3D) -
 * deterministic arithmetic, no LLM or statistics library. The labels are
 * the misconception taxonomy plus NONE (the rater judges no misconception
 * applies; an unset aiLabel is also NONE).
 */

export const NO_MISCONCEPTION = 'NONE'

export interface KappaResult {
  n: number
  observedAgreement: number
  expectedAgreement: number
  /** null when undefined: every label in both columns is the same single
   * category, so chance agreement is 1 and kappa has no meaning. */
  kappa: number | null
}

/** Cohen's kappa for two label columns over the same items. */
export function cohensKappa(pairs: Array<[string, string]>): KappaResult {
  const n = pairs.length
  if (n === 0) return { n: 0, observedAgreement: 0, expectedAgreement: 0, kappa: null }
  const agree = pairs.filter(([a, b]) => a === b).length
  const po = agree / n
  const countsA = new Map<string, number>()
  const countsB = new Map<string, number>()
  for (const [a, b] of pairs) {
    countsA.set(a, (countsA.get(a) ?? 0) + 1)
    countsB.set(b, (countsB.get(b) ?? 0) + 1)
  }
  let pe = 0
  for (const [label, countA] of countsA) pe += (countA / n) * ((countsB.get(label) ?? 0) / n)
  const kappa = pe === 1 ? null : (po - pe) / (1 - pe)
  return { n, observedAgreement: po, expectedAgreement: pe, kappa }
}

export interface ConfusionMatrix {
  labels: string[]
  /** counts[i][j]: items labelled labels[i] by the first column and labels[j] by the second. */
  counts: number[][]
}

export function confusionMatrix(pairs: Array<[string, string]>): ConfusionMatrix {
  const labels = [...new Set(pairs.flat())].sort()
  const index = new Map(labels.map((label, i) => [label, i]))
  const counts = labels.map(() => labels.map(() => 0))
  for (const [a, b] of pairs) counts[index.get(a)!][index.get(b)!] += 1
  return { labels, counts }
}

export interface CategoryPrecisionRecall {
  category: string
  support: number
  precision: number | null
  recall: number | null
}

/** Per-category precision and recall of `predicted` against `reference`
 * (pairs are [reference, predicted]). NONE is excluded as a category: it is
 * the absence of a detection, not a detected misconception. */
export function precisionRecall(pairs: Array<[string, string]>): CategoryPrecisionRecall[] {
  const categories = [...new Set(pairs.flat())].filter((c) => c !== NO_MISCONCEPTION).sort()
  return categories.map((category) => {
    const tp = pairs.filter(([ref, pred]) => ref === category && pred === category).length
    const predicted = pairs.filter(([, pred]) => pred === category).length
    const actual = pairs.filter(([ref]) => ref === category).length
    return {
      category,
      support: actual,
      precision: predicted === 0 ? null : tp / predicted,
      recall: actual === 0 ? null : tp / actual,
    }
  })
}

export interface RatedItem {
  interactionId: string
  ruleLabel: string | null
  aiLabel: string | null
  /** raterCode -> label */
  ratings: Record<string, string>
}

export interface AgreementComparison {
  name: string
  kappa: KappaResult
  confusion: ConfusionMatrix
}

export interface AgreementReport {
  raters: string[]
  itemCount: number
  comparisons: AgreementComparison[]
  /** aiLabel against each human, and against the humans' consensus (items where all agree). */
  aiPrecisionRecall: Array<{ reference: string; n: number; rows: CategoryPrecisionRecall[] }>
}

const orNone = (label: string | null) => label ?? NO_MISCONCEPTION

export function computeAgreementReport(items: RatedItem[]): AgreementReport {
  const raters = [...new Set(items.flatMap((item) => Object.keys(item.ratings)))].sort()
  const comparisons: AgreementComparison[] = []
  const compare = (name: string, pairs: Array<[string, string]>) =>
    comparisons.push({ name, kappa: cohensKappa(pairs), confusion: confusionMatrix(pairs) })

  // Human against human, over the items both rated.
  for (let i = 0; i < raters.length; i++) {
    for (let j = i + 1; j < raters.length; j++) {
      const [a, b] = [raters[i], raters[j]]
      compare(
        `${a} vs ${b}`,
        items.filter((it) => it.ratings[a] && it.ratings[b]).map((it) => [it.ratings[a], it.ratings[b]]),
      )
    }
  }
  // Each human against the AI label and against the rule label.
  for (const rater of raters) {
    const rated = items.filter((it) => it.ratings[rater])
    compare(`${rater} vs aiLabel`, rated.map((it) => [it.ratings[rater], orNone(it.aiLabel)]))
    compare(`${rater} vs ruleLabel`, rated.map((it) => [it.ratings[rater], orNone(it.ruleLabel)]))
  }

  const aiPrecisionRecall = raters.map((rater) => {
    const pairs = items.filter((it) => it.ratings[rater]).map((it) => [it.ratings[rater], orNone(it.aiLabel)] as [string, string])
    return { reference: rater, n: pairs.length, rows: precisionRecall(pairs) }
  })
  if (raters.length > 1) {
    const consensus = items.filter((it) => {
      const labels = raters.map((r) => it.ratings[r])
      return labels.every(Boolean) && labels.every((l) => l === labels[0])
    })
    const pairs = consensus.map((it) => [it.ratings[raters[0]], orNone(it.aiLabel)] as [string, string])
    aiPrecisionRecall.push({ reference: 'human consensus', n: pairs.length, rows: precisionRecall(pairs) })
  }

  return { raters, itemCount: items.length, comparisons, aiPrecisionRecall }
}

const fmt = (value: number | null, digits = 3) => (value === null ? 'undefined' : value.toFixed(digits))

export function agreementReportToMarkdown(report: AgreementReport): string {
  const lines: string[] = []
  lines.push(`Raters: ${report.raters.join(', ') || 'none'}. Rated items: ${report.itemCount}.`, '')
  lines.push("## Cohen's kappa", '', '| Comparison | n | Observed agreement | Chance agreement | Kappa |', '|---|---|---|---|---|')
  for (const c of report.comparisons) {
    lines.push(`| ${c.name} | ${c.kappa.n} | ${fmt(c.kappa.observedAgreement)} | ${fmt(c.kappa.expectedAgreement)} | ${fmt(c.kappa.kappa)} |`)
  }
  for (const c of report.comparisons) {
    const [left, right] = c.name.split(' vs ')
    lines.push('', `## Confusion matrix: ${c.name}`, '', `Rows: ${left}. Columns: ${right}.`, '')
    lines.push(`| | ${c.confusion.labels.join(' | ')} |`, `|---|${c.confusion.labels.map(() => '---').join('|')}|`)
    c.confusion.labels.forEach((label, i) => lines.push(`| ${label} | ${c.confusion.counts[i].join(' | ')} |`))
  }
  for (const pr of report.aiPrecisionRecall) {
    lines.push('', `## aiLabel precision and recall against ${pr.reference} (n = ${pr.n})`, '')
    lines.push('| Category | Support | Precision | Recall |', '|---|---|---|---|')
    for (const row of pr.rows) lines.push(`| ${row.category} | ${row.support} | ${fmt(row.precision)} | ${fmt(row.recall)} |`)
  }
  return lines.join('\n')
}

/** mulberry32 - the same seed always gives the same sample. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A stratified sample for raters: N rows split across the values of
 * `stratifyBy` in proportion to their share (largest remainder), each
 * stratum getting at least one row when N allows. Deterministic by seed.
 */
export function stratifiedSample<T extends Record<string, string>>(rows: T[], n: number, stratifyBy: string, seed = 1): T[] {
  if (n >= rows.length) return [...rows]
  const random = seededRandom(seed)
  const strata = new Map<string, T[]>()
  for (const row of rows) {
    const key = row[stratifyBy] ?? ''
    if (!strata.has(key)) strata.set(key, [])
    strata.get(key)!.push(row)
  }
  const keys = [...strata.keys()].sort()
  const quotas = new Map(keys.map((k) => [k, Math.min(1, n >= keys.length ? 1 : 0)]))
  let remaining = n - [...quotas.values()].reduce((s, q) => s + q, 0)
  const shares = keys.map((k) => ({ k, exact: (strata.get(k)!.length / rows.length) * remaining }))
  for (const { k, exact } of shares) quotas.set(k, quotas.get(k)! + Math.floor(exact))
  remaining = n - [...quotas.values()].reduce((s, q) => s + q, 0)
  for (const { k } of [...shares].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (remaining === 0) break
    if (quotas.get(k)! < strata.get(k)!.length) {
      quotas.set(k, quotas.get(k)! + 1)
      remaining--
    }
  }
  // A stratum smaller than its quota gives the rest to strata with room, so
  // the sample is always exactly N.
  for (const k of keys) quotas.set(k, Math.min(quotas.get(k)!, strata.get(k)!.length))
  let shortfall = n - [...quotas.values()].reduce((s, q) => s + q, 0)
  while (shortfall > 0) {
    const roomy = keys.filter((k) => quotas.get(k)! < strata.get(k)!.length)
    if (roomy.length === 0) break
    for (const k of roomy) {
      if (shortfall === 0) break
      quotas.set(k, quotas.get(k)! + 1)
      shortfall--
    }
  }
  const sample: T[] = []
  for (const k of keys) {
    const pool = [...strata.get(k)!]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    sample.push(...pool.slice(0, Math.min(quotas.get(k)!, pool.length)))
  }
  return sample
}
