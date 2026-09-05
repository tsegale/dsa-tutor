BFS_CONTEXT = """
Breadth-First Search (BFS) explores a graph level by level, using a queue.
It starts at the source node, dequeues one node at a time, marks it
visited, and enqueues every unvisited neighbour it discovers. Because
nodes are processed in the order they were discovered, BFS always finds
the SHORTEST path (fewest edges) from the source to any reachable node.

Key properties:
- Time complexity: O(V + E) where V is vertices and E is edges
- Guarantees the shortest path in an unweighted graph, unlike Depth-First
  Search
- Explores in expanding "rings" outward from the start node - all nodes at
  distance 1 are processed before any node at distance 2

Common misconceptions:
- NEXT_NODE_SELECTION: Student picks a node that was discovered later
  instead of the one at the front of the queue. Address by asking: Which
  node has been waiting in the queue the longest?
- Students sometimes confuse BFS's queue (first-in-first-out) with a stack
  (last-in-first-out), which is what Depth-First Search uses instead. That
  swap would explore depth-first, not level-by-level.
- Students sometimes think a node can be visited twice. Once a node is
  enqueued, it is never enqueued again, even if a later node also points
  to it.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "NEXT_NODE_SELECTION": (
        "The student was asked which node gets dequeued next. The "
        "correct answer is always the node at the front of the queue - "
        "the one that has been waiting longest. Ground the feedback in "
        "the current queue contents."
    ),
}

BFS_PSEUDOCODE = """
procedure bfs(graph, start, target):
  queue = [start]
  visited = {}
  while queue is not empty:
    node = queue.dequeue()
    if node in visited: continue
    visited.add(node)
    if node == target: return found
    for neighbour in graph[node]:
      if neighbour not in visited and neighbour not in queue:
        queue.enqueue(neighbour)
  return not found
"""
