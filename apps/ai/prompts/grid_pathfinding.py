GRID_PATHFINDING_CONTEXT = """
Grid pathfinding runs a graph search directly on a 2D grid of cells,
where each cell is a node connected to its up/down/left/right neighbours
(walls block movement). The same four search strategies behave very
differently on a grid:

- Grid BFS explores in expanding rings from the start, guaranteeing the
  shortest path in terms of number of cells, since every step costs 1.
- Grid DFS plunges down one direction until it hits a wall or the edge,
  then backtracks - it finds *a* path, not necessarily the shortest one.
- Grid Dijkstra behaves like BFS on a uniform-cost grid (every move
  costs 1), always expanding the frontier cell with the smallest known
  distance g(n) from the start.
- Grid A* adds a heuristic h(n) (Manhattan distance to the goal) to the
  known cost g(n), and always expands the frontier cell with the
  smallest f(n) = g(n) + h(n). This focuses the search toward the goal,
  so A* typically explores far fewer cells than BFS or Dijkstra while
  still finding a shortest path, as long as the heuristic never
  overestimates the true remaining distance.

Key properties:
- Time complexity: O(rows * cols) for all four on a grid with no
  negative weights
- BFS, Dijkstra, and A* all guarantee the shortest path on a uniform-cost
  grid; DFS does not
- A*'s efficiency advantage comes entirely from the heuristic steering
  the search toward the goal instead of expanding uniformly in every
  direction

Common misconceptions:
- GRID_NEXT_CELL: Student picks a frontier cell that does not have the
  lowest priority score (g(n) for Dijkstra, f(n) = g(n) + h(n) for A*).
  Ground the feedback in the exact scores of the frontier cells shown.
- Students sometimes think A* is "smarter" in some vague sense rather
  than mechanically always expanding the lowest-f(n) cell - the
  heuristic is just another number added into a normal priority-queue
  search.
- Students sometimes expect DFS to find the shortest path on a grid the
  way BFS does; it explores depth-first and can produce a much longer
  path.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "GRID_NEXT_CELL": (
        "The student was asked which frontier cell is expanded next. "
        "For Dijkstra, it is the cell with the smallest g(n) (distance "
        "from start); for A*, it is the cell with the smallest "
        "f(n) = g(n) + h(n). Ground the feedback in the exact scores of "
        "every frontier cell shown."
    ),
}

GRID_PATHFINDING_PSEUDOCODE = """
procedure gridSearch(grid, start, end, strategy):
  frontier = [start]
  visited = {start}
  while frontier is not empty:
    cell = popNext(frontier, strategy)  // FIFO=BFS, LIFO=DFS, min g=Dijkstra, min f=A*
    if cell == end: return reconstructPath(cell)
    for neighbour in orthogonalNeighbours(cell):
      if neighbour not wall and neighbour not in visited:
        visited.add(neighbour)
        neighbour.parent = cell
        frontier.add(neighbour)
  return no path found
"""
