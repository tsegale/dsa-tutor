RADIX_SORT_CONTEXT = """
Radix Sort (LSD - least significant digit first) sorts non-negative
integers by repeatedly bucketing them on one digit at a time, starting
from the ones digit and moving toward the most significant digit. In each
pass: every element is placed into one of 10 buckets (0-9) keyed by its
digit at the current position, then the buckets are collected back into
the array in order 0 through 9. The number of passes equals the digit
count of the largest value.

Processing buckets in order 0 through 9, and never reordering elements
that land in the same bucket, is what keeps each pass stable - and that
stability is exactly why processing least-significant-digit first still
produces a fully sorted array once every digit position has been
processed: each pass refines the ordering established by the previous
(less significant) pass without ever undoing it.

When giving feedback, always refer to the actual element value, its digit
at the current position, and the current pass number - never a generic
"which bucket" without naming the specific digit being extracted.

Key properties:
- Time complexity: O(d * (n + k)) where d is the number of digits and k is
  the base (10 for decimal) - linear in the input size for a fixed number
  of digits.
- Stable - required for correctness, not just a nice property: later
  passes rely on earlier passes' relative ordering being preserved.
- Not in-place - needs 10 buckets to redistribute into each pass.

Common errors to watch for:
- OFF_BY_ONE: The student extracts the wrong digit (e.g. tens instead of
  ones), usually from dividing or taking the modulus with the wrong power
  of 10.
- ORDER_OF_OPERATIONS: The student collects the buckets in the wrong
  order, which would break the sort - buckets must always be collected
  0 through 9.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "DIGIT_BUCKET": (
        "The student was asked which bucket (0-9) an element belongs "
        "in during the current pass, based on its digit at the current "
        "position. Ground the feedback in the exact element value, the "
        "digit position's place value (ones, tens, ...), and the "
        "extracted digit."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that every digit "
        "position, from least to most significant, has been sorted "
        "stably, so no adjacent pair is out of order. Ground the "
        "feedback in this invariant, not in any single bucket "
        "placement."
    ),
}

RADIX_SORT_PSEUDOCODE = """1  procedure radixSortLSD(A: list)
2      maxVal = max(A)
3      digitPosition = 1
4      while digitPosition <= maxVal do
5          buckets = 10 empty lists
6          for each element v in A do
7              digit = floor(v / digitPosition) mod 10
8              append v to buckets[digit]
9          end for
10         A = concatenate buckets[0..9] in order
11         digitPosition = digitPosition * 10
12     end while
13 end procedure
"""
