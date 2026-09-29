import { CriticalJunctionType, ScaffoldingLevel, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import { BST_DEFAULT_DELETE_TARGET, BST_DEFAULT_SEED, bstDeleteEngine, bstInsertEngine, type BSTState } from '@/engine/bst'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { getTilesForSnapshot } from './tileBuilder'
import { getPromptForSnapshot } from './junctionPrompt'
import { correctTileIdFor } from './correctTile'
import { isWorkedStep } from './workedSteps'

/**
 * The junction inventory for expert review (Week 3 3E): for each study topic,
 * one row per junction form - the decision the learner is asked to predict,
 * with a real example prompt and its options - and how often it fires in a
 * representative run. A DSA lecturer rates each for pedagogical significance,
 * turning the choice of junctions from an assertion into a validated one.
 */

export interface InventoryRun {
  topic: string
  label: string
  snapshots: AlgorithmSnapshot[]
}

export interface InventoryRow {
  topic: string
  /** The run the counts come from. */
  run: string
  /** The run the example comes from, when it differs from run. */
  exampleRun: string
  junctionType: string
  form: string
  tests: string
  examplePrompt: string
  options: Array<{ text: string; correct: boolean }>
  firesPerRun: number
  askedAtFullSupport: number
  askedAtLowSupport: number
}

/** What each junction form asks the learner to reason about. */
const TESTS: Record<string, string> = {
  'SWAP_DECISION': 'Whether an adjacent pair is out of order, and so whether it is swapped (the comparison rule).',
  'PASS_COMPLETE': 'What one completed pass guarantees: the largest remaining unsorted value is in its final place (the invariant).',
  'EARLY_TERMINATION': 'Why a pass with no swaps means the array is sorted and the algorithm can stop.',
  'ALGORITHM_COMPLETE|bubble-sort': 'What property proves the array is fully sorted: no adjacent pair is out of order.',
  'ALGORITHM_COMPLETE|found': 'What confirms the target was located: an equality check at the index found.',
  'ALGORITHM_COMPLETE|not found': 'What confirms the target is absent: the whole search range was eliminated.',
  'ALGORITHM_COMPLETE|bst': 'Which traversal lists any binary search tree in sorted order (in-order), from the ordering invariant.',
  'COMPLEXITY_PREDICTION': 'Estimating how many comparisons the finished run made, relating the count to the growth rate.',
  'MIDPOINT_DECISION': 'Comparing the target with the middle value to choose which half can still contain it.',
  'BST_DIRECTION|comparison': 'Comparing a value with the current node to go left or right (equal values go right).',
  'BST_DIRECTION|empty slot': 'Where a new value attaches once an empty position is reached.',
  'BST_DIRECTION|removal': 'How a node is removed without breaking the ordering: leaf, one child, or in-order successor.',
}

function formOf(snapshot: AlgorithmSnapshot, topic: string): string {
  if (snapshot.criticalJunctionType === CriticalJunctionType.BST_DIRECTION) {
    const s = snapshot.dataStructureState as BSTState
    if (s.deleteCase) return 'removal'
    return s.currentNode === null ? 'empty slot' : 'comparison'
  }
  if (snapshot.criticalJunctionType === CriticalJunctionType.ALGORITHM_COMPLETE) {
    if (topic === 'binary-search') return (snapshot.dataStructureState as { found: boolean }).found ? 'found' : 'not found'
    return topic
  }
  return ''
}

const DISPLAY: Record<string, string> = { 'bubble-sort': 'Bubble Sort', 'binary-search': 'Binary Search', bst: 'Binary Search Tree' }

/** The runs a student meets on first opening each study topic, plus the BST delete run. */
export function representativeRuns(): InventoryRun[] {
  const search = getAlgorithmRegistryEntry('binary-search')
  const bubbleInput = getAlgorithmRegistryEntry('bubble-sort')?.defaultInput ?? [5, 3, 1, 4, 2]
  const searchInput = search?.defaultInput ?? [1, 3, 5, 7, 9, 11, 15, 19]
  const searchTarget = search?.defaultTarget ?? 7
  const root = (bstInsertEngine(BST_DEFAULT_SEED).at(-1)?.dataStructureState as BSTState).root
  return [
    { topic: 'bubble-sort', label: `sort [${bubbleInput.join(', ')}]`, snapshots: bubbleSortEngine(bubbleInput, { withComplexityPrediction: true }) },
    {
      topic: 'binary-search',
      label: `search [${searchInput.join(', ')}] for ${searchTarget}`,
      snapshots: binarySearchEngine(searchInput, searchTarget, { withComplexityPrediction: true }),
    },
    {
      topic: 'bst',
      label: `insert ${BST_DEFAULT_SEED.join(', ')}`,
      snapshots: bstInsertEngine(BST_DEFAULT_SEED, { withCompletionCheck: true, withComplexityPrediction: true }),
    },
    { topic: 'bst', label: `delete ${BST_DEFAULT_DELETE_TARGET} from that tree`, snapshots: bstDeleteEngine(root, BST_DEFAULT_DELETE_TARGET) },
    // Supplementary runs, so every junction a participant can meet is listed:
    // the default sort runs every pass (no early stop), and the default
    // search finds its target on the first probe (no real midpoint decision
    // and no not-found completion).
    { topic: 'bubble-sort', label: 'sort [2, 1, 3, 4, 5]', snapshots: bubbleSortEngine([2, 1, 3, 4, 5], { withComplexityPrediction: true }) },
    {
      topic: 'binary-search',
      label: `search [${searchInput.join(', ')}] for ${searchTarget + 1}`,
      snapshots: binarySearchEngine(searchInput, searchTarget + 1, { withComplexityPrediction: true }),
    },
  ]
}

/** Answers that make a weak example: the run ending, or a root insertion. */
const TRIVIAL_ANSWERS = new Set(['found', 'becomes-root'])

/**
 * One row per (topic, junction form). A form's frequency comes from the
 * first run it appears in (the topic's default run where possible); its
 * example is the first instance, in any run, whose answer is a real
 * decision (not the run ending or a root insertion).
 */
export function buildJunctionInventory(runs: InventoryRun[] = representativeRuns()): InventoryRow[] {
  const rows = new Map<string, InventoryRow & { exampleIsTrivial: boolean }>()
  for (const run of runs) {
    run.snapshots.forEach((snapshot, index) => {
      if (!snapshot.isPredictionRequired || !snapshot.criticalJunctionType) return
      const form = formOf(snapshot, run.topic)
      const key = `${run.topic}|${snapshot.criticalJunctionType}|${form}`
      const correct = correctTileIdFor(snapshot)
      const trivial = TRIVIAL_ANSWERS.has(correct ?? '')
      let row = rows.get(key)
      const laterRun = !!row && row.run !== run.label
      if (!row || (row.exampleIsTrivial && !trivial)) {
        const example = {
          examplePrompt: getPromptForSnapshot(snapshot, DISPLAY[run.topic]),
          options: getTilesForSnapshot(snapshot, DISPLAY[run.topic])
            .map((tile) => ({ text: tile.label, correct: tile.id === correct }))
            .sort((a, b) => a.text.localeCompare(b.text)),
          exampleRun: run.label,
          exampleIsTrivial: trivial,
        }
        row = row
          ? { ...row, ...example }
          : {
              topic: run.topic,
              run: run.label,
              junctionType: snapshot.criticalJunctionType,
              form: form === run.topic ? '' : form,
              tests: TESTS[form && form !== run.topic ? `${snapshot.criticalJunctionType}|${form}` : `${snapshot.criticalJunctionType}|${run.topic}`] ??
                TESTS[snapshot.criticalJunctionType] ?? '',
              ...example,
              firesPerRun: 0,
              askedAtFullSupport: 0,
              askedAtLowSupport: 0,
            }
        rows.set(key, row)
      }
      // Counted from its first run only; a later run can only improve the example.
      if (laterRun) return
      row.firesPerRun += 1
      if (!isWorkedStep(run.snapshots, index, ScaffoldingLevel.HIGH)) row.askedAtFullSupport += 1
      if (!isWorkedStep(run.snapshots, index, ScaffoldingLevel.LOW)) row.askedAtLowSupport += 1
    })
  }
  const order = ['bubble-sort', 'binary-search', 'bst']
  return [...rows.values()]
    .sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic))
    .map(({ exampleIsTrivial: _unused, ...row }) => row)
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A printable HTML review sheet: one table per topic, blank 1-5 rating boxes and a comment space. */
export function inventoryToHtml(rows: InventoryRow[], generatedOn: string): string {
  const topics = [...new Set(rows.map((r) => r.topic))]
  const sections = topics.map((topic) => {
    const body = rows
      .filter((r) => r.topic === topic)
      .map((r, i) => {
        const options = r.options
          .map((o) => `<li>${escape(o.text)}${o.correct ? ' <strong>(correct)</strong>' : ''}</li>`)
          .join('')
        const boxes = [1, 2, 3, 4, 5].map((n) => `<span class="box">${n}</span>`).join('')
        return `<tr>
  <td>${i + 1}</td>
  <td><strong>${escape(r.junctionType)}</strong>${r.form ? `<br><span class="muted">${escape(r.form)}</span>` : ''}<br><span class="muted">${escape(r.run)}</span>${r.exampleRun !== r.run ? `<br><span class="muted">example from: ${escape(r.exampleRun)}</span>` : ''}</td>
  <td>${escape(r.tests)}</td>
  <td>${escape(r.examplePrompt)}<ul>${options}</ul></td>
  <td class="num">${r.firesPerRun}<br><span class="muted">asked: ${r.askedAtFullSupport} at full support, ${r.askedAtLowSupport} at low</span></td>
  <td class="rate">${boxes}<div class="comment">Comment:</div></td>
</tr>`
      })
      .join('\n')
    return `<section>
<h2>${escape(DISPLAY[topic] ?? topic)}</h2>
<table>
<thead><tr><th>#</th><th>Junction</th><th>What it tests</th><th>Example prompt and options</th><th>Fires per run</th><th>Significance (circle 1-5)</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</section>`
  })
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Junction review - DSA Tutor</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 24px; font-size: 11pt; }
  h1 { font-size: 16pt; margin-bottom: 4px; }
  h2 { font-size: 13pt; margin-top: 24px; }
  p { max-width: 760px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #555; padding: 6px; vertical-align: top; text-align: left; }
  th { background: #eee; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  .muted { color: #555; font-size: 9pt; }
  .num { text-align: center; width: 80px; }
  .rate { width: 150px; }
  .box { display: inline-block; width: 18px; height: 18px; border: 1px solid #111; margin-right: 3px; text-align: center; font-size: 9pt; line-height: 18px; }
  .comment { margin-top: 8px; min-height: 48px; font-size: 9pt; color: #555; }
  section { page-break-inside: avoid; }
  @media print { body { margin: 12mm; } section { page-break-before: auto; } }
</style>
</head>
<body>
<h1>DSA Tutor - junction review</h1>
<p>The platform pauses each algorithm at the decision points below (junctions) and asks the learner to predict the next step before it continues. For each junction, please rate its <strong>pedagogical significance</strong>: how important it is that a learner can make this decision correctly in order to understand the algorithm.</p>
<p><strong>1</strong> not significant - <strong>2</strong> minor - <strong>3</strong> useful - <strong>4</strong> important - <strong>5</strong> essential. Please add a comment wherever a junction is missing something, is ambiguous, or should be dropped.</p>
<p class="muted">Each row shows one real example of the junction from a representative run, with its options (the correct one marked), and how often it fires in that run. "Asked" counts differ by support level because, with full support, most routine steps are shown as worked examples rather than asked. Generated ${escape(generatedOn)}.</p>
${sections.join('\n')}
<p>Reviewer name: ____________________ &nbsp; Date: ____________ &nbsp; Signature: ____________________</p>
</body>
</html>
`
}

/** The same rows as CSV, with empty rating and comment columns for data entry. */
export function inventoryToCsvRows(rows: InventoryRow[]): { header: string[]; rows: string[][] } {
  return {
    header: ['topic', 'junctionType', 'form', 'run', 'exampleRun', 'tests', 'examplePrompt', 'options', 'correctOption', 'firesPerRun', 'askedAtFullSupport', 'askedAtLowSupport', 'rating', 'comment'],
    rows: rows.map((r) => [
      r.topic,
      r.junctionType,
      r.form,
      r.run,
      r.exampleRun,
      r.tests,
      r.examplePrompt,
      r.options.map((o) => o.text).join(' | '),
      r.options.find((o) => o.correct)?.text ?? '',
      String(r.firesPerRun),
      String(r.askedAtFullSupport),
      String(r.askedAtLowSupport),
      '',
      '',
    ]),
  }
}
