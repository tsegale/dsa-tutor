GRAPH_PROPERTIES_CONTEXT = """
This track covers three structural properties of a graph, all detected
using a DFS-based traversal.

Cycle detection colours every node WHITE (unvisited), GRAY (currently on
the DFS stack, i.e. an ancestor in the current search path), or BLACK
(fully finished). Encountering an edge to a GRAY node is a "back edge"
and proves a cycle exists, because it means the current path loops back
to one of its own ancestors. An edge to a BLACK node, or to a GRAY node
that is the immediate parent in an undirected graph, is not a cycle.

Connected components counts how many separate DFS/BFS traversals are
needed to reach every node in the graph. Each time the search runs out
of reachable nodes and must restart from a fresh unvisited node, that is
a new component.

Topological sort produces a linear ordering of a Directed Acyclic Graph
(DAG) such that every edge points from an earlier node to a later one.
It is computed by running DFS and prepending each node to the order the
moment it finishes (has no more unexplored descendants) - a node that
finishes later, meaning it depended on more things, ends up earlier in
the final order.

Key properties:
- Cycle detection, connected components, and topological sort are all
  O(V + E)
- Topological sort is only well-defined for a DAG; a graph with a cycle
  has no valid topological order
- A graph can have multiple valid topological orders; the one produced
  depends on tie-breaking order among neighbours

Common misconceptions:
- CYCLE_FOUND: Student says an edge to a GRAY node is not a cycle, or
  says an edge to a BLACK node is a cycle. Only a back edge to a node
  still on the current DFS path (GRAY) proves a cycle.
- NEW_COMPONENT: Student gives a component count that doesn't match how
  many times the search restarted from a fresh unvisited node. Ground
  the feedback in the final total number of components in the graph.
- TOPOLOGICAL_ORDER: Student names a node other than the one that just
  finished (had no more unexplored neighbours). The node prepended to
  the order is always the one finishing DFS at that exact moment.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "CYCLE_FOUND": (
        "The student was asked whether the current edge reveals a "
        "cycle. It does if and only if it is a back edge to a node that "
        "is still GRAY (an ancestor on the current DFS path). Ground "
        "the feedback in whether the destination node is currently an "
        "ancestor."
    ),
    "NEW_COMPONENT": (
        "The student was asked how many connected components the graph "
        "has. Ground the feedback in the true total number of "
        "components, computed by counting how many times the search "
        "had to restart from an unvisited node."
    ),
    "TOPOLOGICAL_ORDER": (
        "The student was asked which node is placed next in the "
        "topological order. It is always the node that just finished "
        "DFS (no unexplored neighbours remain). Ground the feedback in "
        "which node is currently finishing."
    ),
}

GRAPH_PROPERTIES_PSEUDOCODE = """
procedure hasCycle(graph, directed):
  color[all nodes] = WHITE
  for each node:
    if color[node] == WHITE and dfsVisit(node) finds a back edge:
      return true
  return false

procedure dfsVisit(node):
  color[node] = GRAY
  for neighbour in graph[node]:
    if color[neighbour] == GRAY: return "cycle found (back edge)"
    if color[neighbour] == WHITE: dfsVisit(neighbour)
  color[node] = BLACK

procedure countComponents(graph):
  visited = {}
  count = 0
  for each node:
    if node not in visited:
      count += 1
      dfsMarkAll(node, visited)
  return count

procedure topologicalSort(graph):
  visited = {}, order = []
  for each node:
    if node not in visited:
      dfsFinish(node, visited, order)
  return order  // order built by prepending on finish

procedure dfsFinish(node, visited, order):
  visited.add(node)
  for neighbour in graph[node]:
    if neighbour not in visited: dfsFinish(neighbour, visited, order)
  order.prepend(node)  // node finishes here
"""
