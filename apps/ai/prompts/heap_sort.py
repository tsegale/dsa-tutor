HEAP_SORT_CONTEXT = """
Heap Sort works in two phases on a single array. First, it builds a
max-heap in place: every internal node (from the last non-leaf down to the
root) is "heapified" - compared against its larger child and swapped down
if it violates the heap property (a parent must be >= both children),
repeating at the new position until the property holds or a leaf is
reached. Once every internal node has been heapified bottom-up, the whole
array satisfies the max-heap property and the maximum value sits at
index 0.

Second, it repeatedly extracts the maximum: swap the root (index 0) with
the last element still in the unsorted region, shrink that region by one
(the swapped-in value is now in its final sorted position), then sift the
new root down to restore the heap property within the smaller region.
Repeating this until only one element remains leaves the array fully
sorted in place.

When giving feedback, always refer to the actual index numbers and values
currently in the array, and be clear about which phase (heapify or
extract) the student is in.

Key properties:
- Time complexity: O(n log n) in all cases - building the heap is O(n),
  and each of the n extractions costs O(log n) to sift down.
- Not stable - equal elements can be reordered by the heap operations.
- In-place: O(1) extra space, unlike Merge Sort.

Common errors to watch for:
- ORDER_OF_OPERATIONS: The student says a parent should sift down when it
  is already at least as large as both children, or the reverse. Ask them
  to compare the parent against its larger child again.
- STRUCTURAL_PROPERTY_VIOLATION: The student thinks the heap is fully
  sorted and predicts index 1 holds the second-largest value - only the
  parent/child relationship is guaranteed, not the order between siblings
  or across subtrees.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "HEAP_COMPARE": (
        "The student was asked whether a parent node should sift down "
        "past its larger child. Ground the feedback in the exact "
        "parent and child values and indices being compared."
    ),
    "HEAP_EXTRACT": (
        "The student was confirming that the current root is the "
        "maximum about to be extracted into its final sorted position. "
        "Ground the feedback in the root's exact value and how many "
        "elements remain in the unsorted region."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no "
        "adjacent pair is out of order - every element has been "
        "extracted into its final sorted position. Ground the feedback "
        "in this invariant, not in any single comparison."
    ),
}

HEAP_SORT_PSEUDOCODE = """1  procedure heapSort(A: list)
2      n = length(A)
3      for i = floor(n / 2) - 1 downto 0 do
4          heapify(A, n, i)
5      end for
6      for end = n - 1 downto 1 do
7          swap(A[0], A[end])
8          heapify(A, end, 0)
9      end for
10 end procedure
11
12 procedure heapify(A, size, i)
13     largest = i; left = 2i + 1; right = 2i + 2
14     if left < size and A[left] > A[largest] then largest = left
15     if right < size and A[right] > A[largest] then largest = right
16     if largest != i then
17         swap(A[i], A[largest])
18         heapify(A, size, largest)
19     end if
20 end procedure
"""
