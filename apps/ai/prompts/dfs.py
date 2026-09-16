DFS_CONTEXT = """
Depth-First Search (DFS) explores a graph by going as deep as possible
along each branch before backtracking, using a stack (either an explicit
one or the call stack via recursion). It marks a node visited the moment
it is discovered, and records a discovery time and a finish time for
every node - the finish time is set once all of that node's descendants
have been fully explored.

Key properties:
- Time complexity: O(V + E) where V is vertices and E is edges
- Does NOT guarantee the shortest path, unlike Breadth-First Search
- Discovery/finish time pairs nest like parentheses: a node's interval
  either fully contains a descendant's interval, or the two intervals do
  not overlap at all (the "parenthesis theorem")
- The next node explored is always the most recently discovered
  unvisited node (top of the stack), not the least recently discovered
  one

Common misconceptions:
- NEXT_NODE_SELECTION: Student picks the node that was discovered first
  (BFS behaviour) instead of the one on top of the stack. Address by
  asking: Which node did we just arrive at, and which of its neighbours
  haven't we explored yet?
- Students sometimes think DFS finishes a node as soon as it is
  discovered. A node only finishes after every reachable descendant has
  also finished.
- Students sometimes forget DFS must restart from a new unvisited node
  to reach a disconnected part of the graph.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "NEXT_NODE_SELECTION": (
        "The student was asked which node gets explored next. The "
        "correct answer is the node on top of the stack (the most "
        "recently discovered unvisited node), not the oldest one. "
        "Ground the feedback in the current stack contents."
    ),
}

DFS_PSEUDOCODE = """
procedure dfs(graph, start):
  stack = [start]
  visited = {}
  time = 0
  while stack is not empty:
    node = stack.top()
    if node not in visited:
      visited.add(node)
      discoveryTime[node] = time++
    advanced = false
    for neighbour in graph[node] (in order):
      if neighbour not in visited:
        stack.push(neighbour)
        advanced = true
        break
    if not advanced:
      finishTime[node] = time++
      stack.pop()
"""
