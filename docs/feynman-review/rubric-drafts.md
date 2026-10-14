# Feynman rubrics for Modules 4 to 6

Mechanics items approved in Phase 8.1 with six edits. A family is graded only once its complexity
facts are written in `apps/ai/data/complexity.json` and approved; it is then marked live here and
in `LIVE_FAMILIES` (`apps/ai/prompts/feynman_rubrics_advanced.py`). The three maze topics stay on the
generic rubric by decision (reason recorded in that file).

Each topic is graded on its mechanics items plus three complexity criteria (time and what drives
it, space against an alternative, clarity), generated from its facts.

## Two pointers and sliding windows

### two-pointer

- **Pointers at both ends of a sorted array**: explains starting one pointer at each end of a sorted array
- **Which pointer moves, and why**: explains the rule for which pointer moves: each step moves the pointer whose element can no longer be part of any answer, so one candidate is discarded per step; in the sorted pair-sum this runs here, the left pointer moves when the sum is too small and the right pointer when it is too large
- **Why sorting makes it safe to discard an end**: explains that the sorted order is what makes discarding one end safe
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### sliding-window-fixed

- **A fixed-size window sliding along**: explains keeping a window of fixed size k that slides one place at a time
- **Updating the sum in O(1) per slide**: explains updating the window sum by adding the entering element and subtracting the leaving one
- **Tracking the best window**: mentions tracking the best window seen so far
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### sliding-window-variable

- **Growing the window from the right**: explains growing the window from the right while it still satisfies the condition
- **Shrinking from the left when it breaks**: explains shrinking it from the left once the condition breaks
- **Each element enters and leaves once**: explains that each element enters and leaves the window at most once
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

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

## Self-balancing trees

### avl-insert

- **Inserting as in a BST first**: explains inserting as in a binary search tree first
- **Balance factor within -1 to 1**: explains the balance factor (left height minus right height) and that it must stay within -1 to 1
- **Choosing the rotation case**: explains choosing among the LL, RR, LR and RL rotations from where the imbalance is
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### avl-delete

- **Deleting as in a BST first**: explains deleting as in a binary search tree first
- **Rechecking balance on the way up**: explains rechecking balance factors on the way back up to the root
- **Possibly rotating at several levels**: explains that a deletion can need rotations at more than one level
- **One rotation for insert, up to log n for delete**: contrasts this with insertion: an insert needs at most one rotation (single or double) to restore balance, while a delete can need rotations at up to O(log n) levels on the way to the root
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### rb-insert

- **New nodes start red**: explains that a new node is inserted red
- **A red-red violation and the uncle**: explains the red-red violation and checking the uncle's colour
- **Recolour or rotate**: explains recolouring when the uncle is red and rotating when it is black
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### rb-delete

- **Deleting, then fixing colours**: explains deleting as in a binary search tree, then fixing colours
- **The double-black problem**: explains the double-black problem when a black node is removed
- **Resolving it from the sibling**: explains resolving it by looking at the sibling's colour and its children
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

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

## Tries

### trie-insert

- **One child per character**: explains following one child per character from the root
- **Creating missing nodes**: explains creating a new node when a character's child does not exist
- **Marking the end of a word**: explains marking the last node as the end of a word
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### trie-search

- **One child per character**: explains following one child per character from the root
- **Failing at a missing character**: explains failing as soon as a character's child is missing
- **Checking the end-of-word mark**: explains that the word is present only if the last node is marked as a word end
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### trie-delete

- **Finding the word's path**: explains finding the word's path character by character
- **Unmarking the word end**: explains unmarking the end-of-word flag
- **Pruning unused nodes**: explains pruning nodes that no other word uses
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

## Shortest paths

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
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### floyd-warshall

- **A matrix of all-pairs distances**: explains the distance matrix between every pair of nodes
- **Trying each node as a stop on the way**: explains trying each node k as an intermediate: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
- **All shortest paths once every k is tried**: explains that after every k is tried, the matrix holds all shortest paths
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

## Minimum spanning trees

### kruskal

- **Cheapest edges first**: explains sorting the edges by weight and considering the cheapest first
- **Skipping edges that form a cycle**: explains skipping an edge whose endpoints are already connected, since it would form a cycle
- **Union-find to track components**: explains using union-find to check and merge components
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### prim

- **Growing from one node**: explains growing the tree from a starting node
- **Adding the cheapest edge out of the tree**: explains always adding the cheapest edge from the tree to a node not yet in it
- **Stopping when all nodes are in**: explains stopping once every node is in the tree
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

## Graph properties

### cycle-detection

- **Tracking the current DFS path**: explains running a depth-first search and tracking the nodes on the current path
- **A back edge means a cycle**: explains that an edge back to a node on the current path (a back edge) means a cycle
- **Back edges versus finished nodes**: contrasts a back edge with an edge to an already finished node
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### connected-components

- **A new search from each unvisited node**: explains starting a new search from each unvisited node
- **One search, one component**: explains that every node one search reaches belongs to the same component
- **Counting the searches**: explains that the number of searches started is the number of components
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### topological-sort

- **Every edge points forward**: explains that it orders a directed acyclic graph so every edge goes from earlier to later
- **Adding a node when it finishes**: explains adding a node to the front of the order once all its descendants are finished in DFS
- **Impossible with a cycle**: mentions that a cycle makes a topological order impossible
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

## Grid pathfinding

### grid-bfs

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Expanding by distance with a queue**: explains expanding cells in order of distance with a queue
- **Shortest path in an unweighted grid**: explains that in an unweighted grid this finds a shortest path
- **Visited cells and walls**: explains marking visited cells and skipping walls
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### grid-dfs

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Going deep, then backtracking**: explains following one direction as far as possible before backtracking
- **A path, not always the shortest**: explains that it finds a path but not necessarily the shortest
- **Visited cells and walls**: explains marking visited cells and skipping walls
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### grid-dijkstra

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Expanding the cheapest cell**: explains expanding the cell with the smallest known cost next
- **Updating neighbours' costs**: explains updating a neighbour's cost when reaching it through this cell is cheaper
- **Handling different cell costs**: explains why this handles cells with different movement costs
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

### grid-astar

- **The grid as a graph: V = rows x cols, E about 4V**: explains that the grid is an implicit graph: each cell's neighbours are computed from its row and column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V
- **Ranking by f = g + h**: explains ranking cells by f = g + h: cost so far plus the estimate to the goal
- **A heuristic that never overestimates**: explains that the heuristic, such as Manhattan distance, must not overestimate
- **Exploring fewer cells than Dijkstra**: explains that the heuristic steers the search toward the goal, so fewer cells are explored
- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).

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
