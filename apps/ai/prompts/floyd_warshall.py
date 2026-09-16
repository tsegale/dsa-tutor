FLOYD_WARSHALL_CONTEXT = """
Floyd-Warshall computes the shortest path between every pair of nodes at
once, using dynamic programming instead of running a single-source
algorithm from every node. It maintains a distance matrix dist[i][j] and
considers each node k in turn as a possible "waypoint": if going from i
to k to j is shorter than the current known i-to-j distance, the matrix
is updated.

Key properties:
- Time complexity: O(V^3), which is worse than running Dijkstra from
  every node on a sparse graph, but the implementation is much simpler
  and it correctly handles negative edge weights (though not negative
  cycles)
- After considering all V possible waypoints, dist[i][j] holds the true
  shortest distance between every pair of nodes
- The order in which waypoints k are considered matters for correctness:
  k must be the outermost loop, checked for every (i, j) pair before
  moving to the next k

Common misconceptions:
- MATRIX_UPDATE: Student says the matrix cell should update when the
  route through the waypoint is not actually shorter, or says it should
  stay the same when it is. Ground the feedback in the exact
  dist[i][k] + dist[k][j] vs. dist[i][j] comparison.
- Students sometimes think Floyd-Warshall only finds the shortest path
  from a single source, like Dijkstra or Bellman-Ford; it finds all
  pairs simultaneously.
- Students sometimes forget that an unreachable pair stays at infinity
  unless some waypoint connects them.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "MATRIX_UPDATE": (
        "The student was asked whether dist[i][j] should be updated "
        "through waypoint k. Update only if dist[i][k] + dist[k][j] is "
        "strictly less than the current dist[i][j]. Ground the feedback "
        "in the exact three matrix values being compared."
    ),
}

FLOYD_WARSHALL_PSEUDOCODE = """
procedure floydWarshall(nodes, adjacency):
  dist[i][j] = 0 if i == j, edge weight if one exists, infinity otherwise
  for k in nodes:
    for i in nodes:
      for j in nodes:
        if dist[i][k] + dist[k][j] < dist[i][j]:
          dist[i][j] = dist[i][k] + dist[k][j]
  return dist
"""
