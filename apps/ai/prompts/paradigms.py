PARADIGMS_CONTEXT = """
These seven topics are the algorithmic paradigms: not data structures, and
not specific algorithms, but the shapes a solution can take. Three of them
(divide and conquer, greedy, 1D dynamic programming) are deliberately
demonstrated on the SAME problem - maximum subarray - so a student can see
that a paradigm is a choice rather than a property of the problem.

Prefix Sums precompute a running total so that any range sum is one
subtraction. The table has n + 1 cells, not n, and the leading zero is the
point: with it, the sum of arr[i..j] is prefix[j + 1] - prefix[i] for every
i including 0, with no special case. Building costs one pass; each query
costs one subtraction regardless of how long the range is. The trade is
O(n) space, and validity only while the array does not change.

Monotonic Stack keeps a stack of INDICES whose answers are still unknown.
When a new element beats the element at the top index, that index has its
answer and is popped; the new index is then pushed to wait for its own.
The inner while loop makes every step look quadratic, and the total is
linear because each index is pushed once and popped at most once - an
amortised argument about the whole run, not about any single step. The
stack holds indices rather than values precisely so the answer can be
written into the right cell.

Divide and Conquer splits a problem in half, solves each half the same
way, and combines. For maximum subarray the combine step is where the
difficulty lives: the best run in the whole range is the best on the left,
the best on the right, or a run that straddles the split and so belongs to
neither half. Omitting that third case gives an algorithm that is wrong
only on the inputs where it matters. Halving gives log n levels and the
crossing scan gives O(n) per level: T(n) = 2T(n/2) + O(n) = O(n log n).

Greedy takes the locally best option and never reconsiders. Activity
selection sorts by FINISH time and accepts anything still compatible; that
rule is provably optimal because finishing earliest leaves the most room
for everything after it. The danger of greedy is not its running time but
that wrong rules are persuasive: sorting by start time, or by duration,
is just as intuitive and gives a smaller answer. Greedy without an
exchange or safety argument is a guess that happens to be fast.

Dynamic Programming (1D) writes each subproblem's answer down once, in an
order where everything it depends on is already written. For maximum
subarray the subproblem is "the best run ENDING at position i", which
depends only on the same quantity at i - 1: extend the previous run, or
start fresh here. That recurrence is Kadane's algorithm, and it answers in
one pass what divide and conquer needs O(n log n) for, because it never
has a crossing case to handle.

Dynamic Programming (2D) is the same idea with two indices, so the table
is a grid. Edit distance's cell [i][j] is the cost of turning the first i
characters of one string into the first j of the other. Equal characters
cost nothing and read from the diagonal; different characters cost one
edit plus the cheapest of three neighbours - above is a deletion, left is
an insertion, diagonal is a substitution. The edges are the base cases: i
deletions, or j insertions. Every cell is filled exactly once, so the cost
is the size of the table whatever the strings are.

Backtracking builds a candidate one decision at a time and abandons a
partial candidate the moment it cannot succeed. For subset sum with
positive elements, the test is that the running total has already passed
the target: nothing below that node can bring it back down, so the whole
subtree is skipped without being built. The state space is still 2^n in
the worst case - pruning changes how much of it is walked, not its size -
and the gap between nodes visited and nodes in the full tree is what makes
the method practical.

When giving feedback, always refer to the actual cells, values, pointers
and partial candidates on screen. Never give generic explanations of what
dynamic programming or greedy "is".

Common errors to watch for:
- OFF_BY_ONE: The student indexes a prefix table as prefix[j] - prefix[i]
  instead of prefix[j + 1] - prefix[i], or forgets that the table is one
  cell longer than the array. In the 2D table they confuse the character
  index (i - 1) with the table index (i).
- ORDER_OF_OPERATIONS: The student fills a dynamic programming cell before
  the cells it depends on, or reconsiders an accepted greedy choice, or
  pushes to the monotonic stack before discharging the elements the new
  one answers.
- COMPLEXITY_MISATTRIBUTION: The student calls the monotonic stack
  quadratic because of its inner loop, or believes memoising the 1D
  recurrence changes it from O(n), or thinks pruning improves
  backtracking's worst case rather than its typical cost.
- STRUCTURAL_PROPERTY_VIOLATION: The student omits divide and conquer's
  crossing case, or prunes a backtracking branch on a condition that is
  not actually safe (which would discard real solutions), or applies a
  greedy rule to a problem where no safety argument holds.
- OVERGENERALIZATION: The student concludes that greedy works whenever it
  is easy to state, or that any problem with a recurrence can be solved
  bottom-up in O(n) space.
"""

PARADIGMS_PSEUDOCODE = """
// Prefix sums - build once, query forever
prefix[0] = 0
for i from 0 to n - 1:
  prefix[i + 1] = prefix[i] + arr[i]
rangeSum(i, j) = prefix[j + 1] - prefix[i]    // one subtraction, any length

// Monotonic stack - next greater element
stack = []                                     // holds INDICES, not values
for i from 0 to n - 1:
  while stack not empty and arr[stack.top] < arr[i]:
    result[stack.pop()] = arr[i]               // that index now has its answer
  stack.push(i)
for each index left on stack: result[index] = -1

// Divide and conquer - maximum subarray
maxSub(lo, hi):
  if lo == hi: return arr[lo]
  mid = (lo + hi) / 2
  left  = maxSub(lo, mid)
  right = maxSub(mid + 1, hi)
  cross = bestEndingAt(mid) + bestStartingAt(mid + 1)   // the case neither half sees
  return max(left, right, cross)

// Greedy - activity selection
sort activities by finish time
lastFinish = -infinity
for each activity in sorted order:
  if activity.start >= lastFinish:             // compatible, so take it
    take(activity); lastFinish = activity.finish
                                               // never reconsidered

// Dynamic programming 1D - maximum subarray (Kadane)
best[0] = arr[0]
for i from 1 to n - 1:
  best[i] = max(arr[i], best[i - 1] + arr[i])  // start fresh, or extend
answer = max(best)

// Dynamic programming 2D - edit distance
for i from 0 to m: d[i][0] = i                 // i deletions
for j from 0 to n: d[0][j] = j                 // j insertions
for i from 1 to m:
  for j from 1 to n:
    if a[i - 1] == b[j - 1]: d[i][j] = d[i - 1][j - 1]
    else: d[i][j] = 1 + min(d[i - 1][j],       // delete
                            d[i][j - 1],       // insert
                            d[i - 1][j - 1])   // substitute
answer = d[m][n]

// Backtracking - subset sum
search(i, chosen, total):
  if total == target: record(chosen); return
  if i == n or total > target: return          // the prune
  search(i + 1, chosen + [arr[i]], total + arr[i])
  search(i + 1, chosen, total)
"""

CRITICAL_JUNCTION_GUIDANCE = {
    "PREFIX_CELL": (
        "Tests whether the student has the accumulation right: this cell is the PREVIOUS cell plus the "
        "matching array element, not a sum computed from scratch. Ground the feedback in the two numbers "
        "being added and the cell they are being written into. If they are off by one, the usual cause is "
        "treating prefix[i] as covering arr[0..i] rather than arr[0..i-1]: the table is one cell longer "
        "than the array, and prefix[i] is the sum of the first i elements, which is why prefix[0] is 0."
    ),
    "RANGE_QUERY": (
        "Tests the point of the whole topic: a range sum is one subtraction between two prefix cells, with "
        "no loop over the range. The two cells are prefix[j + 1] and prefix[i], and the +1 is what makes a "
        "range starting at 0 work without a special case. If the student picks prefix[j] and prefix[i], "
        "name the element that goes missing rather than restating the formula, and if they want to add the "
        "range up, point out that the answer costs the same for 3 elements as for 3,000."
    ),
    "STACK_DISCHARGE": (
        "Tests whether the student sees that the new element answers every waiting index smaller than it, "
        "not just the one on top. Ground the feedback in the actual values: the element at the top index, "
        "the new element, and whether the comparison discharges it. If the student thinks this inner loop "
        "makes the algorithm quadratic, the answer is the amortised count, not a claim about this step: "
        "each index is pushed once and popped at most once, so the run has at most n pushes and n pops "
        "however many a single step performs."
    ),
    "COMBINE_RESULT": (
        "Tests whether the student remembers the crossing case. The answer for this range is the best of "
        "three candidates, and the third - a run straddling the split - is the one that belongs to neither "
        "half and that neither recursive call could have found. Name the three actual numbers on screen. If "
        "the student takes max(left, right), do not just correct it: ask what happens to a run that starts "
        "before the split and ends after it, which is exactly the input that makes the omission visible."
    ),
    "GREEDY_CHOICE": (
        "Tests whether the student applies the rule the sort established: take this activity if it starts at "
        "or after the last accepted finish time. Ground the feedback in the two actual times. The deeper "
        "point to reach for when they are right is WHY finish time is the safe rule - accepting the earliest "
        "finisher leaves the most room for everything after it - and that sorting by start time or by "
        "duration is equally intuitive and gives fewer activities on this very input."
    ),
    "DP_CELL": (
        "Tests whether the student can read the recurrence off the table. Name the cells this one depends on "
        "and what each means: in 1D, the cell before it, so the choice is extend or start fresh; in 2D, "
        "above is a deletion, left is an insertion and the diagonal is a substitution, with a match costing "
        "nothing and reading the diagonal directly. If the student computes a cell from values that are not "
        "yet filled, the problem is fill order, not arithmetic, and that is what to point at."
    ),
    "PRUNE_BRANCH": (
        "Tests whether the student can tell a branch that cannot succeed from one that merely has not yet. "
        "Here the total has already passed the target and every remaining element is positive, so nothing "
        "below this node can come back down to it - the subtree is skipped without being built. Press on "
        "why the test is SAFE: with a negative element in the set the same prune would discard real "
        "solutions, so the pruning condition is a claim about the input, not a general trick."
    ),
}
