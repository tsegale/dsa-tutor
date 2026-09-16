HEAP_CONTEXT = """
A heap is a complete binary tree (every level full except possibly the
last, which fills left to right) stored compactly as a plain array: the
parent of index i lives at floor((i-1)/2), its left child at 2i+1, and
its right child at 2i+2 - no explicit pointers needed.

A max-heap requires every parent to be >= both its children (the
maximum is always at the root); a min-heap requires the opposite
(minimum always at the root). Only that local parent/child ordering is
guaranteed - a heap is NOT fully sorted, and siblings have no required
order relative to each other.

Insert appends the new value as the next leaf (keeping the tree
complete), then "sifts up": repeatedly compares it with its parent and
swaps while it violates the heap property, stopping as soon as it
doesn't (or it reaches the root).

Delete (always removes the root - the only value a heap gives direct
access to) moves the LAST element into the root's position, shrinks the
array by one, then "sifts down": repeatedly compares it with its
children and swaps with whichever child would still leave a heap
violation, stopping as soon as neither child needs swapping (or it
reaches a leaf).

Key properties:
- Height is always O(log n) since the tree is complete.
- Insert and delete are both O(log n): at most one comparison-and-swap
  per level, sifting the full height in the worst case.
- Peeking the max (max-heap) or min (min-heap) is O(1) - just read
  index 0.

Common misconceptions:
- HEAP_SIFT_UP: student swaps when the heap property already holds (or
  vice versa) - ground feedback in the exact two array values compared.
- HEAP_SIFT_DOWN: student picks the wrong child to swap with when BOTH
  children violate the property - the correct child is whichever one is
  MORE extreme (larger for max-heap, smaller for min-heap), not just
  "the first one that violates it" or always the left child.
- Students sometimes think a heap is a sorted array wearing a tree
  costume - only the parent/child relationship is ordered; two sibling
  subtrees can be in either relative order.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "HEAP_SIFT_UP": (
        "The student was asked whether the current node should swap "
        "with its parent. Ground the feedback in the two exact values "
        "compared and the heap type (max vs min)."
    ),
    "HEAP_SIFT_DOWN": (
        "The student was asked which child (if any) the current node "
        "should swap with. Ground the feedback in all three values "
        "compared (node, left child, right child) and which one is most "
        "extreme for this heap type."
    ),
}

HEAP_PSEUDOCODE = """
insert(value):
  append value to end of array (next available leaf)
  sift_up(last_index):
    while parent exists and arr[i] should come before arr[parent]:
      swap arr[i] with arr[parent]; i = parent

delete():
  move last element to the root, shrink the array
  sift_down(0):
    while a child should come before arr[i]:
      swap arr[i] with that child; i = that child
"""
