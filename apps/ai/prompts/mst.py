MST_CONTEXT = """
A Minimum Spanning Tree (MST) connects every node in a weighted,
undirected graph using the smallest possible total edge weight, with no
cycles. Kruskal's Algorithm and Prim's Algorithm both build an MST but
take different approaches.

Kruskal's Algorithm sorts every edge by weight ascending, then walks the
sorted list adding an edge if and only if its two endpoints are not
already connected (using a Union-Find / Disjoint Set structure with path
compression to check this in near-constant time). An edge whose
endpoints are already in the same component would create a cycle, so it
is skipped.

Prim's Algorithm grows a single tree from a start node, at each step
adding the cheapest edge that connects a node already in the tree to a
node outside it.

Key properties:
- Time complexity: Kruskal is O(E log E) dominated by the sort; Prim is
  O(E log V) with a priority queue
- Both are greedy algorithms: they never reconsider a choice, and both
  are provably guaranteed to produce an optimal (minimum-weight) tree
- Both assume undirected edges - MST is not defined the same way for
  directed graphs
- A spanning tree over V nodes always has exactly V - 1 edges

Common misconceptions:
- UNION_FIND_CHECK: Student says an edge should be added when its
  endpoints are already in the same component (this would create a
  cycle), or says it should be skipped when the endpoints are in
  different components. Ground the feedback in whether the two
  endpoints are already connected.
- MST_EDGE_SELECT: Student picks a candidate edge that is not the
  cheapest one currently connecting the tree to the outside. Ground the
  feedback in the full list of candidate edges and their weights.
- Students sometimes think Kruskal or Prim must start from a specific
  node; Kruskal does not care about a start node at all, and Prim
  produces a minimum-weight tree of the same total cost regardless of
  which node it starts from.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "UNION_FIND_CHECK": (
        "The student was asked whether an edge should be added to the "
        "MST (Kruskal). Add it only if its two endpoints are currently "
        "in different components; adding an edge between two nodes "
        "already connected would create a cycle. Ground the feedback in "
        "the current component membership of both endpoints."
    ),
    "MST_EDGE_SELECT": (
        "The student was asked which candidate edge to add next (Prim). "
        "The correct answer is always the cheapest edge among those "
        "currently connecting the growing tree to an outside node. "
        "Ground the feedback in the full sorted list of candidate "
        "edges shown."
    ),
}

MST_PSEUDOCODE = """
procedure kruskal(nodes, edges):
  sort edges by weight ascending
  unionFind = new UnionFind(nodes)
  mst = []
  for (u, v, weight) in sorted edges:
    if unionFind.find(u) != unionFind.find(v):
      unionFind.union(u, v)
      mst.add((u, v, weight))
  return mst

procedure prim(nodes, adjacency, start):
  inTree = {start}
  mst = []
  while inTree != nodes:
    (u, v, weight) = cheapest edge with u in inTree, v not in inTree
    inTree.add(v)
    mst.add((u, v, weight))
  return mst
"""
