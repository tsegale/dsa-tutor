BELLMAN_FORD_CONTEXT = """
Bellman-Ford finds the shortest path from a source node to every other
node, and unlike Dijkstra's Algorithm it works correctly even when some
edge weights are negative. It relaxes every edge in the graph, once per
pass, for up to V - 1 passes (V is the number of vertices) - that many
passes are guaranteed to be enough because the longest possible shortest
path uses at most V - 1 edges. If a full extra pass still finds an edge
that can be relaxed, the graph contains a negative-weight cycle and no
finite shortest path exists.

Key properties:
- Time complexity: O(V * E), slower than Dijkstra's O((V + E) log V) but
  tolerant of negative edges
- Runs for at most V - 1 passes; if nothing changes in a pass, the
  algorithm has converged early and can stop
- A negative cycle means distances can be decreased forever, so
  "shortest path" is undefined for nodes reachable through that cycle

Common misconceptions:
- BELLMAN_PASS_COMPLETE: Student says the algorithm should keep going
  when no distance changed in the last pass (it has converged and can
  stop early), or says it is done when a distance did in fact change.
  Ground the feedback in whether any edge was actually relaxed during
  that specific pass.
- Students sometimes think Bellman-Ford always needs exactly V - 1
  passes; it can converge sooner if a pass makes no changes.
- Students sometimes confuse "no negative cycle" with "no negative
  edges" - a graph can have negative edges and still have well-defined
  shortest paths, as long as they don't form a cycle.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "BELLMAN_PASS_COMPLETE": (
        "The student was asked whether the algorithm should continue to "
        "another pass or stop. It should continue only if at least one "
        "distance changed during the pass just completed; if nothing "
        "changed, it has converged and further passes are unnecessary. "
        "Ground the feedback in whether any change occurred in that "
        "specific pass."
    ),
}

BELLMAN_FORD_PSEUDOCODE = """
procedure bellmanFord(graph, start):
  distance[start] = 0, distance[all others] = infinity
  for pass in 1..V-1:
    anyChanged = false
    for (u, v, weight) in all edges:
      if distance[u] + weight < distance[v]:
        distance[v] = distance[u] + weight
        anyChanged = true
    if not anyChanged: break  // converged early
  for (u, v, weight) in all edges:
    if distance[u] + weight < distance[v]:
      return "negative cycle detected"
  return distance
"""
