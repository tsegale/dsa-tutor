SEARCH_ADVANCED_CONTEXT = """
This context covers three search algorithms beyond linear and binary
search, each trading off different assumptions about the data for
different performance characteristics. All three require a sorted array.

Jump Search jumps ahead by fixed blocks of size sqrt(n) instead of
checking every element, then falls back to a linear scan within the
block that must contain the target. It sits between linear (O(n)) and
binary (O(log n)) search at O(sqrt(n)) - useful when jumping back is
expensive (e.g. on some storage media) so binary search's repeated
back-and-forth is costly, but pure linear scanning is too slow.

Interpolation Search estimates where the target likely is using the
value distribution, not just the midpoint: pos = low + ((target -
arr[low]) * (high - low)) / (arr[high] - arr[low]). When values are
roughly uniformly distributed, this converges much faster than binary
search's blind midpoint (O(log log n) average case) - but on
non-uniform data it can degrade toward O(n), since a bad estimate barely
narrows the range.

Exponential Search doubles a search bound (1, 2, 4, 8, ...) until it
finds a range that must contain the target, then binary searches within
just that range. This is ideal for an unbounded or very large sorted
array where you don't know the size in advance, or where the target is
likely near the front - it avoids binary search's need to know the full
array length upfront.

When giving feedback, always refer to the actual indices and values on
screen. Never give generic explanations.

Common errors to watch for:
- COMPLEXITY_MISATTRIBUTION: The student conflates the three algorithms'
  complexities, or claims one is always faster than the others
  regardless of data shape/size.
- OFF_BY_ONE: The student's jump size, probe formula, or doubling bound
  is off by one element.
- ORDER_OF_OPERATIONS: The student applies binary search's midpoint
  logic when interpolation search's formula is what's being tested, or
  vice versa.
- STRUCTURAL_PROPERTY_VIOLATION: The student forgets these algorithms
  require sorted input, or misapplies interpolation search's formula to
  data with all-equal values (a divide-by-zero risk the real algorithm
  must guard against).
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "JUMP_SIZE": (
        "The student was asked for the optimal jump size given the "
        "array length. It is always round(sqrt(n)) - ground the "
        "feedback in the actual array length shown and the arithmetic."
    ),
    "PROBE_POSITION": (
        "The student was asked where interpolation search's formula "
        "places the next probe. Ground the feedback in the exact "
        "low/high/target values and walk through the formula's "
        "arithmetic, contrasting it with binary search's plain "
        "midpoint."
    ),
    "RANGE_DOUBLE": (
        "The student was asked whether exponential search should double "
        "its bound again. Ground the feedback in the value at the "
        "current bound versus the target - doubling continues exactly "
        "as long as that value is still less than the target."
    ),
    "MIDPOINT_DECISION": (
        "In Jump Search this asks whether the current block boundary's "
        "value is at least the target (ending the jump phase and "
        "starting a linear scan); in the embedded binary-search phase "
        "of Exponential Search it is the standard midpoint comparison. "
        "Ground the feedback in which phase the snapshot is in."
    ),
}

SEARCH_ADVANCED_PSEUDOCODE = """// Jump Search - O(sqrt(n))
jumpSize = round(sqrt(n))
step = jumpSize; prev = 0
while arr[min(step, n) - 1] < target:
  prev = step; step += jumpSize
linearSearch(arr, prev, min(step, n) - 1, target)

// Interpolation Search - O(log log n) average on uniform data
while low <= high and target within [arr[low], arr[high]]:
  pos = low + ((target - arr[low]) * (high - low)) / (arr[high] - arr[low])
  if arr[pos] == target: return pos
  elif arr[pos] < target: low = pos + 1
  else: high = pos - 1

// Exponential Search - good for unbounded/large arrays
bound = 1
while bound < n and arr[bound] < target:
  bound *= 2
binarySearch(arr, bound / 2, min(bound, n - 1), target)
"""
