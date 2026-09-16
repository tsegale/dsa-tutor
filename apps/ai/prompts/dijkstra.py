DIJKSTRA_CONTEXT = """
Dijkstra's Algorithm finds the shortest path from a source node to every
other node in a graph with non-negative edge weights. It repeatedly
picks the unvisited node with the smallest known distance, finalizes
that distance, and "relaxes" every outgoing edge: if going through the
just-finalized node gives a shorter path to a neighbour than what is
currently known, the neighbour's distance is updated.

Key properties:
- Time complexity: O(V^2) with a linear scan for the minimum, or
  O((V + E) log V) with a proper priority queue
- Requires non-negative edge weights - a negative edge can invalidate an
  already-finalized shortest distance, which is why Bellman-Ford exists
  for graphs that may have negative weights
- Once a node's distance is finalized (it has been picked as the
  minimum), it never changes again

Common misconceptions:
- EDGE_RELAX: Student says an edge should be relaxed when the new path
  is not actually shorter, or says it should not be relaxed when it is.
  A node with no known distance yet is effectively at infinity, so any
  finite path to it is always an improvement. Ground the feedback in the
  specific current distance vs. the candidate distance through the edge.
- Students sometimes think Dijkstra explores nodes in the order they
  were discovered (BFS-style) rather than in order of smallest known
  distance.
- Students sometimes think relaxing an edge always changes the distance;
  it only changes it when the new candidate is strictly smaller.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "EDGE_RELAX": (
        "The student was asked whether an edge should be relaxed. "
        "Relax only if the distance through the current node is "
        "strictly less than the neighbour's current known distance "
        "(an unvisited neighbour has an effectively infinite current "
        "distance, so it should always be relaxed on first contact). "
        "Ground the feedback in the exact current and candidate "
        "distances shown."
    ),
}

DIJKSTRA_PSEUDOCODE = """
procedure dijkstra(graph, start, target):
  distance[start] = 0, distance[all others] = infinity
  finalized = {}
  while target not in finalized and unfinalized nodes remain:
    u = unfinalized node with smallest distance
    finalized.add(u)
    for (u, v, weight) in edges from u:
      if distance[u] + weight < distance[v]:
        distance[v] = distance[u] + weight
  return distance[target]
"""
