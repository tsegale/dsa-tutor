import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, PredictionType } from '@dsa-tutor/types'
import { CODE_CHALLENGES, codeStepFor } from '@/config/codeChallenges'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { withCodeMode } from '@/engine/codeMode'
import { runFor } from '@/engine/runFor'

/**
 * Code Mode, as a property of content rather than of one engine.
 *
 * It used to be an option on bubbleSortEngine, which set
 * PredictionType.CODE_EDITOR on its own junctions. No other engine took
 * that option, so the toggle in the left panel - a platform-wide control,
 * with a platform-wide label - changed nothing at all on 65 of 66 topics.
 * A panel member switching it on while looking at Binary Search would have
 * seen the switch move and the page stay exactly as it was.
 *
 * These tests hold the two properties that keep it honest:
 *
 *  - a topic gets Code Mode by having a challenge written for it, and
 *    nothing else needs touching;
 *  - a junction becomes a code question only when the challenge can grade
 *    it from the engine's own next snapshot, so there is no authored
 *    answer key anywhere in Code Mode and the question can never disagree
 *    with the canvas beside it.
 */

const SLUGS_WITH_CHALLENGES = Object.keys(CODE_CHALLENGES)

/** Python keywords and the handful of builtins a one-step starter may use. */
const PYTHON_NAMES = new Set([
  'and', 'or', 'not', 'if', 'elif', 'else', 'for', 'while', 'in', 'is', 'None', 'True', 'False',
  'return', 'break', 'continue', 'pass', 'def', 'lambda', 'len', 'range', 'min', 'max', 'abs',
  'sum', 'sorted', 'reversed', 'enumerate', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set',
  'tuple', 'append', 'pop', 'insert', 'ord', 'chr', 'divmod', 'round',
])

/** The default run for a topic, with Code Mode deliberately applied by hand
 * rather than read from the store, so these tests do not depend on it. */
function runWithCodeMode(slug: string) {
  const entry = getAlgorithmRegistryEntry(slug)
  const plain = runFor(slug, entry?.defaultInput)
  return { plain, coded: withCodeMode(plain, slug, true) }
}

describe('the Code Mode pass', () => {
  it('has challenges to check', () => {
    expect(SLUGS_WITH_CHALLENGES.length).toBeGreaterThan(0)
  })

  it('changes nothing when Code Mode is off', () => {
    const { plain } = runWithCodeMode('bubble-sort')
    // Same array back, not a copy: a topic nobody switched Code Mode on
    // for is untouched.
    expect(withCodeMode(plain, 'bubble-sort', false)).toBe(plain)
  })

  it('changes nothing on a topic with no challenge written yet', () => {
    const { plain } = runWithCodeMode('merge-sort')
    if (CODE_CHALLENGES['merge-sort']) return
    expect(withCodeMode(plain, 'merge-sort', true)).toBe(plain)
  })

  it('changes nothing for a slug that does not exist', () => {
    const { plain } = runWithCodeMode('bubble-sort')
    expect(withCodeMode(plain, 'not-a-topic', true)).toBe(plain)
    expect(withCodeMode(plain, undefined, true)).toBe(plain)
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s reaches at least one code question', (slug) => {
    // A challenge that grades a junction the topic's run never produces is
    // a challenge nobody can ever see, and the toggle would again do
    // nothing on that topic.
    const { coded } = runWithCodeMode(slug)
    const codeQuestions = coded.filter((s) => s.predictionType === PredictionType.CODE_EDITOR)
    expect(codeQuestions.length).toBeGreaterThan(0)
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s leaves every other junction as it was', (slug) => {
    const { plain, coded } = runWithCodeMode(slug)
    const challenge = CODE_CHALLENGES[slug]
    expect(coded).toHaveLength(plain.length)
    coded.forEach((snapshot, index) => {
      if (snapshot.predictionType !== PredictionType.CODE_EDITOR) {
        expect(snapshot).toBe(plain[index])
        return
      }
      // Only a real junction, and only one this challenge claims.
      expect(snapshot.isPredictionRequired).toBe(true)
      expect(challenge.junctionTypes).toContain(snapshot.criticalJunctionType)
    })
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s never turns the complexity junction into code', (slug) => {
    // COMPLEXITY_PREDICTION asks how many comparisons the run made. It is
    // graded against the run's own counter, not against a data structure,
    // so a code editor there would have nothing to read back.
    const { coded } = runWithCodeMode(slug)
    for (const snapshot of coded) {
      if (snapshot.criticalJunctionType === CriticalJunctionType.COMPLEXITY_PREDICTION) {
        expect(snapshot.predictionType).not.toBe(PredictionType.CODE_EDITOR)
      }
    }
  })
})

describe('every code challenge', () => {
  it.each(SLUGS_WITH_CHALLENGES)('%s computes its expected answer in the declared shape', (slug) => {
    const { plain } = runWithCodeMode(slug)
    const challenge = CODE_CHALLENGES[slug]
    let graded = 0

    plain.forEach((_snapshot, index) => {
      const step = codeStepFor(slug, plain, index)
      if (!step) return
      graded += 1
      const { expected } = step
      switch (challenge.expect) {
        case 'number[]':
          expect(Array.isArray(expected) && expected.every((v) => typeof v === 'number')).toBe(true)
          break
        case 'number[][]':
          expect(
            Array.isArray(expected) &&
              expected.every((row) => Array.isArray(row) && row.every((v) => typeof v === 'number')),
          ).toBe(true)
          break
        case 'number':
          expect(typeof expected).toBe('number')
          expect(Number.isFinite(expected as number)).toBe(true)
          break
        case 'boolean':
          expect(typeof expected).toBe('boolean')
          break
        case 'string':
          expect(typeof expected).toBe('string')
          break
        case 'json':
          expect(expected).not.toBeUndefined()
          break
      }
    })

    expect(graded).toBeGreaterThan(0)
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s only references names the sandbox was actually given', (slug) => {
    const challenge = CODE_CHALLENGES[slug]
    const { plain } = runWithCodeMode(slug)
    const step = plain.map((_s, i) => codeStepFor(slug, plain, i)).find(Boolean)!
    const given = new Set(Object.keys(step.spec.globals))

    expect(given.size).toBeGreaterThan(0)

    // A starter that mentions a name the sandbox was never given is a
    // NameError waiting to happen, and reads to the student as a broken
    // exercise rather than as their own mistake. The starter is the only
    // place the names are advertised, so this has to agree with
    // globalsFor - two places that must say the same thing, which is the
    // shape of every defect this codebase has had.
    const body = challenge.starter.python
      .split('\n')
      .map((line) => line.replace(/#.*$/, ''))
      .join('\n')

    // Names the starter itself introduces are fine, wherever they come
    // from: `for k in ...`, `tmp = ...`, and the read-back the student is
    // asked to set.
    const introduced = new Set<string>([challenge.readBack])
    for (const match of body.matchAll(/(?:for\s+|^\s*)([a-z_][a-z0-9_]*)\s*(?:,\s*[a-z_][a-z0-9_]*\s*)*(?:=[^=]|\bin\b)/gim)) {
      introduced.add(match[1])
    }

    for (const match of body.matchAll(/\b([a-z_][a-z0-9_]*)\b/gi)) {
      const name = match[0]
      if (PYTHON_NAMES.has(name) || given.has(name) || introduced.has(name)) continue
      // Attribute and method names are not free variables.
      const before = body.slice(0, match.index ?? 0)
      if (before.endsWith('.')) continue
      expect.fail(`${slug}: the starter uses '${name}', which the sandbox is never given`)
    }
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s only claims to seed the canvas when it reads back a structure', (slug) => {
    const challenge = CODE_CHALLENGES[slug]
    if (!challenge.seedsNextRun) return
    // The canvas handler assigns the read-back value straight to
    // dataStructureState. A scalar there would draw a one-cell array.
    expect(['number[]', 'number[][]']).toContain(challenge.expect)
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s has at least one junction where doing nothing is wrong', (slug) => {
    const challenge = CODE_CHALLENGES[slug]
    const { plain } = runWithCodeMode(slug)

    // The read-back global starts at some value. If the expected answer
    // equals that value at every junction the challenge grades, then code
    // that does nothing at all is marked correct everywhere, and the
    // exercise is decoration.
    //
    // This is not hypothetical: Selection Sort's challenge was written
    // against the array, and a NEW_MINIMUM junction does not move the
    // array - only which index the pass thinks is smallest. Every
    // submission would have passed, including an empty one.
    const graded = plain
      .map((_s, index) => ({ index, step: codeStepFor(slug, plain, index) }))
      .filter((entry) => entry.step)

    expect(graded.length).toBeGreaterThan(0)

    const demandsWork = graded.some(({ step }) => {
      const untouched = step!.spec.globals[challenge.readBack]
      // Not a global at all: the student has to create it, so there is no
      // "do nothing" answer to begin with.
      if (untouched === undefined) return true
      return JSON.stringify(untouched) !== JSON.stringify(step!.expected)
    })

    expect(demandsWork, `${slug}: every graded junction accepts code that changes nothing`).toBe(true)
  })

  it.each(SLUGS_WITH_CHALLENGES)('%s asks for one decision, not a whole algorithm', (slug) => {
    const challenge = CODE_CHALLENGES[slug]
    // The brief is explicit that the exercise is the core logic at one
    // junction. A starter long enough to be the whole algorithm means the
    // scaffolding has stopped being scaffolding.
    expect(challenge.starter.python.split('\n').length).toBeLessThanOrEqual(10)
    expect(challenge.prompt.length).toBeGreaterThan(20)
    expect(challenge.junctionTypes.length).toBeGreaterThan(0)
  })
})
