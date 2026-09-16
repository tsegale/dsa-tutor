MAZE_GENERATION_CONTEXT = """
Maze generation builds a "perfect maze": a spanning tree over a grid of
cells, meaning there is exactly one path between any two cells and no
loops. All three algorithms here work on a double-resolution grid, where
even-indexed rows/columns are cells and odd-indexed rows/columns are the
walls between them, so carving a wall is just flipping the midpoint
between two cells to open.

Recursive backtracking picks a random unvisited neighbour of the current
cell, carves through to it, and recurses, backtracking (like DFS) when a
cell has no unvisited neighbours left.

Randomized Prim's starts from one cell, keeps a frontier list of walls
adjacent to the maze-so-far, and repeatedly carves through a randomly
chosen frontier wall into a new cell, adding that cell's own walls to
the frontier.

Randomized Kruskal's shuffles every wall in the grid and processes them
in that random order, carving through a wall only if the two cells it
separates are not already connected (Union-Find), which guarantees no
loops form.

Key properties:
- All three produce a valid spanning tree over the grid's cells (exactly
  2 * numCells - 1 pixel-grid cells reachable, in the double-resolution
  representation)
- This track has no prediction junctions - it is a Demo/Hands-On-only
  visualization, since maze generation has no single "next step" a
  student is meant to reason about
- A generated maze can be handed to Grid A* to find the shortest path
  between two points

There is no CRITICAL_JUNCTION_GUIDANCE for this algorithm; it is not a
predicted step.
"""

MAZE_GENERATION_PSEUDOCODE = """
procedure recursiveBacktracking(grid, start):
  stack = [start]
  mark start visited
  while stack is not empty:
    cell = stack.top()
    if cell has an unvisited neighbour:
      neighbour = random unvisited neighbour
      carve wall between cell and neighbour
      mark neighbour visited
      stack.push(neighbour)
    else:
      stack.pop()  // backtrack
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {}
