# Feynman rubrics for Modules 4 to 6

Mechanics items approved in Phase 8.1 with six edits. A family is graded only once its complexity
facts are written in `apps/ai/data/complexity.json` and approved; it is then marked live here and
in `LIVE_FAMILIES` (`apps/ai/prompts/feynman_rubrics_advanced.py`). The three maze topics stay on the
generic rubric by decision (reason recorded in that file).

Each topic is graded on its mechanics items plus three complexity criteria (time and what drives
it, space against an alternative, clarity), generated from its facts.

## Two pointers and sliding windows (live)

### two-pointer

- **Pointers at both ends of a sorted array**: explains starting one pointer at each end of a sorted array
- **Which pointer moves, and why**: explains the rule for which pointer moves: each step moves the pointer whose element can no longer be part of any answer, so one candidate is discarded per step; in the sorted pair-sum this runs here, the left pointer moves when the sum is too small and the right pointer when it is too large
- **Why sorting makes it safe to discard an end**: explains that the sorted order is what makes discarding one end safe
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Each step moves one pointer inward and the loop stops when they meet, so at most n - 1 steps: O(n). The worst case is no pair that works, or the pair found last, which walks the pointers all the way together; a pair found early ends sooner. The scan needs a sorted array: this run sorts a copy of its input first, O(n log n), which dominates when the input arrives unsorted.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1) for the scan: two indices. The sorted copy this run makes first is O(n).), and contrasts it with a relevant alternative such as Hash set, one pass (finds a pair with the target sum in O(n) on unsorted input, but needs O(n) extra space, where two pointers need only O(1) once the array is sorted)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### sliding-window-fixed

- **A fixed-size window sliding along**: explains keeping a window of fixed size k that slides one place at a time
- **Updating the sum in O(1) per slide**: explains updating the window sum by adding the entering element and subtracting the leaving one
- **Tracking the best window**: mentions tracking the best window seen so far
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: The first window sums k elements; each slide after that adds the element entering and subtracts the one leaving, O(1), for n - k slides: O(n) on any input. No input is worse. Recomputing every window from scratch would be O(n × k).
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): the running sum, the best sum so far and two indices.), and contrasts it with a relevant alternative such as Recomputing each window (the simplest code, O(n × k), which is O(n²) when the window size grows with n)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### sliding-window-variable

- **Growing the window from the right**: explains growing the window from the right while it still satisfies the condition
- **Shrinking from the left when it breaks**: explains shrinking it from the left once the condition breaks
- **Each element enters and leaves once**: explains that each element enters and leaves the window at most once
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: The right pointer moves n times and the left pointer at most n times, and neither ever moves back, so the total work is at most 2n moves: O(n), even though a while loop sits inside the for loop. An input that makes the window grow and shrink over and over is the worst case, and it still costs at most 2n moves.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): the running sum, the best length and two indices. It works because the values are non-negative, so adding an element never shrinks the sum and removing one never grows it.), and contrasts it with a relevant alternative such as Checking every subarray (O(n²) with prefix sums (O(n³) without), but it also works with negative values, which the shrinking window cannot handle)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Binary search tree operations (live)

### bst-search

- **Going left or right by comparison**: explains comparing the target with the current node and going left if smaller, right if larger
- **Stopping at a match or an empty child**: explains stopping when the target is found or an empty child is reached
- **Discarding a subtree each step**: explains that the ordering invariant lets each step discard a whole subtree
- **Time complexity and what drives it** (complexity): states the time complexity (worst O(n), average O(log n)) and what drives it, naming the input that produces the worst case and why the average differs: Each comparison moves one level down, so a search costs one root-to-leaf path, O(h). Values inserted in sorted order build a chain, h = n, so the worst case is O(n); a tree built from a random insert order has expected height about 2 ln n, so the average is O(log n).
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1) iteratively; a recursive search holds one stack frame per level, O(h), which is O(n) on a chain.), and contrasts it with a relevant alternative such as Binary Search (a guaranteed O(log n) on a sorted array with no tree at all, but each insert into that array costs O(n) shifting, which a balanced tree avoids)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### bst-delete

- **Removing a leaf directly**: explains removing a leaf directly
- **Promoting the only child**: explains replacing a node that has one child with that child
- **Using the in-order successor for two children**: explains replacing a node that has two children with its in-order successor, then deleting the successor
- **Time complexity and what drives it** (complexity): states the time complexity (worst O(n), average O(log n)) and what drives it, naming the input that produces the worst case and why the average differs: Finding the node walks one root-to-leaf path, O(h); with two children, finding the in-order successor continues down the same subtree, still within O(h). So a delete is O(h): O(log n) on average for a randomly built tree, O(n) on a chain built from sorted values. The case (leaf, one child, two children) changes the constant work, not the bound.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1) iteratively (the node, its parent and the successor); a recursive delete uses O(h) stack frames, O(n) on a chain.), and contrasts it with a relevant alternative such as AVL Delete (the same three cases followed by rebalancing on the way up, so the height, and every delete, stays O(log n) guaranteed)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Tree traversals (live)

### tree-inorder

- **Left, node, right**: explains the order: left subtree, then the node, then the right subtree
- **Sorted order on a BST**: explains that on a binary search tree this visits values in sorted order
- **The stack remembers where to return**: explains that the recursion (or an explicit stack) remembers where to return
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Every node is visited exactly once and each visit does O(1) work, so O(n) on any tree: no shape is worse for time, and the average is the same. Shape only changes the space.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(h) for the recursion (or the explicit stack this run shows), where h is the height: about log n for a balanced tree, but n for a skewed one, such as a BST built from sorted values.), and contrasts it with a relevant alternative such as Morris in-order traversal (O(1) extra space, by temporarily threading right pointers back to ancestors, at the cost of modifying the tree during the walk)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### tree-preorder

- **Node, left, right**: explains the order: the node first, then its left subtree, then its right
- **A use: copying the tree**: mentions a use, such as copying a tree or printing its structure
- **The stack remembers where to return**: explains that the recursion (or an explicit stack) remembers where to return
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Every node is visited exactly once and each visit does O(1) work, so O(n) on any tree: no shape is worse for time, and the average is the same. Shape only changes the space.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(h) for the recursion (or the explicit stack this run shows), where h is the height: about log n for a balanced tree, but n for a skewed one.), and contrasts it with a relevant alternative such as Level Order Traversal (the same O(n) time, but its queue holds a whole level, about n/2 nodes at the bottom of a complete tree, where pre-order holds one root-to-leaf path)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### tree-postorder

- **Left, right, node**: explains the order: left subtree, right subtree, then the node
- **A use: children before the parent**: mentions a use, such as deleting a tree or evaluating an expression tree, where children come first
- **The stack remembers where to return**: explains that the recursion (or an explicit stack) remembers where to return
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Every node is visited exactly once, after both of its subtrees, and each visit does O(1) work, so O(n) on any tree: no shape is worse for time, and the average is the same. Shape only changes the space.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(h) for the recursion (or the explicit stack this run shows), where h is the height: about log n for a balanced tree, but n for a skewed one.), and contrasts it with a relevant alternative such as Level Order Traversal (the same O(n) time, but a queue as wide as the widest level instead of a stack as deep as the tree: less memory on a deep, narrow tree and more on a wide, shallow one)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### tree-level-order

- **Level by level, left to right**: explains visiting nodes level by level, left to right
- **Using a queue of children**: explains using a queue: dequeue a node, visit it, enqueue its children
- **How it differs from depth-first orders**: contrasts it with the depth-first traversals that use a stack
- **Time complexity and what drives it** (complexity): states the time complexity, O(n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Every node is enqueued and dequeued exactly once, O(1) each, so O(n) on any tree: no shape is worse for time, and the average is the same. Shape only changes the space.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(w) for the queue, where w is the widest level: about n/2 leaves at the bottom of a complete tree, so O(n), but only O(1) for a chain.), and contrasts it with a relevant alternative such as Inorder Traversal (the same O(n) time with an O(h) stack instead, small for a wide balanced tree and large for a deep chain: the opposite trade-off)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Self-balancing trees (live)

### avl-insert

- **Inserting as in a BST first**: explains inserting as in a binary search tree first
- **Balance factor within -1 to 1**: explains the balance factor (left height minus right height) and that it must stay within -1 to 1
- **Choosing the rotation case**: explains choosing among the LL, RR, LR and RL rotations from where the imbalance is
- **Time complexity and what drives it** (complexity): states the time complexity, O(log n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Descend one root-to-leaf path, O(h), then walk back up updating heights and balance factors, with at most one rotation (single or double), O(1). The balance rule (sibling subtrees differ in height by at most 1) keeps h below about 1.44 log2 n, so O(log n) is guaranteed: sorted input, which turns a plain BST into an O(n) chain, cannot make an AVL tree tall.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(log n) stack frames for the recursive insert this run shows, guaranteed because the height is O(log n); each node also stores its height, O(n) extra across the tree.), and contrasts it with a relevant alternative such as Binary Search Tree (no rotations and simpler code, but sorted inserts build a chain and every operation degrades to O(n))
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### avl-delete

- **Deleting as in a BST first**: explains deleting as in a binary search tree first
- **Rechecking balance on the way up**: explains rechecking balance factors on the way back up to the root
- **Possibly rotating at several levels**: explains that a deletion can need rotations at more than one level
- **One rotation for insert, up to log n for delete**: contrasts this with insertion: an insert needs at most one rotation (single or double) to restore balance, while a delete can need rotations at up to O(log n) levels on the way to the root
- **Time complexity and what drives it** (complexity): states the time complexity, O(log n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Find and remove the node as in a BST, O(h), then walk back up rebalancing. Unlike insert, a delete can need a rotation at every level on the way up, up to O(log n) rotations of O(1) each. The height stays below about 1.44 log2 n, so the whole delete is O(log n) guaranteed, on any input.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(log n) stack frames for the recursion, guaranteed by the height bound; each node stores its height, O(n) extra across the tree.), and contrasts it with a relevant alternative such as Red-Black Delete (a looser balance rule (height up to 2 log2 n) needs at most three rotations per delete, trading slightly slower searches for cheaper updates)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### rb-insert

- **New nodes start red**: explains that a new node is inserted red
- **A red-red violation and the uncle**: explains the red-red violation and checking the uncle's colour
- **Recolour or rotate**: explains recolouring when the uncle is red and rotating when it is black
- **Time complexity and what drives it** (complexity): states the time complexity, O(log n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Insert as in a BST, O(h), then fix any red-red violation: recolouring can move it up two levels at a time, at most O(log n) times, and at most two rotations end it. The colour rules (no red node has a red child; every root-to-leaf path has the same number of black nodes) keep h at most 2 log2(n + 1), so O(log n) is guaranteed, sorted input included.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(log n) for the path or recursion back up, guaranteed by the height bound; each node stores one colour bit.), and contrasts it with a relevant alternative such as AVL Insert (stricter balance (height about 1.44 log2 n), so faster searches, but more rebalancing work over many updates; red-black trees are what most standard libraries use for ordered maps)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### rb-delete

- **Deleting, then fixing colours**: explains deleting as in a binary search tree, then fixing colours
- **The double-black problem**: explains the double-black problem when a black node is removed
- **Resolving it from the sibling**: explains resolving it by looking at the sibling's colour and its children
- **Time complexity and what drives it** (complexity): states the time complexity, O(log n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Remove as in a BST, O(h), then resolve the double-black: recolouring can push it up the tree O(log n) times, and at most three rotations finish it. With the height at most 2 log2(n + 1), the delete is O(log n) guaranteed, on any input.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(log n) for the path or recursion back up; each node stores one colour bit.), and contrasts it with a relevant alternative such as AVL Delete (can need rotations at O(log n) levels where red-black needs at most three, in exchange for a more strictly balanced tree)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Heaps (live)

### max-heap-insert

- **Adding at the next leaf**: explains adding the new value at the end of the array (the next leaf)
- **Sifting up past smaller parents**: explains sifting up: swapping with the parent while the value is larger
- **Finding the parent in the array**: explains the array layout: the parent of i is at (i - 1) / 2
- **Building a heap bottom-up is O(n), not O(n log n)**: explains that building a heap of n values by n inserts is O(n log n), but bottom-up heapify (sifting down from the last parent back to the root) builds it in O(n), because most nodes sit near the bottom and sift down only a level or two
- **Time complexity and what drives it** (complexity): states the time complexity (worst O(log n), average O(1)) and what drives it, naming the input that produces the worst case and why the average differs: The new value starts at the next leaf and sifts up, at most one swap per level of a complete tree of height floor(log2 n), so O(log n). The worst case is a value larger than everything in the heap, which climbs all the way to the root. On random values most of the tree is near the bottom, so a new value stops after about 1.6 swaps on average: O(1) expected.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): the heap lives in the array, the parent of i is found at (i - 1) / 2, and the sift-up is a loop with no recursion.), and contrasts it with a relevant alternative such as Sorted array (the maximum is always at one end, O(1) to read, but every insert shifts elements, O(n), where the heap only promises O(1) access to the maximum)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### max-heap-delete

- **Moving the last leaf to the root**: explains removing the root, the maximum, and moving the last leaf to the root
- **Sifting down past the larger child**: explains sifting down: swapping with the larger child while it is larger
- **Finding the children in the array**: explains the array layout: the children of i are at 2i + 1 and 2i + 2
- **Time complexity and what drives it** (complexity): states the time complexity, O(log n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Removing the root moves the last leaf to the top, and it sifts down one level per swap, comparing with both children, so O(log n). The worst case and the usual case are the same: the moved leaf is one of the smaller values, so it nearly always sinks most of the way back to the bottom. The average is O(log n) too.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): the heap lives in the array, the children of i are at 2i + 1 and 2i + 2, and the sift-down is a loop with no recursion.), and contrasts it with a relevant alternative such as Unsorted array (O(1) to append a value, but O(n) to find and remove the maximum, where the heap does it in O(log n))
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### min-heap-insert

- **Adding at the next leaf**: explains adding the new value at the end of the array (the next leaf)
- **Sifting up past larger parents**: explains sifting up: swapping with the parent while the value is smaller
- **Finding the parent in the array**: explains the array layout: the parent of i is at (i - 1) / 2
- **Building a heap bottom-up is O(n), not O(n log n)**: explains that building a heap of n values by n inserts is O(n log n), but bottom-up heapify (sifting down from the last parent back to the root) builds it in O(n), because most nodes sit near the bottom and sift down only a level or two
- **Time complexity and what drives it** (complexity): states the time complexity (worst O(log n), average O(1)) and what drives it, naming the input that produces the worst case and why the average differs: The new value starts at the next leaf and sifts up, at most one swap per level of a complete tree of height floor(log2 n), so O(log n). The worst case is a value smaller than everything in the heap, which climbs all the way to the root. On random values most of the tree is near the bottom, so a new value stops after about 1.6 swaps on average: O(1) expected.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): the heap lives in the array, the parent of i is found at (i - 1) / 2, and the sift-up is a loop with no recursion.), and contrasts it with a relevant alternative such as Sorted array (the minimum is always at one end, O(1) to read, but every insert shifts elements, O(n), where the heap only promises O(1) access to the minimum)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### min-heap-delete

- **Moving the last leaf to the root**: explains removing the root, the minimum, and moving the last leaf to the root
- **Sifting down past the smaller child**: explains sifting down: swapping with the smaller child while it is smaller
- **Finding the children in the array**: explains the array layout: the children of i are at 2i + 1 and 2i + 2
- **Time complexity and what drives it** (complexity): states the time complexity, O(log n) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Removing the root moves the last leaf to the top, and it sifts down one level per swap, comparing with both children, so O(log n). The worst case and the usual case are the same: the moved leaf is one of the larger values, so it nearly always sinks most of the way back to the bottom. The average is O(log n) too.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): the heap lives in the array, the children of i are at 2i + 1 and 2i + 2, and the sift-down is a loop with no recursion.), and contrasts it with a relevant alternative such as Unsorted array (O(1) to append a value, but O(n) to find and remove the minimum, where the heap does it in O(log n))
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Tries (live)

### trie-insert

- **One child per character**: explains following one child per character from the root
- **Creating missing nodes**: explains creating a new node when a character's child does not exist
- **Marking the end of a word**: explains marking the last node as the end of a word
- **Time complexity and what drives it** (complexity): states the time complexity, O(m) in both the worst and the average case, and what drives it, naming the input that produces the worst case: One step per character: follow, or create, the child for each of the m characters, each an O(1) lookup in the node's child map, so O(m) however many words the trie already holds. No word list makes it worse: a trie of a million words inserts a five-letter word in the same five steps as an empty one.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1) extra to walk, but up to m new nodes when the word shares no prefix with what is stored. The whole trie holds one node per distinct prefix, up to the total characters inserted, each with its own child map: that memory is the price of the speed.), and contrasts it with a relevant alternative such as Hash Table (Chaining) (also about O(m), to hash the key, with less memory per word, but it cannot answer a prefix query such as every word starting with "ca")
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### trie-search

- **One child per character**: explains following one child per character from the root
- **Failing at a missing character**: explains failing as soon as a character's child is missing
- **Checking the end-of-word mark**: explains that the word is present only if the last node is marked as a word end
- **Time complexity and what drives it** (complexity): states the time complexity, O(m) in both the worst and the average case, and what drives it, naming the input that produces the worst case: One step per character, each an O(1) child lookup, so O(m) for a word of length m, independent of how many words are stored. A search stops as soon as a character's child is missing (in one step if the first letter is absent), so the worst case is a word that is present, or a prefix of one, which takes all m steps.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(1): a pointer to the current node; nothing is copied.), and contrasts it with a relevant alternative such as Binary Search Tree (storing the same words, each of its O(log n) comparisons costs up to O(m) for two strings, so O(m log n), which grows with the number of words where the trie does not)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### trie-delete

- **Finding the word's path**: explains finding the word's path character by character
- **Unmarking the word end**: explains unmarking the end-of-word flag
- **Pruning unused nodes**: explains pruning nodes that no other word uses
- **Time complexity and what drives it** (complexity): states the time complexity, O(m) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Walking the word's path is m steps, unmarking its end is O(1), and pruning walks back along the same path removing nodes no other word uses, at most m more steps: O(m), independent of how many words are stored.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(m): the path of m + 1 nodes is kept so pruning can walk back up it (a recursive delete holds m stack frames instead).), and contrasts it with a relevant alternative such as Hash Table (Chaining) (removes a key in about O(m) to hash it, with nothing to prune, because words share no structure there; a trie must check each node on the path before freeing it)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Shortest paths (live)

### dijkstra

- **Picking the closest unvisited node**: explains repeatedly picking the unvisited node with the smallest known distance
- **Relaxing edges**: explains relaxing each outgoing edge: updating a neighbour if going through this node is shorter
- **Final once picked; no negative weights**: explains that a node's distance is final once it is picked, which needs non-negative weights
- **Time complexity and what drives it** (complexity): states the time complexity, O(V² + E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: This implementation finds the next closest node by scanning every unvisited node, O(V) for each of V steps, and relaxes each edge once: O(V² + E) on any graph. A binary heap makes each extraction and update O(log V), giving O((V + E) log V), which wins on sparse graphs.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for the distance and parent tables and the visited set; a heap version adds up to O(E) heap entries.), and contrasts it with a relevant alternative such as Bellman-Ford (handles negative edge weights, at O(V × E))
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### bellman-ford

- **Relaxing every edge each pass**: explains relaxing every edge in each pass
- **Why V - 1 passes are enough**: explains running V - 1 passes, since a shortest path has at most V - 1 edges
- **Detecting a negative cycle**: explains that a further pass that still improves a distance reveals a negative cycle
- **Time complexity and what drives it** (complexity): states the time complexity, O(V × E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Each pass relaxes every one of the E edges, and up to V - 1 passes are needed because a shortest path uses at most V - 1 edges, so O(V × E). The worst case is a graph with long shortest paths whose edges are listed in an unhelpful order, so each pass extends the correct distances by only one more edge. This run stops early once a pass changes nothing, so a graph that settles after one pass costs only O(E); there is no tighter average, because it depends on the edge order.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for the distance and parent tables; the edge list is the input itself, and there is no recursion.), and contrasts it with a relevant alternative such as Dijkstra's Algorithm (O((V + E) log V) with a binary heap, much faster, but wrong with negative edge weights, which Bellman-Ford handles and can detect as a negative cycle)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### floyd-warshall

- **A matrix of all-pairs distances**: explains the distance matrix between every pair of nodes
- **Trying each node as a stop on the way**: explains trying each node k as an intermediate: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
- **All shortest paths once every k is tried**: explains that after every k is tried, the matrix holds all shortest paths
- **Time complexity and what drives it** (complexity): states the time complexity, O(V³) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Three nested loops: for each of the V possible intermediate nodes k it checks every pair (i, j), V² pairs, so V³ updates whatever the graph. No input is better or worse, and there is no early exit.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V²) for the distance matrix, updated in place, plus another O(V²) if a next-hop matrix is kept to rebuild the paths. No recursion.), and contrasts it with a relevant alternative such as Dijkstra's Algorithm from every source (V runs of O((V + E) log V), about O(V E log V): faster on a sparse graph, but it needs non-negative weights, while Floyd-Warshall is simpler, allows negative edges and wins on a dense graph where E is close to V²)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Minimum spanning trees (live)

### kruskal

- **Cheapest edges first**: explains sorting the edges by weight and considering the cheapest first
- **Skipping edges that form a cycle**: explains skipping an edge whose endpoints are already connected, since it would form a cycle
- **Union-find to track components**: explains using union-find to check and merge components
- **Time complexity and what drives it** (complexity): states the time complexity, O(E log E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Sorting the E edges dominates: O(E log E). Each union-find check afterwards is cheap (this run uses path compression without union by rank, about O(log V) amortised), so O(E log E) on every graph; since E is at most V², log E is at most 2 log V, which makes it O(E log V) as well. No input order is worse; only a denser graph costs more.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for the union-find parent table, plus O(E) for the sorted copy of the edge list; no recursion.), and contrasts it with a relevant alternative such as Prim's Algorithm (grows one tree from a start node and suits a dense graph (O(V²) with a key array), where Kruskal suits a sparse graph given as an edge list)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### prim

- **Growing from one node**: explains growing the tree from a starting node
- **Adding the cheapest edge out of the tree**: explains always adding the cheapest edge from the tree to a node not yet in it
- **Stopping when all nodes are in**: explains stopping once every node is in the tree
- **Time complexity and what drives it** (complexity): states the time complexity, O(V × E log E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: This run rebuilds the list of edges leaving the tree at every step, O(E), and sorts it, O(E log E), once for each of the V nodes it adds: O(V × E log E), written to show the candidates clearly rather than for speed. No input order is worse; only a denser graph is. The standard array version keeps one cheapest-edge key per node outside the tree and is O(V²); with a binary heap it is O(E log V).
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for MST membership and O(E) for the rebuilt candidate list; a heap version holds up to O(E) entries; no recursion.), and contrasts it with a relevant alternative such as Kruskal's Algorithm (O(E log E) with a sort and union-find, better on a sparse graph, where the O(V²) array version of Prim is better on a dense one)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Graph properties (live)

### cycle-detection

- **Tracking the current DFS path**: explains running a depth-first search and tracking the nodes on the current path
- **A back edge means a cycle**: explains that an edge back to a node on the current path (a back edge) means a cycle
- **Back edges versus finished nodes**: contrasts a back edge with an edge to an already finished node
- **Time complexity and what drives it** (complexity): states the time complexity, O(V + E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: A depth-first search visits each vertex once and examines each edge once, O(V + E). It can stop at the first back edge, so a graph with an early cycle finishes sooner; the worst case is a graph with no cycle at all, where every vertex and edge must be checked before it can say so.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for the three colours (unvisited, on the current path, finished), and the recursion can reach depth V along a long path.), and contrasts it with a relevant alternative such as Topological Sort (the same DFS at the same O(V + E), but it records the order nodes finish in, where cycle detection only asks whether an edge points back into the current path; a topological order exists exactly when cycle detection finds nothing)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### connected-components

- **A new search from each unvisited node**: explains starting a new search from each unvisited node
- **One search, one component**: explains that every node one search reaches belongs to the same component
- **Counting the searches**: explains that the number of searches started is the number of components
- **Time complexity and what drives it** (complexity): states the time complexity, O(V + E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: Each vertex is labelled once and each edge examined once, whichever search runs from each unvisited vertex, so O(V + E) on any graph. The number of components changes how many searches start, not the total work.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for the component labels and the queue (a breadth-first search from each new start, as this run uses).), and contrasts it with a relevant alternative such as Union-find (finds the same components from an edge list, in close to O(E) with path compression, and keeps them up to date as edges are added, which a search cannot do without starting again)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### topological-sort

- **Every edge points forward**: explains that it orders a directed acyclic graph so every edge goes from earlier to later
- **Adding a node when it finishes**: explains adding a node to the front of the order once all its descendants are finished in DFS
- **Impossible with a cycle**: mentions that a cycle makes a topological order impossible
- **Time complexity and what drives it** (complexity): states the time complexity, O(V + E) in both the worst and the average case, and what drives it, naming the input that produces the worst case: One depth-first search visits each vertex once and each edge once, and adding a finished node to the front of the order is O(1): O(V + E) on any directed acyclic graph. No input is worse; a denser graph simply has more edges.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(V) for the colours and the output order, and the recursion can reach depth V along a long chain of dependencies.), and contrasts it with a relevant alternative such as Kahn's algorithm (the same O(V + E), with a queue of nodes whose in-degree has reached zero instead of recursion, which also reports a cycle when nodes are left over)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Grid pathfinding (live)

### grid-bfs

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Expanding by distance with a queue**: explains expanding cells in order of distance with a queue
- **Shortest path in an unweighted grid**: explains that in an unweighted grid this finds a shortest path
- **Visited cells and walls**: explains marking visited cells and skipping walls
- **Time complexity and what drives it** (complexity): states the time complexity, O(rows × cols) in both the worst and the average case, and what drives it, naming the input that produces the worst case: The grid is an implicit graph: V = rows × cols cells, each with at most four neighbours computed from its row and column, so E is about 4V. BFS dequeues each cell once and checks its four neighbours, O(V + E) = O(rows × cols). The worst case is a target that cannot be reached, or sits in the far corner, so the whole grid is explored. A nearby target ends it early, but in open space the explored region still grows with the distance to the target, so the average is O(rows × cols) too.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(rows × cols) for the visited marks and the queue, which holds one ring of cells at the same distance from the start.), and contrasts it with a relevant alternative such as Grid DFS (the same O(rows × cols) bound, but its first path is not necessarily the shortest, where BFS's is on an unweighted grid)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### grid-dfs

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Going deep, then backtracking**: explains following one direction as far as possible before backtracking
- **A path, not always the shortest**: explains that it finds a path but not necessarily the shortest
- **Visited cells and walls**: explains marking visited cells and skipping walls
- **Time complexity and what drives it** (complexity): states the time complexity, O(rows × cols) in both the worst and the average case, and what drives it, naming the input that produces the worst case: The grid is an implicit graph: V = rows × cols cells, each with at most four neighbours computed from its row and column, so E is about 4V. DFS visits each cell at most once and checks its four neighbours, O(V + E) = O(rows × cols). The worst case is an unreachable target, or a search that wanders into a large dead-end region first; nothing makes it worse than visiting every cell, and the average is the same bound.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(rows × cols): the visited marks, and a stack (or recursion) that can hold almost every cell along one long winding path.), and contrasts it with a relevant alternative such as Grid BFS (the same cost, with a guaranteed shortest path, where DFS returns the first path it stumbles on)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### grid-dijkstra

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Expanding the cheapest cell**: explains expanding the cell with the smallest known cost next
- **Updating neighbours' costs**: explains updating a neighbour's cost when reaching it through this cell is cheaper
- **Handling different cell costs**: explains why this handles cells with different movement costs
- **Time complexity and what drives it** (complexity): states the time complexity, O((rows × cols)²) in both the worst and the average case, and what drives it, naming the input that produces the worst case: The grid is an implicit graph: V = rows × cols cells, each with at most four neighbours computed from its row and column, so E is about 4V. Each cell is finalised once, and this run picks the next cell by scanning the whole frontier, up to O(V) per step, so O(V²) = O((rows × cols)²); relaxing about 4V edges adds only O(V). The worst case is an unreachable target, which finalises every cell. With a binary heap it would be O(V log V). On this unweighted grid it expands the same cells, in the same order, as BFS.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(rows × cols) for the cost table, the visited marks and the frontier.), and contrasts it with a relevant alternative such as Grid A* (the same structure with each cell ranked by its cost plus a Manhattan estimate to the target, so it usually expands far fewer cells)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

### grid-astar

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Ranking by f = g + h**: explains ranking cells by f = g + h: cost so far plus the estimate to the goal
- **A heuristic that never overestimates**: explains that the heuristic, such as Manhattan distance, must not overestimate
- **Exploring fewer cells than Dijkstra**: explains that the heuristic steers the search toward the goal, so fewer cells are explored
- **Time complexity and what drives it** (complexity): states the time complexity (worst O((rows × cols)²), average O(rows × cols)) and what drives it, naming the input that produces the worst case and why the average differs: The grid is an implicit graph: V = rows × cols cells, each with at most four neighbours computed from its row and column, so E is about 4V. A* is grid Dijkstra with a Manhattan-distance estimate to the target added to each cell's priority. The frontier scan is still up to O(V) per step, so O(V²) = O((rows × cols)²) in the worst case, an unreachable target, where every cell is expanded anyway. When a path exists the heuristic pulls the search toward the target, so in open space it expands roughly the cells near the straight line between them: far fewer than the whole grid on average.
- **Space used, and a comparison** (complexity): accounts for the auxiliary space, including recursion stack frames where they apply (O(rows × cols) for the cost so far (g), the visited marks and the frontier.), and contrasts it with a relevant alternative such as Grid Dijkstra (the same shortest-path guarantee when the heuristic never overestimates, but it expands cells in every direction instead of toward the target)
- **Explained so a junior developer would follow** (complexity): explains the complexity so a junior developer would follow it: each bound comes with the mechanism behind it in plain words; stating notation such as O(n log n) with no reason does not meet this

## Maze generation

### maze-generation

- **Carving with a randomised DFS**: explains carving passages by a randomised depth-first search
- **Backtracking at dead ends**: explains backtracking when a cell has no unvisited neighbours
- **One path between any two cells**: explains that the result is a perfect maze with exactly one path between any two cells
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### maze-prim

- **Growing from a frontier**: explains growing the maze from a start cell, keeping a frontier of walls
- **Opening random frontier walls**: explains picking a random frontier wall and opening it if it leads to an unvisited cell
- **Short, branching passages**: contrasts its short, branching passages with the long corridors of DFS mazes
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### maze-kruskal

- **Cells as sets, walls as edges**: explains treating every cell as its own set and the walls as edges
- **Removing walls that join different sets**: explains removing walls in random order when they join two different sets
- **Union-find prevents loops**: explains using union-find so no loop is ever created
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).
