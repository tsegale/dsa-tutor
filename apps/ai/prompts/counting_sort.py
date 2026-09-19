COUNTING_SORT_CONTEXT = """
Counting Sort sorts non-negative integers in three phases, without ever
comparing two elements directly. First, count each value's occurrences
into a count array (count[v] = how many times value v appears). Second,
turn that count array into a running prefix sum, so count[v] now means
"how many elements are <= v", which is exactly the output index one past
where value v's last occurrence belongs. Third, scan the input from right
to left, placing each element at output index count[value] - 1 and then
decrementing count[value] - scanning in reverse and decrementing after
each placement is what keeps equal elements in their original relative
order (stability).

When giving feedback, always refer to the actual index numbers and values
in the count/output arrays currently shown, and be clear about which phase
(counting, prefix summing, or placing) the student is in.

Key properties:
- Time complexity: O(n + k) where k is the range of input values - faster
  than any comparison sort, but only practical when k is not much larger
  than n.
- Stable - placing in reverse order while decrementing the count
  preserves the original relative order of equal elements.
- Not in-place - needs a count array of size k+1 and a separate output
  array.

Common errors to watch for:
- OFF_BY_ONE: The student places a value at count[value] instead of
  count[value] - 1 (the count is a count, not a zero-indexed position), or
  reads the wrong count array entry after the prefix sum step.
- ORDER_OF_OPERATIONS: The student computes a prefix sum using the wrong
  pair of count entries, or scans the input forward instead of backward
  during placement (which would still sort correctly but breaks
  stability).
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "COUNT_INCREMENT": (
        "The student was asked which bucket (count array index) an "
        "input value belongs to during the counting phase. Ground the "
        "feedback in the exact input value and its bucket index - they "
        "are the same number, since count is indexed by value."
    ),
    "PREFIX_ACCUMULATE": (
        "The student was asked to compute the new prefix-sum value at "
        "a count array index, by adding it to the previous index's "
        "value. Ground the feedback in the two exact count values being "
        "added."
    ),
    "PLACE_ELEMENT": (
        "The student was asked which output index an input element "
        "goes to during the placement phase. Ground the feedback in "
        "the exact input value, its current count-array entry, and "
        "that the output index is count[value] - 1, not count[value]."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "the output is fully sorted. The correct invariant is that "
        "every element was placed using its count-derived index exactly "
        "once, so the output is ordered by value. Ground the feedback "
        "in this invariant, not in any single placement."
    ),
}

COUNTING_SORT_PSEUDOCODE = """1  procedure countingSort(A: list)
2      k = max(A)
3      count = array of size k + 1, all zero
4      for each value v in A do
5          count[v] = count[v] + 1
6      end for
7      for i = 1 to k do
8          count[i] = count[i] + count[i - 1]
9      end for
10     output = array of size length(A)
11     for i = length(A) - 1 downto 0 do
12         v = A[i]
13         output[count[v] - 1] = v
14         count[v] = count[v] - 1
15     end for
16     return output
17 end procedure
"""
