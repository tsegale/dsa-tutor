/**
 * The comparison-count formula for a study topic, evaluated at n, shown on
 * the Complexity tab next to the run's measured count (Week 2 2C) - seeing
 * the measured count meet the formula is the point.
 */
export interface EvaluatedFormula {
  expression: string
  value: number
  note: string
}

export function comparisonFormula(topicSlug: string | undefined, n: number): EvaluatedFormula | null {
  switch (topicSlug) {
    case 'bubble-sort':
      return {
        expression: 'n(n-1)/2',
        value: (n * (n - 1)) / 2,
        note: 'at most; a pass with no swaps can stop it early',
      }
    case 'binary-search':
      return {
        expression: 'floor(log2 n) + 1',
        value: n > 0 ? Math.floor(Math.log2(n)) + 1 : 0,
        note: 'at most; each comparison halves the range',
      }
    case 'bst':
      return {
        expression: 'n(n-1)/2',
        value: (n * (n - 1)) / 2,
        note: 'at most, if the tree is a chain; a balanced tree needs about n log2 n',
      }
    default:
      return null
  }
}
