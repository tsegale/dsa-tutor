import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface HashTableState {
  buckets: Array<{
    index: number
    chain: Array<{ id: string; key: number | string; value: number | string }>
  }>
  capacity: number
  size: number
  activeKey: number | string | null
  activeBucket: number | null
  activeProbeSequence: number[]
  collisionOccurred: boolean
  operation: 'insert' | 'search' | 'delete'
  variant: 'chaining' | 'linear_probing' | 'quadratic_probing'
  hashResult: number | null
  deletedIndices?: number[]
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: HashTableState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    canvasType: CanvasType.HASH_TABLE,
    dataStructureState: {
      ...params.state,
      buckets: params.state.buckets.map((b) => ({ ...b, chain: b.chain.map((e) => ({ ...e })) })),
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

let idCounter = 0
function nextId(key: number): string {
  return `hash-${key}-${idCounter++}`
}

// 7 is prime: a prime capacity spreads keys more evenly than a
// composite one (e.g. every even key would collide in every even
// bucket of a capacity-8 table) - worth calling out to students.
const DEFAULT_CAPACITY = 7
const LOAD_FACTOR_WARNING_THRESHOLD = 0.7

// hash(key) = key % capacity
//   0: 'hash(key) = key % capacity'
//   1: 'if bucket occupied: resolve collision (chain or probe)'
//   2: 'place the entry'
//   3: 'if match: found'
//   4: 'not found'
const LINE = { HASH: 0, COLLISION: 1, PLACE: 2, FOUND: 3, NOT_FOUND: 4 } as const

function emptyBuckets(capacity: number): HashTableState['buckets'] {
  return Array.from({ length: capacity }, (_, index) => ({ index, chain: [] }))
}

function hashOf(key: number, capacity: number): number {
  return ((key % capacity) + capacity) % capacity
}

/**
 * Inserts each key from `keys` into a chaining hash table of
 * `capacity` buckets (default 7, a prime). HASH_BUCKET junction on
 * every insert; COLLISION_RESOLVE junction whenever the target bucket
 * already has an entry. New entries join the back of the chain.
 */
export function hashInsertChainingEngine(keys: number[], capacity: number = DEFAULT_CAPACITY): AlgorithmSnapshot[] {
  let buckets = emptyBuckets(capacity)
  let size = 0
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (overrides: Partial<HashTableState> = {}): HashTableState => ({
    buckets,
    capacity,
    size,
    activeKey: null,
    activeBucket: null,
    activeProbeSequence: [],
    collisionOccurred: false,
    operation: 'insert',
    variant: 'chaining',
    hashResult: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting with an empty hash table of ${capacity} buckets (chaining).`,
      pseudocodeLine: LINE.HASH,
      isPredictionRequired: false,
      state: baseState(),
    }),
  )

  for (const key of keys) {
    const bucketIndex = hashOf(key, capacity)
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Inserting key ${key}. Which bucket does hash(${key}) = ${key} % ${capacity} map to?`,
        pseudocodeLine: LINE.HASH,
        isPredictionRequired: true,
        // hashResult carries the answer for the AI evaluator to grade
        // against - HashTableCanvas hides it from the formula display
        // while this exact prediction is still pending.
        state: baseState({ activeKey: key, hashResult: bucketIndex }),
        criticalJunctionType: CriticalJunctionType.HASH_BUCKET,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    const bucket = buckets[bucketIndex]
    const hasCollision = bucket.chain.length > 0

    if (hasCollision) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Bucket ${bucketIndex} already contains ${bucket.chain.length} item${bucket.chain.length === 1 ? '' : 's'}. Where does ${key} go in the chain?`,
          pseudocodeLine: LINE.COLLISION,
          isPredictionRequired: true,
          state: baseState({ activeKey: key, activeBucket: bucketIndex, hashResult: bucketIndex, collisionOccurred: true }),
          criticalJunctionType: CriticalJunctionType.COLLISION_RESOLVE,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
        }),
      )
    }

    buckets = buckets.map((b) =>
      b.index === bucketIndex ? { ...b, chain: [...b.chain, { id: nextId(key), key, value: key }] } : b,
    )
    size += 1

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `${key} placed in bucket ${bucketIndex}${hasCollision ? ', at the back of the chain.' : '.'}`,
        pseudocodeLine: LINE.PLACE,
        isPredictionRequired: false,
        state: baseState({ activeKey: key, activeBucket: bucketIndex, hashResult: bucketIndex, collisionOccurred: hasCollision }),
        isFinalStep: key === keys[keys.length - 1],
      }),
    )
  }

  if (keys.length === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/**
 * Builds a chaining hash table from `keys` (no junctions - setup),
 * then searches for `target` by hashing to its bucket and walking the
 * chain there.
 */
export function hashSearchChainingEngine(
  keys: number[],
  target: number,
  capacity: number = DEFAULT_CAPACITY,
): AlgorithmSnapshot[] {
  let buckets = emptyBuckets(capacity)
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  for (const key of keys) {
    const bucketIndex = hashOf(key, capacity)
    buckets = buckets.map((b) =>
      b.index === bucketIndex ? { ...b, chain: [...b.chain, { id: nextId(key), key, value: key }] } : b,
    )
  }

  const baseState = (overrides: Partial<HashTableState> = {}): HashTableState => ({
    buckets,
    capacity,
    size: keys.length,
    activeKey: target,
    activeBucket: null,
    activeProbeSequence: [],
    collisionOccurred: false,
    operation: 'search',
    variant: 'chaining',
    hashResult: null,
    ...overrides,
  })

  const bucketIndex = hashOf(target, capacity)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Searching for ${target}. Which bucket does hash(${target}) = ${target} % ${capacity} map to?`,
      pseudocodeLine: LINE.HASH,
      isPredictionRequired: true,
      state: baseState(),
      criticalJunctionType: CriticalJunctionType.HASH_BUCKET,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const bucket = buckets[bucketIndex]
  const found = bucket.chain.some((e) => e.key === target)

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Found ${target} in bucket ${bucketIndex}'s chain.`
        : `Bucket ${bucketIndex}'s chain does not contain ${target}. Not found.`,
      pseudocodeLine: found ? LINE.FOUND : LINE.NOT_FOUND,
      isPredictionRequired: false,
      state: baseState({ activeBucket: bucketIndex, hashResult: bucketIndex }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Builds a chaining hash table from `keys` (no junctions - setup), then
 * deletes `target` by hashing to its bucket and removing it from the
 * chain there. Chaining deletion needs no tombstone - the rest of the
 * chain is still walked start-to-end on every future search.
 */
export function hashDeleteChainingEngine(
  keys: number[],
  target: number,
  capacity: number = DEFAULT_CAPACITY,
): AlgorithmSnapshot[] {
  let buckets = emptyBuckets(capacity)
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  for (const key of keys) {
    const bucketIndex = hashOf(key, capacity)
    buckets = buckets.map((b) =>
      b.index === bucketIndex ? { ...b, chain: [...b.chain, { id: nextId(key), key, value: key }] } : b,
    )
  }

  const baseState = (overrides: Partial<HashTableState> = {}): HashTableState => ({
    buckets,
    capacity,
    size: keys.length,
    activeKey: target,
    activeBucket: null,
    activeProbeSequence: [],
    collisionOccurred: false,
    operation: 'delete',
    variant: 'chaining',
    hashResult: null,
    ...overrides,
  })

  const bucketIndex = hashOf(target, capacity)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Deleting key ${target}. Which bucket does hash(${target}) = ${target} % ${capacity} map to?`,
      pseudocodeLine: LINE.HASH,
      isPredictionRequired: true,
      state: baseState(),
      criticalJunctionType: CriticalJunctionType.HASH_BUCKET,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const bucket = buckets[bucketIndex]
  const found = bucket.chain.some((e) => e.key === target)
  if (found) {
    buckets = buckets.map((b) => (b.index === bucketIndex ? { ...b, chain: b.chain.filter((e) => e.key !== target) } : b))
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `${target} removed from bucket ${bucketIndex}'s chain.`
        : `Bucket ${bucketIndex}'s chain does not contain ${target}. Nothing to delete.`,
      pseudocodeLine: found ? LINE.FOUND : LINE.NOT_FOUND,
      isPredictionRequired: false,
      state: baseState({ buckets, size: found ? keys.length - 1 : keys.length, activeBucket: bucketIndex, hashResult: bucketIndex }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Inserts each key from `keys` into a linear-probing hash table of
 * `capacity` slots. HASH_BUCKET junction on every insert; PROBE_NEXT
 * on every occupied slot encountered while probing (fires again if
 * still occupied, to surface clustering). LOAD_FACTOR fires once, the
 * first time the load factor crosses 0.7.
 */
export function hashInsertLinearProbingEngine(
  keys: number[],
  capacity: number = DEFAULT_CAPACITY,
): AlgorithmSnapshot[] {
  let buckets = emptyBuckets(capacity)
  let size = 0
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let loadFactorShown = false

  const baseState = (overrides: Partial<HashTableState> = {}): HashTableState => ({
    buckets,
    capacity,
    size,
    activeKey: null,
    activeBucket: null,
    activeProbeSequence: [],
    collisionOccurred: false,
    operation: 'insert',
    variant: 'linear_probing',
    hashResult: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting with an empty hash table of ${capacity} slots (linear probing).`,
      pseudocodeLine: LINE.HASH,
      isPredictionRequired: false,
      state: baseState(),
    }),
  )

  for (const key of keys) {
    if (size >= capacity) {
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `The table is full (${capacity} of ${capacity} slots used). ${key} cannot be inserted.`,
          pseudocodeLine: LINE.COLLISION,
          isPredictionRequired: false,
          state: baseState({ activeKey: key }),
          isFinalStep: true,
        }),
      )
      return snapshots
    }

    const home = hashOf(key, capacity)
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Inserting key ${key}. Which slot does hash(${key}) = ${key} % ${capacity} map to?`,
        pseudocodeLine: LINE.HASH,
        isPredictionRequired: true,
        // hashResult carries the answer for the AI evaluator to grade
        // against - HashTableCanvas hides it from the formula display
        // while this exact prediction is still pending.
        state: baseState({ activeKey: key, hashResult: home }),
        criticalJunctionType: CriticalJunctionType.HASH_BUCKET,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    const probed: number[] = []
    let slot = home
    let collided = false
    while (buckets[slot].chain.length > 0) {
      collided = true
      probed.push(slot)
      const next = (slot + 1) % capacity
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `Position ${slot} is taken. Where does linear probing check next?`,
          pseudocodeLine: LINE.COLLISION,
          isPredictionRequired: true,
          state: baseState({ activeKey: key, activeProbeSequence: [...probed], hashResult: home }),
          criticalJunctionType: CriticalJunctionType.PROBE_NEXT,
          junctionDifficulty: JunctionDifficulty.PROCEDURAL,
        }),
      )
      slot = next
    }

    buckets = buckets.map((b) => (b.index === slot ? { ...b, chain: [{ id: nextId(key), key, value: key }] } : b))
    size += 1
    const loadFactor = size / capacity

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `${key} placed at index ${slot}${collided ? ` after probing past ${probed.length} occupied slot${probed.length === 1 ? '' : 's'}.` : '.'}`,
        pseudocodeLine: LINE.PLACE,
        isPredictionRequired: false,
        state: baseState({
          activeKey: key,
          activeBucket: slot,
          hashResult: home,
          activeProbeSequence: probed,
          collisionOccurred: collided,
        }),
        isFinalStep: key === keys[keys.length - 1] && loadFactor < LOAD_FACTOR_WARNING_THRESHOLD,
      }),
    )

    if (!loadFactorShown && loadFactor > LOAD_FACTOR_WARNING_THRESHOLD) {
      loadFactorShown = true
      snapshots.push(
        makeSnapshot({
          stepIndex: stepIndex++,
          description: `With ${size} items in ${capacity} buckets, the load factor is ${loadFactor.toFixed(2)}. Should we resize?`,
          pseudocodeLine: LINE.PLACE,
          isPredictionRequired: true,
          state: baseState({ activeKey: key, activeBucket: slot, hashResult: home }),
          criticalJunctionType: CriticalJunctionType.LOAD_FACTOR,
          junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          isFinalStep: key === keys[keys.length - 1],
        }),
      )
    }
  }

  if (keys.length === 0) {
    snapshots[snapshots.length - 1] = { ...snapshots[snapshots.length - 1], isFinalStep: true }
  }

  return snapshots
}

/**
 * Builds a linear-probing hash table from `keys` (no junctions -
 * setup), then searches for `target` by probing forward from its home
 * slot until a match or an empty slot (the stop condition) is found.
 */
export function hashSearchLinearProbingEngine(
  keys: number[],
  target: number,
  capacity: number = DEFAULT_CAPACITY,
): AlgorithmSnapshot[] {
  let buckets = emptyBuckets(capacity)
  let size = 0
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  for (const key of keys) {
    if (size >= capacity) break
    let slot = hashOf(key, capacity)
    while (buckets[slot].chain.length > 0) {
      slot = (slot + 1) % capacity
    }
    buckets = buckets.map((b) => (b.index === slot ? { ...b, chain: [{ id: nextId(key), key, value: key }] } : b))
    size += 1
  }

  const baseState = (overrides: Partial<HashTableState> = {}): HashTableState => ({
    buckets,
    capacity,
    size,
    activeKey: target,
    activeBucket: null,
    activeProbeSequence: [],
    collisionOccurred: false,
    operation: 'search',
    variant: 'linear_probing',
    hashResult: null,
    ...overrides,
  })

  const home = hashOf(target, capacity)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Searching for ${target}. Which slot does hash(${target}) = ${target} % ${capacity} map to?`,
      pseudocodeLine: LINE.HASH,
      isPredictionRequired: true,
      state: baseState({ hashResult: home }),
      criticalJunctionType: CriticalJunctionType.HASH_BUCKET,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const probed: number[] = []
  let slot = home
  let found = false
  for (let i = 0; i < capacity; i++) {
    const entry = buckets[slot].chain[0]
    if (!entry) break
    if (entry.key === target) {
      found = true
      break
    }
    probed.push(slot)
    slot = (slot + 1) % capacity
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Found ${target} at index ${slot}${probed.length > 0 ? ` after probing past ${probed.length} slot${probed.length === 1 ? '' : 's'}.` : '.'}`
        : `Reached an empty slot without finding ${target}. Not found.`,
      pseudocodeLine: found ? LINE.FOUND : LINE.NOT_FOUND,
      isPredictionRequired: false,
      state: baseState({ activeBucket: found ? slot : null, hashResult: home, activeProbeSequence: probed }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

/**
 * Builds a linear-probing hash table from `keys` (no junctions -
 * setup), then deletes `target` by probing forward from its home slot
 * exactly like search. On a match, the slot is tombstoned rather than
 * simply cleared: clearing it would break the probe sequence for any
 * other key that happened to hash to an earlier slot and probed past
 * this one to find its own spot - a later search for that key would
 * stop early at the falsely-empty slot and report it missing.
 */
export function hashDeleteLinearProbingEngine(
  keys: number[],
  target: number,
  capacity: number = DEFAULT_CAPACITY,
): AlgorithmSnapshot[] {
  let buckets = emptyBuckets(capacity)
  let size = 0
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  for (const key of keys) {
    if (size >= capacity) break
    let slot = hashOf(key, capacity)
    while (buckets[slot].chain.length > 0) {
      slot = (slot + 1) % capacity
    }
    buckets = buckets.map((b) => (b.index === slot ? { ...b, chain: [{ id: nextId(key), key, value: key }] } : b))
    size += 1
  }

  const baseState = (overrides: Partial<HashTableState> = {}): HashTableState => ({
    buckets,
    capacity,
    size,
    activeKey: target,
    activeBucket: null,
    activeProbeSequence: [],
    collisionOccurred: false,
    operation: 'delete',
    variant: 'linear_probing',
    hashResult: null,
    ...overrides,
  })

  const home = hashOf(target, capacity)
  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Deleting key ${target}. Which slot does hash(${target}) = ${target} % ${capacity} map to?`,
      pseudocodeLine: LINE.HASH,
      isPredictionRequired: true,
      state: baseState({ hashResult: home }),
      criticalJunctionType: CriticalJunctionType.HASH_BUCKET,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    }),
  )

  const probed: number[] = []
  let slot = home
  let found = false
  for (let i = 0; i < capacity; i++) {
    const entry = buckets[slot].chain[0]
    if (!entry) break
    if (entry.key === target) {
      found = true
      break
    }
    probed.push(slot)
    slot = (slot + 1) % capacity
  }

  const deletedIndices = found ? [slot] : []
  if (found) {
    buckets = buckets.map((b) => (b.index === slot ? { ...b, chain: [] } : b))
    size -= 1
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `${target} removed from index ${slot}. That slot is now tombstoned, not empty, so later searches keep probing past it.`
        : `Reached an empty slot without finding ${target}. Nothing to delete.`,
      pseudocodeLine: found ? LINE.FOUND : LINE.NOT_FOUND,
      isPredictionRequired: false,
      state: baseState({
        buckets,
        size,
        activeBucket: found ? slot : null,
        hashResult: home,
        activeProbeSequence: probed,
        deletedIndices,
      }),
      isFinalStep: true,
    }),
  )

  return snapshots
}
