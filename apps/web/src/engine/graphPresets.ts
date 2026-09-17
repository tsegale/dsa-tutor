import type { AdjacencyList, GraphNode, WeightedAdjacencyList } from '@dsa-tutor/types'

export type GraphPresetName = 'small-7' | 'medium-weighted' | 'grid-like' | 'directed-cycle' | 'two-components'

export interface UnweightedPreset {
  nodes: GraphNode[]
  adjacency: AdjacencyList
  directed: boolean
}

export interface WeightedPreset {
  nodes: GraphNode[]
  adjacency: WeightedAdjacencyList
  directed: boolean
}

/** The original 7-node BFS graph (A-G), positions carried over 1:1 from
 * the old GraphCanvas's fixed NODE_POSITIONS (normalised to 0-1 by
 * dividing by its old 680x480 viewBox), so bfs's migration to
 * NodeGraphCanvas renders in the same layout students already know. */
export const SMALL_7: UnweightedPreset = {
  directed: false,
  nodes: [
    { id: 'A', label: 'A', x: 0.5, y: 0.125 },
    { id: 'B', label: 'B', x: 0.265, y: 0.354 },
    { id: 'C', label: 'C', x: 0.735, y: 0.354 },
    { id: 'D', label: 'D', x: 0.118, y: 0.625 },
    { id: 'E', label: 'E', x: 0.397, y: 0.625 },
    { id: 'F', label: 'F', x: 0.676, y: 0.625 },
    { id: 'G', label: 'G', x: 0.574, y: 0.854 },
  ],
  adjacency: {
    A: ['B', 'C'],
    B: ['A', 'D', 'E'],
    C: ['A', 'F'],
    D: ['B'],
    E: ['B', 'F'],
    F: ['C', 'E', 'G'],
    G: ['F'],
  },
}

/** 8-node weighted directed graph. A->H's shortest path (A-C-D-F-H, cost
 * 16) is not the fewest-hops path (A-B-D-F-H, 4 hops but cost 19) and
 * not the path that looks cheapest node-by-node from A (A-C is only 2,
 * but continuing C-E-G-H costs 2+9+2+7=20) - a good relaxation demo. */
export const MEDIUM_WEIGHTED: WeightedPreset = {
  directed: true,
  nodes: [
    { id: 'A', label: 'A', x: 0.08, y: 0.5 },
    { id: 'B', label: 'B', x: 0.3, y: 0.2 },
    { id: 'C', label: 'C', x: 0.3, y: 0.8 },
    { id: 'D', label: 'D', x: 0.52, y: 0.5 },
    { id: 'E', label: 'E', x: 0.52, y: 0.85 },
    { id: 'F', label: 'F', x: 0.75, y: 0.3 },
    { id: 'G', label: 'G', x: 0.75, y: 0.7 },
    { id: 'H', label: 'H', x: 0.94, y: 0.5 },
  ],
  adjacency: {
    A: [{ to: 'B', weight: 6 }, { to: 'C', weight: 2 }],
    B: [{ to: 'D', weight: 13 }],
    C: [{ to: 'D', weight: 5 }, { to: 'E', weight: 9 }],
    D: [{ to: 'F', weight: 6 }, { to: 'G', weight: 10 }],
    E: [{ to: 'G', weight: 2 }],
    F: [{ to: 'H', weight: 7 }],
    G: [{ to: 'H', weight: 7 }],
    H: [],
  },
}

/** 9-node grid-like mesh (3x3), weighted undirected - MST algorithms
 * have real choices between roughly-comparable edges rather than one
 * obviously-cheapest path. */
export const GRID_LIKE: WeightedPreset = {
  directed: false,
  nodes: [
    { id: 'A', label: 'A', x: 0.15, y: 0.15 },
    { id: 'B', label: 'B', x: 0.5, y: 0.15 },
    { id: 'C', label: 'C', x: 0.85, y: 0.15 },
    { id: 'D', label: 'D', x: 0.15, y: 0.5 },
    { id: 'E', label: 'E', x: 0.5, y: 0.5 },
    { id: 'F', label: 'F', x: 0.85, y: 0.5 },
    { id: 'G', label: 'G', x: 0.15, y: 0.85 },
    { id: 'H', label: 'H', x: 0.5, y: 0.85 },
    { id: 'I', label: 'I', x: 0.85, y: 0.85 },
  ],
  adjacency: {
    A: [{ to: 'B', weight: 4 }, { to: 'D', weight: 8 }],
    B: [{ to: 'A', weight: 4 }, { to: 'C', weight: 7 }, { to: 'E', weight: 3 }],
    C: [{ to: 'B', weight: 7 }, { to: 'F', weight: 5 }],
    D: [{ to: 'A', weight: 8 }, { to: 'E', weight: 2 }, { to: 'G', weight: 6 }],
    E: [{ to: 'B', weight: 3 }, { to: 'D', weight: 2 }, { to: 'F', weight: 9 }, { to: 'H', weight: 4 }],
    F: [{ to: 'C', weight: 5 }, { to: 'E', weight: 9 }, { to: 'I', weight: 3 }],
    G: [{ to: 'D', weight: 6 }, { to: 'H', weight: 5 }],
    H: [{ to: 'E', weight: 4 }, { to: 'G', weight: 5 }, { to: 'I', weight: 8 }],
    I: [{ to: 'F', weight: 3 }, { to: 'H', weight: 8 }],
  },
}

/** 6-node directed graph containing a cycle (D -> E -> F -> D), good for
 * cycle detection; also usable (un-run) for topological sort demos on
 * the acyclic subset A-C by picking a start that avoids the cycle. */
export const DIRECTED_CYCLE: UnweightedPreset = {
  directed: true,
  nodes: [
    { id: 'A', label: 'A', x: 0.15, y: 0.2 },
    { id: 'B', label: 'B', x: 0.5, y: 0.1 },
    { id: 'C', label: 'C', x: 0.85, y: 0.2 },
    { id: 'D', label: 'D', x: 0.2, y: 0.75 },
    { id: 'E', label: 'E', x: 0.5, y: 0.9 },
    { id: 'F', label: 'F', x: 0.8, y: 0.75 },
  ],
  adjacency: {
    A: ['B'],
    B: ['C', 'D'],
    C: ['F'],
    D: ['E'],
    E: ['F', 'D'],
    F: [],
  },
}

/** A DAG (no cycle) variant of the same 6 nodes, for topological-sort's
 * default - the DAG requirement means DIRECTED_CYCLE itself can't be
 * used as-is (its D->E->F->D cycle has no valid topological order). */
export const DIRECTED_ACYCLIC: UnweightedPreset = {
  directed: true,
  nodes: DIRECTED_CYCLE.nodes,
  adjacency: {
    A: ['B'],
    B: ['C', 'D'],
    C: ['F'],
    D: ['E'],
    E: ['F'],
    F: [],
  },
}

/** 8 nodes split into two disjoint undirected components (A-B-C-D and
 * E-F-G-H, no edges between them) - the only preset that actually
 * demonstrates a graph with more than one connected component, since
 * every other preset is built fully reachable for BFS/DFS/MST demos. */
export const TWO_COMPONENTS: UnweightedPreset = {
  directed: false,
  nodes: [
    { id: 'A', label: 'A', x: 0.15, y: 0.25 },
    { id: 'B', label: 'B', x: 0.35, y: 0.1 },
    { id: 'C', label: 'C', x: 0.35, y: 0.4 },
    { id: 'D', label: 'D', x: 0.15, y: 0.6 },
    { id: 'E', label: 'E', x: 0.65, y: 0.25 },
    { id: 'F', label: 'F', x: 0.85, y: 0.1 },
    { id: 'G', label: 'G', x: 0.85, y: 0.4 },
    { id: 'H', label: 'H', x: 0.65, y: 0.6 },
  ],
  adjacency: {
    A: ['B', 'C'],
    B: ['A'],
    C: ['A', 'D'],
    D: ['C'],
    E: ['F', 'G'],
    F: ['E'],
    G: ['E', 'H'],
    H: ['G'],
  },
}

export const GRAPH_PRESETS: Record<GraphPresetName, UnweightedPreset | WeightedPreset> = {
  'small-7': SMALL_7,
  'medium-weighted': MEDIUM_WEIGHTED,
  'grid-like': GRID_LIKE,
  'directed-cycle': DIRECTED_CYCLE,
  'two-components': TWO_COMPONENTS,
}
