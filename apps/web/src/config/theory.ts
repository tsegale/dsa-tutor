/**
 * Static, hand-written conceptual briefings - one per topic.
 *
 * This is deliberately NOT AI-generated: a student opening an algorithm for
 * the first time needs a stable, reviewed explanation, not a fresh paraphrase
 * each visit. The Theory tab is the default tab in Demo mode, so this is the
 * first thing a beginner reads before any animation plays.
 *
 * Complexity is NOT repeated here. The Theory tab reads it from
 * `config/complexity.ts` (backed by apps/ai/data/complexity.json), which is
 * the single source already shared with the Complexity tab and the Feynman
 * challenge prompts. Adding a second copy here would let the two drift.
 *
 * Schematics are monospace and must stay under 36 characters wide: the right
 * panel is 280px at its default width and the diagram must not force a
 * horizontal scrollbar.
 */
export interface TopicTheory {
  /** One plain-English mental model. No notation, no jargon. */
  analogy: string
  /** The mechanical rules, in the order they happen. Two to four bullets. */
  mechanism: string[]
  /** A monospace sketch of one representative step. Under 36 chars wide. */
  schematic: string
  /** When a working engineer would actually reach for this. One sentence. */
  whenToUse: string
}

export const TOPIC_THEORY: Record<string, TopicTheory> = {
  // ---------------------------------------------------------------- Module 1
  'array-access': {
    analogy:
      'Think of a row of numbered lockers, all the same size. To open locker 7 you do not walk past lockers 0 to 6 counting as you go. You know where it is, because every locker is the same width and they start at a known place, so you can work out its position in one step.',
    mechanism: [
      'The array knows its base address: where the first element sits in memory.',
      'Every element takes the same number of bytes, so element i sits at base + (i x element size).',
      'That is one multiplication and one addition, no matter how long the array is.',
    ],
    schematic: `base 0x40      each cell 4 bytes
idx   0    1    2    3
    [ 12 ][ 7 ][ 33][ 5 ]
     0x40 0x44 0x48 0x4C
arr[2] -> 0x40 + 2*4 = 0x48`,
    whenToUse:
      'Whenever you need a value by position and you already know the position.',
  },

  'array-insert': {
    analogy:
      'A full row of people seated shoulder to shoulder. To seat someone new in the middle, everyone from that seat onward has to shuffle one place along before the gap exists.',
    mechanism: [
      'Walk from the end of the array back to the insert position.',
      'Copy each element one slot to the right, opening a gap.',
      'Write the new value into the gap and increase the length.',
      'Inserting at the very end needs no shifting at all.',
    ],
    schematic: `insert 9 at index 1
[ 4 ][ 7 ][ 2 ][ 8 ][   ]
       \\___ \\___ \\___ shift
[ 4 ][   ][ 7 ][ 2 ][ 8 ]
[ 4 ][ 9 ][ 7 ][ 2 ][ 8 ]`,
    whenToUse:
      'Rarely in hot paths: if you insert in the middle often, a linked list or a different structure usually wins.',
  },

  'array-delete': {
    analogy:
      'Remove one person from that seated row and you are left with a gap. Everyone after them slides back one seat to close it, otherwise the row has a hole in the middle.',
    mechanism: [
      'Overwrite the element at the delete position with the one after it.',
      'Keep copying each later element one slot to the left.',
      'Shrink the length by one; the old last slot is now stale and ignored.',
      'Forgetting the shift leaves a duplicate of the final value at the tail.',
    ],
    schematic: `delete index 1
[ 4 ][ 9 ][ 7 ][ 2 ][ 8 ]
       ___/ ___/ ___/ shift
[ 4 ][ 7 ][ 2 ][ 8 ][ 8 ]
length 5 -> 4, tail ignored`,
    whenToUse:
      'Fine at the end of an array; costly in the middle of a large one.',
  },

  'singly-linked-list': {
    analogy:
      'A treasure hunt. Each clue tells you only where the next clue is. To reach the fifth clue you must follow the first four in order, and if you lose a clue, everything after it is unreachable.',
    mechanism: [
      'Each node holds a value and a reference to the next node.',
      'The list is reached only through its head; the last node points at nothing.',
      'To reach position k you must follow k references from the head.',
      'Inserting or deleting is cheap once you are holding the node before it.',
    ],
    schematic: `head
 |
[4|*]->[9|*]->[7|*]->[2|/]
                      null`,
    whenToUse:
      'When you insert and remove constantly and rarely need to jump to a position by number.',
  },

  'doubly-linked-list': {
    analogy:
      'A railway line where every station has signs to both the next station and the previous one. You can travel in either direction from where you stand, at the cost of maintaining twice the signage.',
    mechanism: [
      'Each node holds a value, a next reference and a previous reference.',
      'You can walk forwards from the head or backwards from the tail.',
      'Removing a node means fixing two references, not one.',
      'Every structural change must keep both directions consistent.',
    ],
    schematic: `    head              tail
     |                 |
null<-[4]<->[9]<->[7]->null
      prev/next both kept`,
    whenToUse:
      'When you need to walk backwards, or remove a node you already hold without hunting for its predecessor.',
  },

  'circular-linked-list': {
    analogy:
      'A roundabout. There is no end: follow it far enough and you arrive back where you started, so the only way to stop is to remember where you began.',
    mechanism: [
      'The last node points back to the head instead of at nothing.',
      'Traversal must stop on a condition, usually returning to the start node.',
      'There is no null to signal the end, so a careless loop runs forever.',
      'Useful when every item should get a turn, repeatedly.',
    ],
    schematic: `  +-----------------------+
  |                       |
  v                       |
[ 4 ]->[ 9 ]->[ 7 ]->[ 2 ]+
 head`,
    whenToUse:
      'Round-robin scheduling, turn-taking, or any buffer that should wrap rather than end.',
  },

  stack: {
    analogy:
      'A stack of plates. You add to the top and you take from the top. The plate at the bottom is the one you put down first and the last one you will ever reach.',
    mechanism: [
      'Push adds a value to the top.',
      'Pop removes and returns the value at the top.',
      'Peek reads the top without removing it.',
      'Last in, first out: the newest item is always the first one out.',
    ],
    schematic: `push 7      pop -> 7
  |            ^
  v            |
[ 7 ] <- top [ 7 ]
[ 9 ]        [ 9 ] <- top
[ 4 ]        [ 4 ]`,
    whenToUse:
      'Undo history, matching brackets, depth-first search, and every function call your program makes.',
  },

  queue: {
    analogy:
      'A queue at a counter. People join at the back and are served from the front. Nobody who arrived later is served first.',
    mechanism: [
      'Enqueue adds a value at the rear.',
      'Dequeue removes and returns the value at the front.',
      'First in, first out: arrival order is service order.',
      'Front and rear move independently as the queue grows and shrinks.',
    ],
    schematic: `front              rear
  |                  |
[ 4 ][ 9 ][ 7 ][ 2 ]
 out <-          <- in`,
    whenToUse:
      'Task scheduling, breadth-first search, and anything that must preserve arrival order.',
  },

  'circular-queue': {
    analogy:
      'A circular conveyor with a fixed number of trays. When the last tray is used the next item goes back to tray zero, reusing space that has already been emptied.',
    mechanism: [
      'Front and rear indices wrap around using modulo the capacity.',
      'Space freed by a dequeue is reused instead of being abandoned.',
      'Full and empty can look identical, so one slot is left spare or a count is kept.',
      'Capacity is fixed: the structure never grows.',
    ],
    schematic: `cap 5, front=3, rear=1
 idx 0    1    2    3    4
[ 8 ][ 2 ][    ][ 4 ][ 9 ]
  ^     ^        ^
 used  rear     front
rear = (rear + 1) % 5`,
    whenToUse:
      'Fixed-size buffers: streaming audio, keystroke buffers, producer and consumer pipelines.',
  },

  deque: {
    analogy:
      'A bus with doors at both ends. Passengers can board or leave from the front or the back, whichever is closer.',
    mechanism: [
      'Insert and remove are both allowed at the front and at the rear.',
      'It behaves as a stack if you only use one end.',
      'It behaves as a queue if you add at one end and remove at the other.',
      'Every one of the four operations is constant time.',
    ],
    schematic: `push front       push back
     |                 |
     v                 v
   [ 4 ][ 9 ][ 7 ][ 2 ]
     ^                 ^
 pop front        pop back`,
    whenToUse:
      'Sliding window problems, undo and redo together, and work-stealing schedulers.',
  },

  'hash-table-chaining': {
    analogy:
      'A wall of numbered pigeonholes. A formula turns a name into a pigeonhole number. When two names land on the same hole, you hang a small list inside that hole and both live there.',
    mechanism: [
      'A hash function maps a key to a bucket index.',
      'Two keys landing in the same bucket is a collision.',
      'Each bucket holds a list, so colliding entries are appended to it.',
      'Lookup hashes the key, then scans only that bucket list.',
    ],
    schematic: `h(k) = k % 5
 0: -> [10] -> [25]
 1: -> [16]
 2: empty
 3: -> [8]
 4: -> [14] -> [4] -> [9]`,
    whenToUse:
      'The default for dictionaries and sets when the number of entries is unpredictable.',
  },

  'hash-table-probing': {
    analogy:
      'A car park where every car has an assigned bay. If your bay is taken you drive on to the next free bay, and anyone looking for your car has to follow the same rule to find you.',
    mechanism: [
      'A hash function maps a key to a starting slot.',
      'If that slot is taken, step forward to the next slot, wrapping at the end.',
      'The same probe sequence is replayed on lookup until the key or an empty slot is found.',
      'Deleting leaves a tombstone, because a true empty slot would end a probe early.',
    ],
    schematic: `h(k) = k % 7, insert 10
 0 [  ][ 8][  ][10][  ][  ][  ]
        ^   taken -> probe
 probe: 3, 4, 5 ... first free`,
    whenToUse:
      'When memory locality matters and the load factor is kept well below one.',
  },

  'recursion-factorial': {
    analogy:
      'A line of people, each asked to pass the question back and wait. The last person in the line knows the answer outright, says it, and each person in turn multiplies and passes the result forward.',
    mechanism: [
      'The base case answers directly: factorial of 1 is 1.',
      'Every other call reduces the problem: n x factorial(n - 1).',
      'Each call waits on the stack until the one it made returns.',
      'Nothing is computed on the way down; the work happens as the stack unwinds.',
    ],
    schematic: `f(4) waits on f(3)
 f(3) waits on f(2)
  f(2) waits on f(1)
   f(1) = 1   <- base case
  f(2) = 2*1 = 2
 f(3) = 3*2 = 6
f(4) = 4*6 = 24`,
    whenToUse:
      'When a problem is naturally defined in terms of a smaller version of itself.',
  },

  'recursion-fibonacci': {
    analogy:
      'Asking two people the same question, each of whom asks two more. The tree of questions explodes, and the same question gets asked over and over by different branches.',
    mechanism: [
      'Two base cases: fib(0) is 0 and fib(1) is 1.',
      'Every other call branches twice: fib(n - 1) + fib(n - 2).',
      'The call tree grows exponentially because subtrees overlap.',
      'fib(3) alone is recomputed from scratch in several branches.',
    ],
    schematic: `        f(5)
      /      \\
   f(4)      f(3)
   /  \\      /  \\
 f(3) f(2) f(2) f(1)
  ^          ^
  recomputed, not reused`,
    whenToUse:
      'As a demonstration of why memoisation exists: the naive version is the problem, not the solution.',
  },
}

/** Topics with no briefing written yet render the tab's empty state. */
export function theoryFor(slug: string): TopicTheory | null {
  return TOPIC_THEORY[slug] ?? null
}
