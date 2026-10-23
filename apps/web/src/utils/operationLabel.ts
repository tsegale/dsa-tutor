/**
 * What the run is doing to the structure, in words, for the canvas.
 *
 * Every structure canvas drew the thing and its counters - "Size: 6 / 6",
 * "Front: 5 - Rear: 9" - and never said what operation was happening or
 * what made this structure different from the one before it. A student
 * watching Array Insertion saw a 99 appear among the bars with nothing
 * saying it was being inserted; a student on Deque saw boxes change with
 * nothing saying a value had gone on at the front. The engines have
 * carried the operation, the value and the index the whole time.
 *
 * Two lines. The headline is what is happening now. The detail is the
 * property that makes the structure what it is, which is the part a
 * student meeting it for the first time has no way to infer from boxes.
 *
 * Nothing is guessed. Where a step genuinely does not name an operation -
 * the queue engines set lastOperation only on the step that completes one,
 * not on the question before it - the headline describes the structure
 * rather than carrying the previous operation forward, which would state
 * an operation that is not the one in progress.
 */
export interface OperationLabel {
  /** "Inserting 99 at index 2" */
  headline: string
  /** Why this operation costs what it costs, or what defines the structure. */
  detail: string
}

function asState(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  return state as Record<string, unknown>
}

const num = (state: Record<string, unknown>, key: string): number | null => {
  const value = state[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const str = (state: Record<string, unknown>, key: string): string | null => {
  const value = state[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

// ------------------------------------------------------------- arrays

function arrayLabel(state: Record<string, unknown>): OperationLabel | null {
  const index = num(state, 'targetIndex')
  if (index === null) return null
  const value = num(state, 'operationValue')

  switch (state.operation) {
    case 'access':
      return {
        headline: `Reading the element at index ${index}`,
        detail: 'One address calculation, no searching: that is what makes access O(1).',
      }
    case 'insert':
      return {
        headline: value === null ? `Inserting a value at index ${index}` : `Inserting ${value} at index ${index}`,
        detail: `Every element from index ${index} onwards shifts one place right to make room.`,
      }
    case 'delete':
      return {
        headline: value === null ? `Deleting the element at index ${index}` : `Deleting ${value} from index ${index}`,
        detail: `Every element after index ${index} shifts one place left to close the gap.`,
      }
    default:
      return null
  }
}

// -------------------------------------------------------------- stack

function stackLabel(state: Record<string, unknown>): OperationLabel | null {
  if (num(state, 'topIndex') === null) return null
  const capacity = num(state, 'capacity')
  const value = num(state, 'lastOperationValue')
  const detail = 'Only the top is reachable. Push and pop both work there, which is what last in, first out means.'

  switch (state.lastOperation) {
    case 'push':
      return { headline: value === null ? 'Pushed a value onto the stack' : `Pushed ${value} onto the stack`, detail }
    case 'pop':
      return { headline: value === null ? 'Popped the top off the stack' : `Popped ${value} off the stack`, detail }
    case 'peek':
      return { headline: 'Read the value on top', detail: 'Peek looks without removing: the stack is left exactly as it was.' }
    default:
      return { headline: capacity === null ? 'A stack' : `A stack holding up to ${capacity} values`, detail }
  }
}

// ----------------------------------------------------- queue family

const QUEUE_DETAIL: Record<string, string> = {
  linear: 'Values join at the rear and leave from the front: first in, first out.',
  circular: 'The rear wraps round to the start when it runs off the end, so a slot freed at the front is reused.',
  deque: 'Both ends accept and release values: a deque is a queue and a stack at once.',
}

function queueLabel(state: Record<string, unknown>): OperationLabel | null {
  const variant = str(state, 'variant')
  if (variant === null || !(variant in QUEUE_DETAIL)) return null
  const detail = QUEUE_DETAIL[variant]
  const value = num(state, 'lastOperationValue')
  const capacity = num(state, 'capacity')
  const name = variant === 'deque' ? 'deque' : variant === 'circular' ? 'circular queue' : 'queue'

  // A deque's lastOperation is 'enqueue' for both ends, so it is never
  // told which end this was: saying "at the rear" there would be a guess.
  const end = variant === 'deque' ? '' : state.lastOperation === 'enqueue' ? ' at the rear' : ' from the front'

  switch (state.lastOperation) {
    case 'enqueue':
      return { headline: value === null ? `Added a value to the ${name}` : `Added ${value} to the ${name}${end}`, detail }
    case 'dequeue':
      return { headline: value === null ? `Removed a value from the ${name}` : `Removed ${value} from the ${name}${end}`, detail }
    default:
      return { headline: capacity === null ? `A ${name}` : `A ${name} holding up to ${capacity} values`, detail }
  }
}

// -------------------------------------------------------- linked lists

function linkedListDetail(state: Record<string, unknown>): string {
  const nodes = state.nodes
  const first = Array.isArray(nodes) ? (nodes[0] as Record<string, unknown> | undefined) : undefined
  if (first && 'prev' in first) {
    return 'Each node knows both of its neighbours, so the list can be walked in either direction.'
  }
  const last = Array.isArray(nodes) ? (nodes[nodes.length - 1] as Record<string, unknown> | undefined) : undefined
  if (last && typeof last.next === 'string') {
    return 'The last node points back at the head, so the walk comes round rather than ending.'
  }
  return 'Each node knows only the next one, so reaching the nth node means walking n steps.'
}

function linkedListLabel(state: Record<string, unknown>): OperationLabel | null {
  if (!Array.isArray(state.nodes)) return null
  const detail = linkedListDetail(state)
  const value = num(state, 'operationValue')

  switch (state.operation) {
    case 'insert':
      return { headline: value === null ? 'Inserting a node' : `Inserting ${value} into the list`, detail }
    case 'delete':
      return { headline: value === null ? 'Deleting a node' : `Deleting ${value} from the list`, detail }
    case 'search':
      return { headline: value === null ? 'Searching the list' : `Searching the list for ${value}`, detail }
    case 'traverse':
      return { headline: 'Walking the list from the head', detail }
    default:
      return { headline: `A list of ${state.nodes.length} nodes`, detail }
  }
}

// --------------------------------------------------------- hash tables

function hashTableLabel(state: Record<string, unknown>): OperationLabel | null {
  const capacity = num(state, 'capacity')
  const variant = str(state, 'variant')
  if (capacity === null || variant === null) return null
  const key = num(state, 'activeKey')
  const detail =
    variant === 'chaining'
      ? `A key's bucket is key mod ${capacity}. Two keys landing in the same bucket are chained in a list there.`
      : `A key's bucket is key mod ${capacity}. A bucket already taken is stepped past until a free one is found.`

  switch (state.operation) {
    case 'insert':
      return { headline: key === null ? 'Inserting a key' : `Inserting key ${key}`, detail }
    case 'search':
    case 'lookup':
      return { headline: key === null ? 'Looking a key up' : `Looking up key ${key}`, detail }
    case 'delete':
      return { headline: key === null ? 'Deleting a key' : `Deleting key ${key}`, detail }
    default:
      return { headline: `A hash table of ${capacity} buckets`, detail }
  }
}

/**
 * The label for whatever structure this state belongs to, or null for a
 * topic that is not an operation on a structure - a sort is not an
 * operation on one index, and recursion has no structure to label.
 */
export function operationLabelFor(state: unknown): OperationLabel | null {
  const raw = asState(state)
  if (!raw) return null
  if ('operation' in raw && 'targetIndex' in raw) return arrayLabel(raw)
  if ('topIndex' in raw) return stackLabel(raw)
  if ('variant' in raw && 'frontIndex' in raw) return queueLabel(raw)
  if ('nodes' in raw && 'headId' in raw) return linkedListLabel(raw)
  if ('buckets' in raw || ('capacity' in raw && 'activeKey' in raw)) return hashTableLabel(raw)
  return null
}
