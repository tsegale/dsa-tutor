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

  // ---------------------------------------------------------------- Module 2
  'linear-search': {
    analogy:
      'Looking for a friend in an unsorted crowd. You have no choice but to check faces one at a time, and you only know they are absent once you have checked everybody.',
    mechanism: [
      'Start at the first element and compare it with the target.',
      'If it does not match, move to the next element and compare again.',
      'Stop the moment a match is found, returning its index.',
      'Reaching the end without a match means the value is not present.',
    ],
    schematic: `find 7
[ 4 ][ 9 ][ 7 ][ 2 ]
  ^    ^    ^
  no   no   found, stop`,
    whenToUse:
      'Small collections, unsorted data, or when you would spend more time sorting than searching.',
  },

  'binary-search': {
    analogy:
      'Guessing a number between one and a hundred when every guess is answered with higher or lower. Guess fifty and half the possibilities vanish, whatever the answer is.',
    mechanism: [
      'The data must already be sorted; this is the whole precondition.',
      'Compare the target with the middle element of the current range.',
      'Discard the half that cannot contain the target and repeat on the other.',
      'The range shrinks by half each time, so it empties after very few steps.',
    ],
    schematic: `find 7 in sorted data
[1][3][5][7][9][11][13]
 lo      mid        hi
 7 > 5 -> discard left half`,
    whenToUse:
      'Any sorted collection you search more than once, and as the inner idea behind searching an answer range.',
  },

  'jump-search': {
    analogy:
      'Walking a long shelf of numbered books by checking only every tenth spine. Once you overshoot the number you want, you back up and walk that one short stretch properly.',
    mechanism: [
      'Pick a fixed step size and jump forward that many positions at a time.',
      'Stop jumping as soon as the element at the jump point passes the target.',
      'Walk backwards through that single block one element at a time.',
      'The step size that balances the jumping and the walking is the square root of the length.',
    ],
    schematic: `step = 4, find 19
[2][5][9][12][15][19][23]
 ^           ^
 block jumps, then walk
 back one block linearly`,
    whenToUse:
      'Sorted data on media where jumping backwards is expensive, so you want few backward moves.',
  },

  'interpolation-search': {
    analogy:
      'Opening a phone book for the name Zimmerman. You do not open it in the middle, you open it near the back, because you expect the names to be spread out fairly evenly.',
    mechanism: [
      'Estimate the position from the target value, not from the midpoint.',
      'The estimate assumes the values are spread evenly across the range.',
      'Compare at the estimated position and narrow the range as in binary search.',
      'Badly clustered data makes the estimate worse than a plain midpoint.',
    ],
    schematic: `find 90 in [0..100]
[0][10][20]...[90][100]
guess near the far right,
not the middle`,
    whenToUse:
      'Sorted numeric data you know to be close to uniformly distributed.',
  },

  'exponential-search': {
    analogy:
      'Finding the edge of a map you cannot see the end of. You step one pace, then two, then four, doubling until you have clearly gone too far, then search carefully inside that last stretch.',
    mechanism: [
      'Check index one, then two, then four, doubling until the value passes the target.',
      'The target, if present, now lies between the last two indices checked.',
      'Run a binary search on that bounded range.',
      'The doubling phase is what lets this work when the length is unknown.',
    ],
    schematic: `find 7, bound unknown
check idx 1, 2, 4, 8 ...
idx 8 overshoots -> range
is (4, 8], binary search it`,
    whenToUse:
      'Unbounded or streamed sorted sequences, and sorted data where the target is likely near the front.',
  },

  // ---------------------------------------------------------------- Module 3
  'bubble-sort': {
    analogy:
      'Lighter bubbles rising through water. Each sweep compares neighbours and swaps them if they are out of order, so the largest value drifts to the end of the row every pass.',
    mechanism: [
      'Compare each adjacent pair and swap them if the left one is larger.',
      'After one full pass the largest remaining value is in its final place.',
      'Repeat on the shrinking unsorted prefix.',
      'A pass with no swaps means the data is sorted, so you can stop early.',
    ],
    schematic: `pass 1 of [5 1 4 2]
[5 1]4 2  -> swap
5[1 4]2   -> ok
5 1[4 2]  -> swap
[1 4 2 5] 5 is settled`,
    whenToUse:
      'Teaching, and detecting already-sorted input; never for real work on large data.',
  },

  'selection-sort': {
    analogy:
      'Picking a team by scanning everyone available, choosing the single best, and putting them at the front. Then you scan everyone who is left and do it again.',
    mechanism: [
      'Scan the whole unsorted region to find its smallest element.',
      'Swap that element into the first unsorted position.',
      'The sorted prefix grows by one and the scan starts one place later.',
      'The number of comparisons never changes, but there is at most one swap per pass.',
    ],
    schematic: `find the smallest, swap it
[5][1][4][2]  min = 1
 ^   ^
[1][5][4][2]  idx 0 done
next pass starts at idx 1`,
    whenToUse:
      'When writes are far more expensive than reads, since it makes the fewest possible swaps.',
  },

  'insertion-sort': {
    analogy:
      'Sorting a hand of playing cards. You hold a sorted fan on the left, pick up the next card, and slide it leftwards past every card larger than it until it drops into place.',
    mechanism: [
      'Treat the first element as a sorted region of length one.',
      'Take the next element and shift larger sorted elements one place right.',
      'Drop the held element into the gap that opens.',
      'Nearly sorted data barely shifts anything, which makes this very fast on it.',
    ],
    schematic: `hand of cards, insert 2
sorted | rest
[1 4 5]| 2
 2 < 5, 2 < 4, 2 > 1
[1 2 4 5]|`,
    whenToUse:
      'Small arrays and nearly sorted data; it is the base case inside most production sorts.',
  },

  'shell-sort': {
    analogy:
      'Tidying a long row by first swapping items that are far apart, so anything badly out of place travels a long way in one move, then tightening the spacing until you are comparing neighbours.',
    mechanism: [
      'Choose a large gap and insertion-sort the elements that are that far apart.',
      'Reduce the gap and repeat, so the data becomes progressively more ordered.',
      'The final pass has a gap of one, which is a plain insertion sort.',
      'Earlier passes mean that last pass has almost nothing left to shift.',
    ],
    schematic: `gap 4: compare i, i+4
[8 3 7 1|9 2 6 5]
 ^-------^
gap 2, then gap 1
last pass is insertion sort`,
    whenToUse:
      'Medium arrays with no recursion and no extra memory, where a simple in-place sort must still be quick.',
  },

  'merge-sort': {
    analogy:
      'Two people each hand you a sorted pile of cards. You build one sorted pile by repeatedly taking whichever top card is smaller, never looking deeper than the top of each pile.',
    mechanism: [
      'Split the array in half, then split each half, down to pieces of one.',
      'A single element is sorted by definition, which ends the recursion.',
      'Merge two sorted pieces by always taking the smaller front element.',
      'Merging needs somewhere to write, so it uses a scratch array.',
    ],
    schematic: `[5 1 4 2]
 split    [5 1] [4 2]
 split    [5][1] [4][2]
 merge    [1 5] [2 4]
 merge    [1 2 4 5]`,
    whenToUse:
      'When you need a guaranteed bound and a stable sort, or when the data does not fit in memory.',
  },

  'quick-sort': {
    analogy:
      'Lining up a class by height by picking one pupil and asking everyone shorter to stand left and everyone taller to stand right. That pupil is now in their final position, and each side is a smaller version of the same task.',
    mechanism: [
      'Choose a pivot element from the current range.',
      'Partition so that everything smaller sits left of it and everything larger right.',
      'The pivot is now in its final sorted position and never moves again.',
      'Recurse on the left and right parts; a bad pivot makes one part nearly the whole range.',
    ],
    schematic: `pivot = 4
[5 1 4 2 7]  -> partition
[1 2]  4  [5 7]
 < 4   pivot   > 4
recurse on each side`,
    whenToUse:
      'The default in-memory sort: fastest in practice, so long as the pivot choice is not naive.',
  },

  'heap-sort': {
    analogy:
      'A tournament bracket where the winner sits at the top. Take the champion away, promote whoever can reach the top, and the next champion emerges from a slightly smaller tournament.',
    mechanism: [
      'Rearrange the array into a max-heap, where every parent beats its children.',
      'The root is the largest value, so swap it with the last element of the heap.',
      'Shrink the heap by one and sift the new root down to restore the heap rule.',
      'Repeat until the heap holds one element; the array is now sorted in place.',
    ],
    schematic: `build a max-heap first
    9
   / \\
  5   7      root is max
swap root with the last
cell, shrink, sift down`,
    whenToUse:
      'When you need a hard worst-case guarantee with no extra memory and do not need stability.',
  },

  'counting-sort': {
    analogy:
      'Sorting a bucket of dice by rolling them into six labelled trays and then pouring the trays out in order. You never compare one die with another, you only count how many of each face there are.',
    mechanism: [
      'Count how many times each possible value appears.',
      'Turn those counts into running totals, giving each value its output position.',
      'Place each element directly where its running total says it belongs.',
      'This only works when the values are small integers in a known range.',
    ],
    schematic: `values 0..5, no comparisons
in : [3 1 3 0 2]
cnt: [1 1 1 2 0 0]
       0 1 2 3 4 5
out: [0 1 2 3 3]`,
    whenToUse:
      'Large numbers of small integer keys: ages, scores, byte values, bucket labels.',
  },

  'radix-sort': {
    analogy:
      'Sorting a stack of forms by postcode, one character at a time, starting from the last character. Because each pass keeps the order of the previous one, the stack ends up fully sorted.',
    mechanism: [
      'Sort by the least significant digit using a stable counting sort.',
      'Repeat for the next digit, and the next, up to the most significant.',
      'Stability is essential: each pass must preserve the previous pass ordering.',
      'The number of passes is the number of digits, not the number of elements.',
    ],
    schematic: `sort by digit, least first
[170 45 75 90]
ones: [170 90 45 75]
tens: [170 45 75 90]
huns: [45 75 90 170]`,
    whenToUse:
      'Fixed-width keys in bulk: integers, dates, fixed-length strings, IP addresses.',
  },

  // ---------------------------------------------------------------- Module 4
  'prefix-sum': {
    analogy:
      'A running total written in the margin of a ledger. Once every line has its cumulative figure beside it, the total for any stretch of the ledger is the figure at the end minus the figure before the start, and you never add the lines up again.',
    mechanism: [
      'Build a table one cell longer than the array, with 0 in the first cell.',
      'Each later cell is the cell before it plus the matching element.',
      'The sum of arr[i..j] is then table[j + 1] - table[i].',
      'The leading 0 is what removes the special case when i is 0.',
    ],
    schematic: `arr   3  1  4  1  5
p   0  3  4  8  9 14
sum arr[1..3] = p4 - p1
              = 9 - 3 = 6
one subtraction, any length`,
    whenToUse:
      'Many range-sum questions over data that is not changing: running totals, 2D image regions, counting with a difference array.',
  },

  'monotonic-stack': {
    analogy:
      'A queue of people of different heights, each waiting to be told who is the first taller person ahead of them. Anyone shorter than the newcomer gets their answer and leaves; the rest keep waiting. Each person joins the queue once and leaves once.',
    mechanism: [
      'Walk the array once, holding a stack of indices that are still unanswered.',
      'While the new element beats the element at the top index, that index has its answer and is popped.',
      'Push the new index, which now waits for its own answer.',
      'Anything left on the stack at the end has no answer at all.',
    ],
    schematic: `arr  2  1  2  4  3
i=3 (4) pops 2,1,2
stack holds indices, not
values -> so the answer can
be written into the right cell`,
    whenToUse:
      'Next or previous greater and smaller element, largest rectangle in a histogram, stock spans, any "first one that beats me" question.',
  },

  'divide-and-conquer': {
    analogy:
      'Counting a crowd by splitting the room down the middle, having someone count each half, and adding the two numbers - except that some groups straddle the line, so whoever adds up the halves has to count those separately or they are missed entirely.',
    mechanism: [
      'Split the problem in half and solve each half the same way.',
      'A single element is the base case: it cannot be split further.',
      'Combine the two answers, including any case that belongs to neither half.',
      'The splitting gives log n levels, and each level does O(n) work.',
    ],
    schematic: `      [0..5]
    /        \
 [0..2]    [3..5]
best = max(left, right,
           crossing)
forget crossing -> wrong`,
    whenToUse:
      'Sorting, maximum subarray, closest pair of points, counting inversions, multiplying large numbers - anything whose answer for a whole is buildable from its halves.',
  },

  greedy: {
    analogy:
      'Booking one meeting room by always accepting the meeting that finishes soonest. It feels like it should fail, and the reason it does not is that finishing early leaves the most room for everything after it. Accepting the shortest meeting first, which feels just as sensible, does fail.',
    mechanism: [
      'Sort the options by the quantity the rule cares about.',
      'Walk the sorted list and take anything still compatible with what is taken.',
      'Never reconsider a decision, which is what keeps it to one pass.',
      'The method is only correct when the rule itself is provably safe.',
    ],
    schematic: `by finish time:
take A 1-4, D 5-7, G 8-11
-> 3 meetings
by start time instead:
take C 0-6, F 6-10
-> only 2`,
    whenToUse:
      'Activity selection, Huffman coding, minimum spanning trees, coin systems that are canonical. Never without an argument that the local choice is safe.',
  },

  'dp-1d': {
    analogy:
      'Walking a row of stalls, writing on each one the best total you could have carrying from here backwards. Every stall only needs the note on the stall before it, so one walk down the row answers a question that looks like it needs every possible stretch.',
    mechanism: [
      'Define the subproblem so the answer at i depends only on earlier answers.',
      'Write the base case down: the first cell has nothing to extend.',
      'Fill each cell from the recurrence, in an order that respects it.',
      'The answer is in the table, usually the best or the last cell.',
    ],
    schematic: `arr -2  1 -3  4 -1  2
best -2  1 -2  4  3  5
best[i] = max(arr[i],
          best[i-1]+arr[i])
answer = max(best) = 6`,
    whenToUse:
      'Maximum subarray, climbing stairs, house robber, coin change, longest increasing subsequence - any problem whose state is one index.',
  },

  'dp-2d': {
    analogy:
      'A grid where each square asks "what did it cost to get this far?", and the answer is always one step better than its neighbour above, to the left, or diagonally back. Fill the grid row by row and the bottom-right corner is the answer to the whole question.',
    mechanism: [
      'Index the table by the two things the problem varies: here, how much of each word is used.',
      'The edges are the base cases: turning a prefix into nothing, or building one from nothing.',
      'Matching characters cost nothing and read straight from the diagonal.',
      'Differing characters cost one edit plus the cheapest of three neighbours.',
    ],
    schematic: `      ''  s  i  t
  ''   0  1  2  3
  k    1  1  2  3
  i    2  2  1  2
up=delete left=insert
diagonal=substitute`,
    whenToUse:
      'Edit distance, longest common subsequence, knapsack, grid paths with obstacles - any problem whose state needs two indices.',
  },

  backtracking: {
    analogy:
      'Searching a hedge maze by walking every branch, but turning back the moment you can see the path is walled off rather than following it to the end. The maze is unchanged; what changes is how much of it you ever walk.',
    mechanism: [
      'Build a candidate one decision at a time, each decision branching the search.',
      'At each node, test whether this partial candidate can still succeed.',
      'If it cannot, abandon the whole subtree below it without building it.',
      'Undo the last decision and carry on with the next branch.',
    ],
    schematic: `target 7, from {3,4,5,2}
       {}
   +3      skip 3
 {3}        {}
 +4 -> 7 found
 +5 -> 12 > 7 pruned`,
    whenToUse:
      'Subset sum, N-Queens, sudoku, permutations with constraints, graph colouring - problems with no better method than search, where pruning is what makes search finish.',
  },

  'two-pointer': {
    analogy:
      'Two people walking a sorted row of numbers from opposite ends towards each other. Their sum tells each of them which one should take the next step, so neither ever needs to backtrack.',
    mechanism: [
      'Place one index at the start and one at the end of a sorted array.',
      'Evaluate the pair; if the result is too small, move the left index right.',
      'If it is too large, move the right index left.',
      'Each index only ever moves one way, so together they cross the array once.',
    ],
    schematic: `sorted, target 10
[1][3][5][7][9]
 lo           hi
1 + 9 = 10  -> found
too small? lo++  big? hi--`,
    whenToUse:
      'Pair sums, de-duplicating a sorted array, reversing in place, merging two sorted inputs.',
  },

  'sliding-window-fixed': {
    analogy:
      'A window frame of fixed width dragged along a row of numbers. Rather than re-adding everything inside the frame each time it moves, you subtract the number that left and add the one that entered.',
    mechanism: [
      'Compute the result for the first window of the required width.',
      'Slide the window one place: subtract the element leaving, add the one entering.',
      'Record the best result seen as the window moves along.',
      'Each element is added once and removed once, so the whole pass is linear.',
    ],
    schematic: `k = 3, sum of each window
[2 1 5 1 3]
[2 1 5]1 3   sum 8
2[1 5 1]3    sum 7 (-2 +1)
2 1[5 1 3]   sum 9 (-1 +3)`,
    whenToUse:
      'Any running statistic over a fixed span: moving averages, maximum sum of k items, rate limits.',
  },

  'sliding-window-variable': {
    analogy:
      'A concertina window that stretches while a rule still holds and squeezes shut from the left the moment it breaks. The widest it ever managed to open is the answer.',
    mechanism: [
      'Extend the right edge, taking in one more element at a time.',
      'While the window breaks the condition, pull the left edge inwards.',
      'Record the best valid window seen after each adjustment.',
      'Both edges only move forwards, which is why this beats checking every range.',
    ],
    schematic: `longest window, sum <= 8
[2 3 1 2 4]
grow right while sum <= 8
shrink left when it breaks
best length seen = answer`,
    whenToUse:
      'Longest or shortest range satisfying a condition: distinct characters, sum limits, at most k of something.',
  },

  // ---------------------------------------------------------------- Module 5
  bst: {
    analogy:
      'A guessing game laid out as signposts. At every junction the signpost tells you to go left for smaller values and right for larger, so a new value walks down until it reaches an empty branch and hangs itself there.',
    mechanism: [
      'Every node keeps all smaller values in its left subtree and all larger in its right.',
      'To insert, start at the root and go left or right by comparison.',
      'When you reach a missing child, that is where the new node goes.',
      'The shape depends entirely on insertion order; sorted input builds a straight line.',
    ],
    schematic: `insert 6: 6 < 8, then 6 > 3
      8
     / \\
    3   10
     \\
      6  <- new node lands`,
    whenToUse:
      'Ordered data you need to search, insert into, and walk in sorted order, all with one structure.',
  },

  'bst-search': {
    analogy:
      'Binary search, but the halving is built into the shape of the thing rather than into arithmetic on indices. Each comparison throws away an entire branch of the tree.',
    mechanism: [
      'Compare the target with the current node, starting at the root.',
      'Smaller means descend left, larger means descend right, equal means found.',
      'Running out of children means the value is not in the tree.',
      'The number of comparisons is the depth you travel, not the number of nodes.',
    ],
    schematic: `find 6
      8     6 < 8  go left
     / \\
    3   10  6 > 3  go right
     \\
      6     found`,
    whenToUse:
      'Lookups in a tree you are also inserting into, where re-sorting an array each time would be wasteful.',
  },

  'bst-delete': {
    analogy:
      'Removing a manager from an org chart. If they have nobody under them you just delete the box. If they have one report, that report moves up. If they have two, you promote the most junior person from the right branch, because that is the only one who can sit above both.',
    mechanism: [
      'A leaf is removed outright.',
      'A node with one child is replaced by that child.',
      'A node with two children is replaced by its in-order successor: the smallest value in its right subtree.',
      'That successor is then deleted from where it was, which is always an easier case.',
    ],
    schematic: `delete 3, it has 2 children
      8
     / \\
    3   10
   / \\
  1   6  <- in-order successor
copy 6 up, remove the old 6`,
    whenToUse:
      'Any tree whose contents change, which is almost every real use of a search tree.',
  },

  'tree-inorder': {
    analogy:
      'Reading a bookshelf where each shelf section has a left neighbour and a right neighbour. You finish everything on the left before you read the label in front of you, and only then move right.',
    mechanism: [
      'Visit the entire left subtree first.',
      'Then read the current node.',
      'Then visit the entire right subtree.',
      'On a binary search tree this emits the values in sorted order, which is the point.',
    ],
    schematic: `left, node, right
      8
     / \\
    3   10
   / \\
  1   6
order: 1 3 6 8 10 (sorted)`,
    whenToUse:
      'Reading a search tree out in sorted order, and checking that a tree really is a valid search tree.',
  },

  'tree-preorder': {
    analogy:
      'Describing a filing cabinet to someone over the phone. You name the drawer before you describe anything inside it, so they can rebuild the whole cabinet as you speak.',
    mechanism: [
      'Read the current node first.',
      'Then visit the entire left subtree.',
      'Then visit the entire right subtree.',
      'Because parents come before children, this order can rebuild the exact tree.',
    ],
    schematic: `node, left, right
      8
     / \\
    3   10
   / \\
  1   6
order: 8 3 1 6 10`,
    whenToUse:
      'Copying or serialising a tree, and any job where you must act on a node before its children.',
  },

  'tree-postorder': {
    analogy:
      'Demolishing a building safely. You cannot remove a floor until everything resting on it is gone, so children are always dealt with before their parent.',
    mechanism: [
      'Visit the entire left subtree first.',
      'Then visit the entire right subtree.',
      'Then read the current node, after both children are done.',
      'Children always come before parents, which is what makes safe deletion possible.',
    ],
    schematic: `left, right, node
      8
     / \\
    3   10
   / \\
  1   6
order: 1 6 3 10 8`,
    whenToUse:
      'Freeing a tree, computing directory sizes, and evaluating an expression tree bottom up.',
  },

  'tree-level-order': {
    analogy:
      'Photographing a family tree generation by generation. You line up everyone born in the same generation before moving down to the next, which means keeping a list of who is next in line.',
    mechanism: [
      'Put the root in a queue.',
      'Take the front node, read it, and enqueue its children.',
      'Repeat until the queue is empty; nodes come out in level order.',
      'This is breadth-first search on a tree, so it uses a queue rather than recursion.',
    ],
    schematic: `level by level, via a queue
      8        <- level 0
     / \\
    3   10     <- level 1
   / \\
  1   6        <- level 2
order: 8 3 10 1 6`,
    whenToUse:
      'Printing a tree by depth, finding the shallowest match, or anything measured in levels.',
  },

  'avl-insert': {
    analogy:
      'A bookshelf with a strict librarian who measures both sides after every book you add. The moment one side is two shelves taller than the other, they pivot a section to even it up before letting you continue.',
    mechanism: [
      'Insert exactly as in a plain search tree.',
      'Walk back up the path, updating each node height.',
      'If any node has subtree heights differing by more than one, rotate to fix it.',
      'One insert needs at most two rotations, so the repair is cheap.',
    ],
    schematic: `heights differ by 2, rotate
   3            6
    \\          / \\
     6   ->   3   9
      \\
       9   left-left case`,
    whenToUse:
      'Lookup-heavy workloads where you cannot risk the tree degrading into a list.',
  },

  'avl-delete': {
    analogy:
      'The same strict librarian, but now removing a book can leave a side short rather than tall. One rebalance can leave the shelf above it unbalanced too, so the librarian keeps checking all the way to the top.',
    mechanism: [
      'Delete as in a plain search tree, using the in-order successor for two-child nodes.',
      'Walk back up from the removed position, updating heights.',
      'Rotate wherever the balance factor goes outside minus one to plus one.',
      'Unlike insertion, one rotation can unbalance the ancestor, so you cannot stop early.',
    ],
    schematic: `delete 1, left side shrinks
    3           6
   / \\         / \\
  1   6  ->   3   9
       \\
        9  rotate at the root`,
    whenToUse:
      'Long-lived balanced trees with mixed inserts and deletes where height must stay bounded.',
  },

  'rb-insert': {
    analogy:
      'A tree where every node wears a red or a black hat, and the rules about hats keep the tree roughly balanced without anyone measuring heights. Fixing a rule break usually means swapping hats, and only sometimes means moving a branch.',
    mechanism: [
      'Insert the new node as red, which cannot break the black-height rule.',
      'A red node under a red parent is the only violation, and it is fixed locally.',
      'If the parent sibling is red, recolour and push the problem up the tree.',
      'If it is black, one or two rotations plus a recolour settle it for good.',
    ],
    schematic: `new node is red
    8(B)        recolour or
   /    \\       rotate when
 3(R)  10(R)   a red sits
 /             under a red
1(R) <- breaks the rule`,
    whenToUse:
      'The standard balanced tree in libraries: fewer rotations than AVL, so it suits write-heavy use.',
  },

  'rb-delete': {
    analogy:
      'Removing a black-hatted node shortens one path, and the hat rules say every path must carry the same number of black hats. The fix is to pass a notional extra black along the tree until somewhere can absorb it.',
    mechanism: [
      'Removing a red node changes nothing, because red nodes do not count toward black height.',
      'Removing a black node leaves a path one black short.',
      'That deficit is passed upward, resolved by recolouring the sibling or by rotating.',
      'It stops at a red node that can be painted black, or at the root, where it simply vanishes.',
    ],
    schematic: `removing black breaks
black-height equality
  path A: 2 blacks
  path B: 1 black   <- short
fix by recolour, rotate,
or absorb at the root`,
    whenToUse:
      'Maps and sets in standard libraries, where deletes must stay bounded without frequent restructuring.',
  },

  'max-heap-insert': {
    analogy:
      'A pyramid where no one may stand above someone stronger than themselves. A newcomer joins at the bottom right and keeps swapping upward past anyone weaker, stopping as soon as the person above is stronger.',
    mechanism: [
      'Place the new value in the next free slot, keeping the tree complete.',
      'Compare it with its parent; if it is larger, swap them.',
      'Keep swapping upward until the parent is larger or you reach the root.',
      'The path to the root is the full travel distance, so very few swaps are needed.',
    ],
    schematic: `add 12 at the last slot
    9            12
   / \\    ->    /  \\
  5   12       5    9
12 > 9, so swap upward`,
    whenToUse:
      'Priority queues: schedulers, event loops, and the frontier in Dijkstra and A star.',
  },

  'max-heap-delete': {
    analogy:
      'The strongest person at the top leaves. Rather than reshuffling everybody, the person from the far bottom right takes the top spot and then swaps downward past whichever child is stronger until nobody beneath them beats them.',
    mechanism: [
      'The root is the maximum, so it is what you return.',
      'Move the last element into the root and shrink the heap by one.',
      'Compare the new root with its larger child and swap if the child is bigger.',
      'Keep sifting down until both children are smaller or you reach a leaf.',
    ],
    schematic: `remove the root, return 9
    9           7           5
   / \\    ->   / \\    ->   / \\
  5   7       5           7
last leaf goes up, sifts down`,
    whenToUse:
      'Taking the next highest-priority item, and as the extraction half of heap sort.',
  },

  'min-heap-insert': {
    analogy:
      'The same pyramid with the rule turned around: nobody may stand above someone weaker. A newcomer joins at the bottom and climbs past anyone larger than themselves.',
    mechanism: [
      'Place the new value in the next free slot of the complete tree.',
      'Swap it with its parent while it is smaller than that parent.',
      'Stop when the parent is smaller or the value reaches the root.',
      'The root therefore always holds the smallest value in the heap.',
    ],
    schematic: `add 2 at the last slot
    3            2
   / \\    ->    / \\
  5   2        5   3
2 < 3, so swap upward`,
    whenToUse:
      'Any shortest-first queue: Dijkstra distances, merging sorted streams, scheduling by deadline.',
  },

  'min-heap-delete': {
    analogy:
      'The smallest item at the top is handed out. The last item takes its place and then sinks past whichever child is smaller, until everything below it is larger.',
    mechanism: [
      'The root is the minimum, so it is what you return.',
      'Move the last element into the root and shrink the heap.',
      'Swap the new root with its smaller child while that child is smaller.',
      'Choosing the smaller of the two children is what preserves the heap rule.',
    ],
    schematic: `remove the root, return 2
    2           5           3
   / \\    ->   / \\    ->   / \\
  3   7       3   7       5   7
last leaf goes up, sifts down`,
    whenToUse:
      'Pulling the cheapest next option repeatedly, which is the core loop of most path-finding.',
  },

  'trie-insert': {
    analogy:
      'A tree of letters where a word is a path rather than a stored string. Words that start the same way walk the same corridor and only branch where they begin to differ, so a shared prefix is stored exactly once.',
    mechanism: [
      'Start at the root and take one character of the word at a time.',
      'If a child for that character exists, walk into it; otherwise create it.',
      'Mark the node reached by the final character as the end of a word.',
      'The work depends on the length of the word, not on how many words are stored.',
    ],
    schematic: `insert "cat", then "car"
 (root)
   c
   a      <- shared prefix
  / \\
 t*  r*   * = end of word`,
    whenToUse:
      'Autocomplete, spell checking, routing tables, and any prefix query over a large dictionary.',
  },

  'trie-search': {
    analogy:
      'Following a corridor letter by letter. If the corridor runs out you know the word is absent, and if you arrive at the end of the word you still have to check whether that spot was ever marked as a real word.',
    mechanism: [
      'Walk one child per character of the query.',
      'A missing child means no stored word has this prefix.',
      'Arriving at the last character is not enough; the node must be marked as a word end.',
      'Stopping without the end mark answers a prefix query rather than a word query.',
    ],
    schematic: `search "car" vs "ca"
   c -> a -> r*
 "car": end mark, found
 "ca" : no mark, prefix only`,
    whenToUse:
      'Distinguishing a stored word from a mere prefix, which is exactly what autocomplete needs.',
  },

  'trie-delete': {
    analogy:
      'Unmarking a word and then tidying up behind you. You can only remove a corridor section if no other word still walks through it, so you clean up from the far end backwards and stop the moment a section is shared.',
    mechanism: [
      'Walk to the final character of the word and clear its end-of-word mark.',
      'Walk back up, removing any node that has no children and no mark of its own.',
      'Stop as soon as a node is still needed by another word.',
      'Removing a shared node would silently delete every word through it.',
    ],
    schematic: `delete "cat", keep "car"
   c -> a -> t*  (unmark)
             \\
              r*  still a word
remove t, keep c and a`,
    whenToUse:
      'Dictionaries that shrink, where leaving dead branches behind would waste memory over time.',
  },

  // ---------------------------------------------------------------- Module 6
  bfs: {
    analogy:
      'Ripples spreading from a stone dropped in a pond. Everything one step away is reached before anything two steps away, so the first time you touch a place is by the shortest route to it.',
    mechanism: [
      'Put the start node in a queue and mark it seen.',
      'Take the front node and enqueue every unseen neighbour, marking each seen.',
      'Marking on enqueue, not on dequeue, is what stops a node being queued twice.',
      'Nodes come out in order of distance, so the first arrival is the shortest path.',
    ],
    schematic: `A -- B -- D
|    |
C -- E
queue: A | B C | D E
levels: A=0  B,C=1  D,E=2`,
    whenToUse:
      'Shortest path when every edge costs the same: social degrees of separation, unweighted grids, puzzles.',
  },

  dfs: {
    analogy:
      'Exploring a cave by always taking the next unexplored passage and only turning back when you hit a dead end. You go deep quickly, but the route you took to a place is rarely the shortest one.',
    mechanism: [
      'From the current node, walk into any unseen neighbour.',
      'Keep going until no unseen neighbour remains, then back up to the last choice.',
      'Recursion does the backing up for you; the explicit version uses a stack.',
      'The order depends on which neighbour you pick first, so paths found are not shortest.',
    ],
    schematic: `A -- B -- D
|    |
C -- E
go deep: A B D, back up,
then E, then C`,
    whenToUse:
      'Cycle detection, topological order, connected components, and any exhaustive search of possibilities.',
  },

  dijkstra: {
    analogy:
      'Planning a drive where roads take different amounts of time. You always confirm the nearest place you have not yet confirmed, because no unconfirmed detour could possibly reach it faster.',
    mechanism: [
      'Keep a tentative distance for every node, starting at zero for the source.',
      'Repeatedly settle the unsettled node with the smallest tentative distance.',
      'Relax its edges: if going through it beats a neighbour current distance, update it.',
      'A settled node is final, which is only true because no edge has a negative weight.',
    ],
    schematic: `weights, none negative
A -4- B -1- D
 \\-2- C -3-/
settle the nearest unsettled
node, then relax its edges`,
    whenToUse:
      'Weighted shortest path in routing, networks, and games: the standard answer when weights are positive.',
  },

  'bellman-ford': {
    analogy:
      'Rumour spreading in a village where you repeat the whole round of gossip as many times as there are people. After that many rounds any true shortest route has had time to travel, and if the story is still changing something is wrong.',
    mechanism: [
      'Relax every edge in the graph, then do it again, a total of one less than the node count.',
      'Each pass lets a shortest path grow by one more edge.',
      'Negative weights are fine, because nothing is declared final early.',
      'If one more pass still improves a distance, a negative cycle exists and there is no answer.',
    ],
    schematic: `relax every edge, V-1 times
pass 1: some distances drop
pass 2: more settle
a drop on pass V means
a negative cycle`,
    whenToUse:
      'Shortest paths with negative weights, and detecting arbitrage or negative cycles outright.',
  },

  'floyd-warshall': {
    analogy:
      'Working out the best route between every pair of towns by allowing one extra town as a permitted stop at a time. After every town has had its turn as a permitted stop, every route in the table is the best possible.',
    mechanism: [
      'Start with a table of direct edge costs, infinite where there is no edge.',
      'For each node k in turn, test every pair i and j.',
      'If going i to k to j beats the current i to j entry, write the better value.',
      'The order matters: k must be the outermost loop, or paths get missed.',
    ],
    schematic: `for each k, every pair i,j
d[i][j] = min(d[i][j],
          d[i][k] + d[k][j])
k is the only allowed stop
all pairs, one table`,
    whenToUse:
      'Small dense graphs where you need every pair at once, and transitive closure or reachability.',
  },

  kruskal: {
    analogy:
      'Laying cable between towns on a budget. You consider every possible stretch from cheapest to dearest and lay it only if the two ends are not already connected somehow, so you never pay for a redundant loop.',
    mechanism: [
      'Sort every edge by weight, cheapest first.',
      'Take each edge in turn and keep it only if its ends are in different components.',
      'Keeping an edge merges those two components into one.',
      'A disjoint-set structure answers the same-component question almost instantly.',
    ],
    schematic: `sort the edges by weight
take the cheapest edge that
joins two separate groups
AB 1 ok | CD 2 ok | AC 3 ok
BD 4 skip, already joined`,
    whenToUse:
      'Minimum spanning tree on sparse graphs, clustering, and network design with an edge list in hand.',
  },

  prim: {
    analogy:
      'Growing a single network outward from one town. At every step you add the cheapest stretch of cable that reaches somewhere not yet connected, so you always have one connected network rather than scattered fragments.',
    mechanism: [
      'Start with one node in the tree and every other node outside it.',
      'Find the cheapest edge with one end inside the tree and one outside.',
      'Add that edge and its outside node to the tree.',
      'Repeat until every node is in; a priority queue makes finding that edge cheap.',
    ],
    schematic: `grow one tree from a seed
in tree: {A}
the cheapest edge leaving
the tree wins, its far
end joins. repeat.`,
    whenToUse:
      'Minimum spanning tree on dense graphs, and whenever you want one connected network at every step.',
  },

  'cycle-detection': {
    analogy:
      'Walking a maze while chalking every junction you pass. Meeting your own chalk is only a loop if that junction is still on the route you are currently walking, rather than one you finished with earlier.',
    mechanism: [
      'Run a depth-first search, marking nodes as you enter them.',
      'In an undirected graph, reaching a marked node that is not your parent is a cycle.',
      'In a directed graph, only an edge back into a node still on the recursion stack counts.',
      'Distinguishing still-on-the-stack from already-finished is the whole trick.',
    ],
    schematic: `undirected: an edge to a
seen node that is not the
parent means a cycle
directed: an edge into a
node still on the stack`,
    whenToUse:
      'Deadlock detection, circular imports and build dependencies, and validating a graph before sorting it.',
  },

  'connected-components': {
    analogy:
      'Colouring in an island map. You pick an uncoloured spot, flood it with one colour until the colour cannot spread further, then pick the next uncoloured spot and use a new colour. The number of colours is the number of islands.',
    mechanism: [
      'Loop over every node in the graph.',
      'If a node is unvisited, start a fresh search from it and label everything reached.',
      'Everything reached in one search is one component.',
      'The outer loop is what finds the parts that no single search can reach.',
    ],
    schematic: `A-B   D-E   F
|/
C
run a search from each
unvisited node: 3 groups`,
    whenToUse:
      'Islands in a grid, friend clusters in a network, and checking whether a graph is connected at all.',
  },

  'topological-sort': {
    analogy:
      'Getting dressed. Socks before shoes, shirt before jacket, but trousers and shirt in either order. Any sequence that never puts an item before something it depends on will do, and there is usually more than one.',
    mechanism: [
      'Count how many prerequisites each node still has waiting.',
      'Repeatedly take any node with none left and place it next in the order.',
      'Removing it reduces the count of everything that depended on it.',
      'If nodes remain but none are free, the graph has a cycle and no valid order exists.',
    ],
    schematic: `shirt -> tie -> jacket
socks -> shoes
take any node with no
remaining prerequisites,
remove it, repeat`,
    whenToUse:
      'Build systems, task scheduling, course prerequisites, and resolving package dependency order.',
  },

  'grid-bfs': {
    analogy:
      'Flooding a room with water from one corner. The water reaches every tile it can at one step before any tile at two steps, so the moment water touches the exit you know the shortest number of tiles.',
    mechanism: [
      'Treat each walkable cell as a node and each neighbouring cell as an edge.',
      'Expand outward from the start in rings using a queue.',
      'Mark a cell the moment it is queued so it is never queued twice.',
      'Because every step costs the same, the first arrival at the goal is the shortest route.',
    ],
    schematic: `S . . #
# # . .
. . . G
expands in rings from S,
the first arrival wins`,
    whenToUse:
      'Fewest-moves problems on a uniform grid: maze solving, flood fill, and reach-within-k-steps queries.',
  },

  'grid-dfs': {
    analogy:
      'Following one corridor of a maze with your hand on the wall. You commit to a direction until it dead-ends, then back up to the last junction. You will find a way out, but not usually the short one.',
    mechanism: [
      'From the current cell, step into any unvisited walkable neighbour.',
      'Continue until the cell has no unvisited neighbours, then back up.',
      'The visited marks are what stop you walking in circles forever.',
      'The path found is a valid route, but it carries no guarantee of being shortest.',
    ],
    schematic: `S . . #
# # . .
. . . G
follows one corridor to its
end before trying another`,
    whenToUse:
      'Reachability, flood filling a region, counting enclosed areas, and generating mazes.',
  },

  'grid-dijkstra': {
    analogy:
      'Crossing terrain where mud costs more than road. You cannot count steps any more, you have to count effort, so you always push forward from whichever tile you can reach most cheaply.',
    mechanism: [
      'Give each cell a cost to enter rather than treating every step as equal.',
      'Keep reached cells in a priority queue ordered by total cost so far.',
      'Always expand the cheapest reached cell, then relax its neighbours.',
      'Because costs vary, the first time you touch a cell is no longer necessarily the cheapest way.',
    ],
    schematic: `cells cost different amounts
S 1 1 9
  1 9 1
  1 1 G
expand the cheapest reached
cell, never the nearest`,
    whenToUse:
      'Weighted terrain in games and robotics, and any grid where moves have different costs.',
  },

  'grid-astar': {
    analogy:
      'Navigating with a compass as well as a milometer. You judge each option by how far you have come plus a sensible guess at how far is left, which stops you wandering away from the goal.',
    mechanism: [
      'Score each cell by the cost to reach it plus an estimate of the cost remaining.',
      'Always expand the cell with the lowest total score.',
      'The estimate must never overstate the remaining cost, or the result can be wrong.',
      'With a zero estimate this becomes Dijkstra; a good estimate explores far fewer cells.',
    ],
    schematic: `cost so far + guess to go
f = g + h
g = cost already paid
h = straight-line estimate
h must never overestimate`,
    whenToUse:
      'Path-finding in games and navigation, where Dijkstra would be correct but far too slow.',
  },

  'maze-generation': {
    analogy:
      'Tunnelling through solid rock rather than building walls. You dig into a random neighbouring cell, keep digging while there is somewhere new to go, and back up to the last junction when you are boxed in.',
    mechanism: [
      'Start from one cell, with every cell walled off from the others.',
      'Pick a random unvisited neighbour and remove the wall between you and it.',
      'Move into that cell and repeat, remembering the route you took.',
      'When no unvisited neighbour remains, back up along that route and try again.',
    ],
    schematic: `carve, do not build walls
pick a random unvisited
neighbour, knock the wall
down, move there
boxed in? back up and retry`,
    whenToUse:
      'Generating a maze with long winding corridors and exactly one route between any two cells.',
  },

  'maze-prim': {
    analogy:
      'Growing a maze outward from a seed like frost on a window. You keep a list of the walls on the edge of what exists so far, pick one at random, and open it if it leads somewhere untouched.',
    mechanism: [
      'Mark one cell as part of the maze and list the walls around it.',
      'Pick a random wall from that list.',
      'Open it only if the cell on the far side is not yet part of the maze.',
      'Add the new cell and its own surrounding walls to the list, then repeat.',
    ],
    schematic: `one cell in, the rest out
pick a random frontier wall
open it if the far side
is still untouched
add its walls to the list`,
    whenToUse:
      'Mazes with many short dead ends and a bushy, open feel rather than long snaking corridors.',
  },

  'maze-kruskal': {
    analogy:
      'A field of separate paddocks with the gates all locked. You shuffle the gates and unlock one at a time, but only if it joins two paddocks that are not already reachable from each other, until the whole field is one connected space.',
    mechanism: [
      'Treat every cell as its own separate region.',
      'Shuffle all the walls between cells into a random order.',
      'Remove a wall only if the cells on either side are in different regions.',
      'Removing it merges those two regions; stop when a single region remains.',
    ],
    schematic: `every cell is its own group
shuffle all of the walls
knock one down only if it
joins two different groups
stop at one group`,
    whenToUse:
      'Mazes with a very even, uniform texture, and as the clearest illustration of disjoint sets at work.',
  },
}

/** Topics with no briefing written yet render the tab's empty state. */
export function theoryFor(slug: string): TopicTheory | null {
  return TOPIC_THEORY[slug] ?? null
}
