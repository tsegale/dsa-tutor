"""Feynman mechanics rubrics for Modules 4 to 6 (Phase 8C, approved in
Phase 8.1 with six edits), by family. A family is graded only once its
complexity facts are written in data/complexity.json and approved: then it
joins LIVE_FAMILIES, rubric_for uses it, and the web offers Feynman mode on
its topics (utils/feynmanRubrics.ts). Families not yet live are never used.
The review sheet is docs/feynman-review/rubric-drafts.md
(scripts/export_rubric_drafts.py).

BST, BFS and DFS already have reviewed rubrics in routers/feynman.py.
"""

# Families whose complexity facts are written and approved (Phase 8.1B).
LIVE_FAMILIES: frozenset[str] = frozenset({"Tree traversals", "Binary search tree operations", "Heaps", "Tries", "Self-balancing trees", "Shortest paths", "Minimum spanning trees", "Graph properties", "Grid pathfinding"})

# Approved to stay on the generic rubric, by decision (see the Maze
# generation family below): never promoted, never given complexity criteria.
GENERIC_BY_DECISION: tuple[str, ...] = ("maze_generation", "maze_prim", "maze_kruskal")

FAMILIES: dict[str, dict[str, list[tuple[str, str]]]] = {
    "Two pointers and sliding windows": {
        "two_pointer": [
            ("explains starting one pointer at each end of a sorted array", "Pointers at both ends of a sorted array"),
            (
                "explains the rule for which pointer moves: each step moves the pointer whose element can no longer be "
                "part of any answer, so one candidate is discarded per step; in the sorted pair-sum this runs here, the "
                "left pointer moves when the sum is too small and the right pointer when it is too large",
                "Which pointer moves, and why",
            ),
            ("explains that the sorted order is what makes discarding one end safe", "Why sorting makes it safe to discard an end"),
        ],
        "sliding_window_fixed": [
            ("explains keeping a window of fixed size k that slides one place at a time", "A fixed-size window sliding along"),
            ("explains updating the window sum by adding the entering element and subtracting the leaving one", "Updating the sum in O(1) per slide"),
            ("mentions tracking the best window seen so far", "Tracking the best window"),
        ],
        "sliding_window_variable": [
            ("explains growing the window from the right while it still satisfies the condition", "Growing the window from the right"),
            ("explains shrinking it from the left once the condition breaks", "Shrinking from the left when it breaks"),
            ("explains that each element enters and leaves the window at most once", "Each element enters and leaves once"),
        ],
    },
    "Binary search tree operations": {
        "bst_search": [
            ("explains comparing the target with the current node and going left if smaller, right if larger", "Going left or right by comparison"),
            ("explains stopping when the target is found or an empty child is reached", "Stopping at a match or an empty child"),
            ("explains that the ordering invariant lets each step discard a whole subtree", "Discarding a subtree each step"),
        ],
        "bst_delete": [
            ("explains removing a leaf directly", "Removing a leaf directly"),
            ("explains replacing a node that has one child with that child", "Promoting the only child"),
            ("explains replacing a node that has two children with its in-order successor, then deleting the successor", "Using the in-order successor for two children"),
        ],
    },
    "Tree traversals": {
        "tree_inorder": [
            ("explains the order: left subtree, then the node, then the right subtree", "Left, node, right"),
            ("explains that on a binary search tree this visits values in sorted order", "Sorted order on a BST"),
            ("explains that the recursion (or an explicit stack) remembers where to return", "The stack remembers where to return"),
        ],
        "tree_preorder": [
            ("explains the order: the node first, then its left subtree, then its right", "Node, left, right"),
            ("mentions a use, such as copying a tree or printing its structure", "A use: copying the tree"),
            ("explains that the recursion (or an explicit stack) remembers where to return", "The stack remembers where to return"),
        ],
        "tree_postorder": [
            ("explains the order: left subtree, right subtree, then the node", "Left, right, node"),
            ("mentions a use, such as deleting a tree or evaluating an expression tree, where children come first", "A use: children before the parent"),
            ("explains that the recursion (or an explicit stack) remembers where to return", "The stack remembers where to return"),
        ],
        "tree_level_order": [
            ("explains visiting nodes level by level, left to right", "Level by level, left to right"),
            ("explains using a queue: dequeue a node, visit it, enqueue its children", "Using a queue of children"),
            ("contrasts it with the depth-first traversals that use a stack", "How it differs from depth-first orders"),
        ],
    },
    "Self-balancing trees": {
        "avl_insert": [
            ("explains inserting as in a binary search tree first", "Inserting as in a BST first"),
            ("explains the balance factor (left height minus right height) and that it must stay within -1 to 1", "Balance factor within -1 to 1"),
            ("explains choosing among the LL, RR, LR and RL rotations from where the imbalance is", "Choosing the rotation case"),
        ],
        "avl_delete": [
            ("explains deleting as in a binary search tree first", "Deleting as in a BST first"),
            ("explains rechecking balance factors on the way back up to the root", "Rechecking balance on the way up"),
            ("explains that a deletion can need rotations at more than one level", "Possibly rotating at several levels"),
            (
                "contrasts this with insertion: an insert needs at most one rotation (single or double) to restore "
                "balance, while a delete can need rotations at up to O(log n) levels on the way to the root",
                "One rotation for insert, up to log n for delete",
            ),
        ],
        "rb_insert": [
            ("explains that a new node is inserted red", "New nodes start red"),
            ("explains the red-red violation and checking the uncle's colour", "A red-red violation and the uncle"),
            ("explains recolouring when the uncle is red and rotating when it is black", "Recolour or rotate"),
        ],
        "rb_delete": [
            ("explains deleting as in a binary search tree, then fixing colours", "Deleting, then fixing colours"),
            ("explains the double-black problem when a black node is removed", "The double-black problem"),
            ("explains resolving it by looking at the sibling's colour and its children", "Resolving it from the sibling"),
        ],
    },
    "Heaps": {
        "max_heap_insert": [
            ("explains adding the new value at the end of the array (the next leaf)", "Adding at the next leaf"),
            ("explains sifting up: swapping with the parent while the value is larger", "Sifting up past smaller parents"),
            ("explains the array layout: the parent of i is at (i - 1) / 2", "Finding the parent in the array"),
            (
                "explains that building a heap of n values by n inserts is O(n log n), but bottom-up heapify "
                "(sifting down from the last parent back to the root) builds it in O(n), because most nodes sit near the "
                "bottom and sift down only a level or two",
                "Building a heap bottom-up is O(n), not O(n log n)",
            ),
        ],
        "max_heap_delete": [
            ("explains removing the root, the maximum, and moving the last leaf to the root", "Moving the last leaf to the root"),
            ("explains sifting down: swapping with the larger child while it is larger", "Sifting down past the larger child"),
            ("explains the array layout: the children of i are at 2i + 1 and 2i + 2", "Finding the children in the array"),
        ],
        "min_heap_insert": [
            ("explains adding the new value at the end of the array (the next leaf)", "Adding at the next leaf"),
            ("explains sifting up: swapping with the parent while the value is smaller", "Sifting up past larger parents"),
            ("explains the array layout: the parent of i is at (i - 1) / 2", "Finding the parent in the array"),
            (
                "explains that building a heap of n values by n inserts is O(n log n), but bottom-up heapify "
                "(sifting down from the last parent back to the root) builds it in O(n), because most nodes sit near the "
                "bottom and sift down only a level or two",
                "Building a heap bottom-up is O(n), not O(n log n)",
            ),
        ],
        "min_heap_delete": [
            ("explains removing the root, the minimum, and moving the last leaf to the root", "Moving the last leaf to the root"),
            ("explains sifting down: swapping with the smaller child while it is smaller", "Sifting down past the smaller child"),
            ("explains the array layout: the children of i are at 2i + 1 and 2i + 2", "Finding the children in the array"),
        ],
    },
    "Tries": {
        "trie_insert": [
            ("explains following one child per character from the root", "One child per character"),
            ("explains creating a new node when a character's child does not exist", "Creating missing nodes"),
            ("explains marking the last node as the end of a word", "Marking the end of a word"),
        ],
        "trie_search": [
            ("explains following one child per character from the root", "One child per character"),
            ("explains failing as soon as a character's child is missing", "Failing at a missing character"),
            ("explains that the word is present only if the last node is marked as a word end", "Checking the end-of-word mark"),
        ],
        "trie_delete": [
            ("explains finding the word's path character by character", "Finding the word's path"),
            ("explains unmarking the end-of-word flag", "Unmarking the word end"),
            ("explains pruning nodes that no other word uses", "Pruning unused nodes"),
        ],
    },
    "Shortest paths": {
        "dijkstra": [
            ("explains repeatedly picking the unvisited node with the smallest known distance", "Picking the closest unvisited node"),
            ("explains relaxing each outgoing edge: updating a neighbour if going through this node is shorter", "Relaxing edges"),
            ("explains that a node's distance is final once it is picked, which needs non-negative weights", "Final once picked; no negative weights"),
        ],
        "bellman_ford": [
            ("explains relaxing every edge in each pass", "Relaxing every edge each pass"),
            ("explains running V - 1 passes, since a shortest path has at most V - 1 edges", "Why V - 1 passes are enough"),
            ("explains that a further pass that still improves a distance reveals a negative cycle", "Detecting a negative cycle"),
        ],
        "floyd_warshall": [
            ("explains the distance matrix between every pair of nodes", "A matrix of all-pairs distances"),
            ("explains trying each node k as an intermediate: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])", "Trying each node as a stop on the way"),
            ("explains that after every k is tried, the matrix holds all shortest paths", "All shortest paths once every k is tried"),
        ],
    },
    "Minimum spanning trees": {
        "kruskal": [
            ("explains sorting the edges by weight and considering the cheapest first", "Cheapest edges first"),
            ("explains skipping an edge whose endpoints are already connected, since it would form a cycle", "Skipping edges that form a cycle"),
            ("explains using union-find to check and merge components", "Union-find to track components"),
        ],
        "prim": [
            ("explains growing the tree from a starting node", "Growing from one node"),
            ("explains always adding the cheapest edge from the tree to a node not yet in it", "Adding the cheapest edge out of the tree"),
            ("explains stopping once every node is in the tree", "Stopping when all nodes are in"),
        ],
    },
    "Graph properties": {
        "cycle_detection": [
            ("explains running a depth-first search and tracking the nodes on the current path", "Tracking the current DFS path"),
            ("explains that an edge back to a node on the current path (a back edge) means a cycle", "A back edge means a cycle"),
            ("contrasts a back edge with an edge to an already finished node", "Back edges versus finished nodes"),
        ],
        "connected_components": [
            ("explains starting a new search from each unvisited node", "A new search from each unvisited node"),
            ("explains that every node one search reaches belongs to the same component", "One search, one component"),
            ("explains that the number of searches started is the number of components", "Counting the searches"),
        ],
        "topological_sort": [
            ("explains that it orders a directed acyclic graph so every edge goes from earlier to later", "Every edge points forward"),
            ("explains adding a node to the front of the order once all its descendants are finished in DFS", "Adding a node when it finishes"),
            ("mentions that a cycle makes a topological order impossible", "Impossible with a cycle"),
        ],
    },
    "Grid pathfinding": {
        "grid_bfs": [
            (
                "explains that the grid is an implicit graph: each cell's neighbours are computed from its row and "
                "column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V",
                "The grid as a graph: V = rows x cols, E about 4V",
            ),
            ("explains expanding cells in order of distance with a queue", "Expanding by distance with a queue"),
            ("explains that in an unweighted grid this finds a shortest path", "Shortest path in an unweighted grid"),
            ("explains marking visited cells and skipping walls", "Visited cells and walls"),
        ],
        "grid_dfs": [
            (
                "explains that the grid is an implicit graph: each cell's neighbours are computed from its row and "
                "column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V",
                "The grid as a graph: V = rows x cols, E about 4V",
            ),
            ("explains following one direction as far as possible before backtracking", "Going deep, then backtracking"),
            ("explains that it finds a path but not necessarily the shortest", "A path, not always the shortest"),
            ("explains marking visited cells and skipping walls", "Visited cells and walls"),
        ],
        "grid_dijkstra": [
            (
                "explains that the grid is an implicit graph: each cell's neighbours are computed from its row and "
                "column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V",
                "The grid as a graph: V = rows x cols, E about 4V",
            ),
            ("explains expanding the cell with the smallest known cost next", "Expanding the cheapest cell"),
            ("explains updating a neighbour's cost when reaching it through this cell is cheaper", "Updating neighbours' costs"),
            ("explains why this handles cells with different movement costs", "Handling different cell costs"),
        ],
        "grid_astar": [
            (
                "explains that the grid is an implicit graph: each cell's neighbours are computed from its row and "
                "column (up, down, left, right) rather than stored, so V = rows x cols and E is about 4V",
                "The grid as a graph: V = rows x cols, E about 4V",
            ),
            ("explains ranking cells by f = g + h: cost so far plus the estimate to the goal", "Ranking by f = g + h"),
            ("explains that the heuristic, such as Manhattan distance, must not overestimate", "A heuristic that never overestimates"),
            ("explains that the heuristic steers the search toward the goal, so fewer cells are explored", "Exploring fewer cells than Dijkstra"),
        ],
    },
    # Maze generation (Phase 8.1A decision): the mechanics items below are
    # approved, but these three topics get no complexity criteria and stay on
    # the generic rubric. Their running time is a by-product of the graph
    # algorithm each one adapts (DFS, Prim, Kruskal), already assessed on
    # those topics, and what a maze topic teaches is the shape of the maze
    # each method produces, not a bound to defend. Not to be promoted.
    "Maze generation": {
        "maze_generation": [
            ("explains carving passages by a randomised depth-first search", "Carving with a randomised DFS"),
            ("explains backtracking when a cell has no unvisited neighbours", "Backtracking at dead ends"),
            ("explains that the result is a perfect maze with exactly one path between any two cells", "One path between any two cells"),
        ],
        "maze_prim": [
            ("explains growing the maze from a start cell, keeping a frontier of walls", "Growing from a frontier"),
            ("explains picking a random frontier wall and opening it if it leads to an unvisited cell", "Opening random frontier walls"),
            ("contrasts its short, branching passages with the long corridors of DFS mazes", "Short, branching passages"),
        ],
        "maze_kruskal": [
            ("explains treating every cell as its own set and the walls as edges", "Cells as sets, walls as edges"),
            ("explains removing walls in random order when they join two different sets", "Removing walls that join different sets"),
            ("explains using union-find so no loop is ever created", "Union-find prevents loops"),
        ],
    },
}


def live_rubrics() -> dict[str, list[tuple[str, str]]]:
    """The mechanics items of every live family, by topic key."""
    return {key: items for family, topics in FAMILIES.items() if family in LIVE_FAMILIES for key, items in topics.items()}
