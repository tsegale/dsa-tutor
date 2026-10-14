"""Feynman mechanics rubrics for Modules 1 to 3 (Phase 8C), keyed by topic
slug with underscores. Each item is (criterion for the grader, label shown
to the student). They describe what the topic's own runs teach (the web
engines), so a learner is graded on what they watched. Every topic here
also gets the three complexity criteria from data/complexity.json.

Topics outside Modules 1 to 3 are drafted in feynman_rubric_drafts.py and
are not used until reviewed.
"""

FOUNDATIONS_RUBRICS: dict[str, list[tuple[str, str]]] = {
    "array_access": [
        ("explains that an element's address is computed from the base address plus index times element size", "Computing the address from the index"),
        ("mentions that indices start at 0 and the last valid index is length minus 1", "Indices run from 0 to length - 1"),
        ("explains that an index outside 0 to length - 1 is out of bounds and has no element", "What happens out of bounds"),
    ],
    "array_insert": [
        ("explains that elements from the insertion index onward shift one place right to make room", "Shifting elements right to make room"),
        ("mentions that the shifting starts from the end so no value is overwritten before it is moved", "Shifting from the end first"),
        ("explains that inserting at the end needs no shifting while inserting at the front shifts everything", "Why the position changes the cost"),
    ],
    "array_delete": [
        ("explains that elements after the deleted index shift one place left to close the gap", "Shifting elements left to close the gap"),
        ("mentions that the array's length shrinks by one after the shift", "The length shrinking by one"),
        ("explains that deleting the last element needs no shifting while deleting the first shifts everything", "Why the position changes the cost"),
    ],
    "singly_linked_list": [
        ("explains that each node holds a value and a next pointer to the following node", "Nodes with a value and a next pointer"),
        ("explains that reaching a node means following next pointers from the head, one at a time", "Following next pointers from the head"),
        ("mentions that the last node's next is null, which is how traversal knows to stop", "The tail's next is null"),
        ("explains that appending sets the old tail's next to the new node", "Appending by linking the old tail to the new node"),
    ],
    "doubly_linked_list": [
        ("explains that each node holds both a next and a prev pointer", "Nodes with next and prev pointers"),
        ("explains that a tail pointer gives direct access to the last node without traversal", "Reaching the end directly through the tail"),
        ("explains that inserting at an end changes two pointers: the end node's pointer to the new node and the new node's pointer back", "Two pointers change when inserting at an end"),
        ("mentions that the list can be traversed in either direction", "Traversing in both directions"),
    ],
    "circular_linked_list": [
        ("explains that the last node's next points back to the head instead of null", "The tail links back to the head"),
        ("explains that traversal stops when it returns to the starting node, since there is no null", "Stopping when it wraps back to the start"),
        ("explains that inserting at the tail must keep the new tail pointing back to the head", "Keeping the loop closed on insert"),
    ],
    "stack": [
        ("explains last-in first-out: the most recently pushed item is the first popped", "Last in, first out"),
        ("mentions that push and pop both work at the top only", "Pushing and popping at the top"),
        ("explains overflow (push onto a full stack) and underflow (pop from an empty stack)", "Overflow and underflow"),
    ],
    "queue": [
        ("explains first-in first-out: items leave in the order they arrived", "First in, first out"),
        ("explains that enqueue adds at the rear and dequeue removes from the front", "Adding at the rear, removing from the front"),
        ("mentions what happens when dequeuing from an empty queue", "Dequeuing from an empty queue"),
    ],
    "circular_queue": [
        ("explains that front and rear move forward through a fixed-size array and wrap around with modulo capacity", "Wrapping around with modulo"),
        ("explains that wrapping reuses slots freed by dequeues instead of shifting elements", "Reusing freed slots instead of shifting"),
        ("explains how the queue tells full from empty (a count, or one slot kept free)", "Telling a full queue from an empty one"),
    ],
    "deque": [
        ("explains that items can be added and removed at both the front and the rear", "Adding and removing at both ends"),
        ("explains that this lets a deque act as either a stack or a queue", "Acting as a stack or a queue"),
        ("mentions which end each operation uses and what it returns", "Which end each operation uses"),
    ],
    "hash_table_chaining": [
        ("explains that the hash function, key mod capacity here, maps a key to a bucket index", "Mapping a key to a bucket"),
        ("explains that a collision happens when two keys map to the same bucket", "What a collision is"),
        ("explains that colliding keys join a chain (list) in that bucket, appended at the back here", "Chaining colliding keys in one bucket"),
        ("mentions that lookup hashes to the bucket then scans only that bucket's chain", "Looking up by scanning one chain"),
    ],
    "hash_table_probing": [
        ("explains that the hash function, key mod capacity here, gives the first slot to try", "The first slot from the hash"),
        ("explains that on a collision it probes the next slot, (i + 1) mod capacity, until one is free", "Probing the next slot on a collision"),
        ("explains the load factor (items divided by capacity) and why a high one makes probing slow", "Load factor and clustering"),
        ("mentions that lookup follows the same probe sequence and stops at an empty slot", "Looking up by following the same probes"),
    ],
    "recursion_factorial": [
        ("explains the base case: factorial of 0 or 1 is 1, which stops the recursion", "The base case stops the recursion"),
        ("explains the recursive case: n! = n times (n - 1)!", "Defining n! from (n - 1)!"),
        ("explains that calls stack up until the base case, then return values multiply on the way back", "Calls stacking up, then returning"),
    ],
    "recursion_fibonacci": [
        ("explains the base cases: fib(0) and fib(1)", "The base cases"),
        ("explains the recursive case: fib(n) = fib(n - 1) + fib(n - 2)", "Adding the two previous values"),
        ("explains that the same subproblems are computed many times in the call tree", "Repeating the same subproblems"),
        ("mentions memoisation or iteration as the way to avoid the repeated work", "Avoiding the repeats with memoisation"),
    ],
    "jump_search": [
        ("mentions that the array must be sorted", "Requiring a sorted array"),
        ("explains jumping ahead in blocks of about the square root of n, checking each block's last value", "Jumping in blocks of about √n"),
        ("explains that once a block's last value reaches the target, a linear scan searches that block", "Scanning linearly inside the block"),
    ],
    "interpolation_search": [
        ("mentions that the array must be sorted", "Requiring a sorted array"),
        ("explains estimating the probe position from where the target's value falls between the range's low and high values", "Estimating the position from the values"),
        ("explains narrowing the range to one side of the probe, as binary search does", "Narrowing to one side of the probe"),
        ("mentions that it works best on evenly spread (uniform) values", "Working best on evenly spread values"),
    ],
    "exponential_search": [
        ("mentions that the array must be sorted", "Requiring a sorted array"),
        ("explains doubling the bound (1, 2, 4, 8 and so on) while the value at the bound is below the target", "Doubling the bound to find a range"),
        ("explains running binary search inside the last range, between the previous bound and the current one", "Binary searching inside that range"),
    ],
    "shell_sort": [
        ("explains sorting elements a gap apart, then shrinking the gap", "Sorting elements a gap apart"),
        ("mentions the gap sequence used, halving here, ending at a gap of 1", "Shrinking the gap down to 1"),
        ("explains that the final gap-1 pass is an insertion sort on an almost sorted array", "Finishing with an insertion sort pass"),
    ],
    "heap_sort": [
        ("explains building a max-heap first, so the largest value is at the root", "Building a max-heap"),
        ("explains swapping the root to the end of the array and shrinking the heap by one", "Moving the maximum to the end"),
        ("explains sifting the new root down to restore the heap property", "Sifting down to restore the heap"),
        ("mentions that the heap is stored in the array itself, children of i at 2i + 1 and 2i + 2", "Storing the heap in the array"),
    ],
    "counting_sort": [
        ("explains counting how many times each value occurs", "Counting each value"),
        ("explains turning the counts into prefix sums that give each value's final position", "Prefix sums give positions"),
        ("explains placing elements into the output by those positions, keeping equal values in order (stable)", "Placing elements stably"),
        ("mentions that it does not compare elements and needs a known range of values", "No comparisons, but a known range"),
    ],
    "radix_sort": [
        ("explains sorting digit by digit, starting from the least significant digit", "Sorting digit by digit from the last"),
        ("explains that each pass puts numbers into buckets by the current digit", "Bucketing by the current digit"),
        ("explains that each pass must be stable so earlier digit orderings are kept", "Each pass must be stable"),
    ],
}

# Complexity facts the Phase 8C topics add to data/complexity.json are kept
# there, the one source; see apps/ai/tests/test_registry_coverage.py.
