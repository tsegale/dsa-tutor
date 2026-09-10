ARRAY_OPERATIONS_CONTEXT = """
Arrays store elements contiguously in memory, indexed from 0. This context
covers three operations: direct access, insertion, and deletion.

Access (arr[i]) is O(1): the memory address is computed directly from the
index, with no traversal needed - the walk-and-highlight animation the
student sees is a teaching device for "here's how the index locates the
value", not a claim that access itself is slow.

Insertion at an arbitrary position is O(n): every element from the
insertion point to the end must shift one slot to the right to make room,
which is the expensive part, not the placement itself. Insertion at the
end is O(1) amortized since nothing needs to shift.

Deletion at an arbitrary position is O(n) for the same reason in reverse:
every element after the deleted index must shift one slot left to close
the gap. Deletion at the end is O(1).

When giving feedback, always refer to the actual index numbers and values
currently in the array. Never give generic explanations.

Common errors to watch for:
- OFF_BY_ONE: The student named the wrong index for where an element ends
  up after a shift - typically off by exactly one position. Ask them to
  trace the shift direction (insert shifts right, delete shifts left) one
  element at a time.
- ORDER_OF_OPERATIONS: The student assumed shifting happens in the wrong
  order - e.g. thinking insertion overwrites the target index before the
  displaced elements have moved out of the way. Insertion must shift from
  the END backward to the insertion point, never from the front forward,
  or elements would overwrite each other.
- COMPLEXITY_MISATTRIBUTION: The student attributes O(n) insert/delete
  cost to the single index operation itself rather than to the shifting
  of every subsequent element. Clarify that the assignment is O(1); the
  loop over the remaining elements is what makes it O(n).
- STRUCTURAL_PROPERTY_VIOLATION: The student named an index outside the
  array's valid range (an index-out-of-bounds scenario). Remind them
  valid indices run from 0 to length-1 inclusive.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "INDEX_ACCESS": (
        "The student was asked which value lives at a specific index. "
        "Ground the feedback in that exact index and the array's current "
        "contents - access is O(1), a single direct lookup."
    ),
    "INSERT_POSITION": (
        "The student was asked which element ends up at a specific index "
        "after an insertion. The concept being tested is that insertion "
        "shifts every element from the insertion point onward one slot "
        "to the right. Ground the feedback in the shift direction, not "
        "just the final answer."
    ),
    "DELETE_SHIFT": (
        "The student was asked which value now occupies a specific index "
        "after a deletion. The concept being tested is that deletion "
        "shifts every element after the deleted index one slot to the "
        "left to close the gap. Ground the feedback in the shift "
        "direction, not just the final answer."
    ),
}

ARRAY_OPERATIONS_PSEUDOCODE = """access(arr, i):
  if i < 0 or i >= arr.length: throw IndexOutOfBounds
  return arr[i]                        // O(1)

insert(arr, value, pos):
  for i from arr.length - 1 downto pos:
    arr[i + 1] = arr[i]                // shift right, from the end backward
  arr[pos] = value                     // O(n) - dominated by the shift

delete(arr, pos):
  for i from pos to arr.length - 2:
    arr[i] = arr[i + 1]                // shift left, from the gap forward
  arr.length -= 1                      // O(n) - dominated by the shift
"""
