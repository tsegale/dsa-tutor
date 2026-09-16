AVL_TREE_CONTEXT = """
An AVL tree is a self-balancing Binary Search Tree: for every node, the
heights of its left and right subtrees differ by at most 1 (its balance
factor = height(left) - height(right) must be -1, 0, or 1). This keeps
the tree's height always O(log n), guaranteeing O(log n) search, insert,
and delete, unlike a plain BST which can degrade to a linked list (O(n))
on adversarial input.

Insertion and deletion both start with a standard BST operation, then
walk back up from that point to the root, recalculating each ancestor's
height and balance factor. The first (insert) or every (delete)
unbalanced ancestor found along that walk is fixed with one of four
rotations, named by the two-step shape of the imbalance:

- LL (left-left): the new node is in the left subtree of a left child.
  Fixed with a single right rotation.
- RR (right-right): the mirror case, in the right subtree of a right
  child. Fixed with a single left rotation.
- LR (left-right): the new node is in the right subtree of a left
  child - a "kink" shape. Fixed by left-rotating the left child first,
  then right-rotating the node (reduces it to an LL shape).
- RL (right-left): the mirror kink. Fixed by right-rotating the right
  child first, then left-rotating the node.

Key properties:
- Insert always needs at most ONE rotation to restore balance across the
  whole tree - fixing the lowest unbalanced ancestor is always enough.
- Delete can need a rotation at every ancestor on the way back to the
  root, since removing a node can keep reducing height further up.
- Time complexity: O(log n) guaranteed for search, insert, delete -
  never degrades, unlike a plain BST's O(n) worst case.

Common misconceptions:
- AVL_BALANCE_CHECK: student misjudges whether a balance factor outside
  [-1, 1] counts as unbalanced (e.g. thinking 2 is still acceptable, or
  that a balance factor of exactly -1 or 1 already needs a rotation).
  Ground feedback in the exact numeric balance factor shown.
- AVL_ROTATION_TYPE: student confuses LL with LR (or RR with RL) - the
  key discriminator is where the imbalance is *within* the heavy
  subtree, not just which side is heavy. A left-heavy node whose left
  child is itself left-heavy (or balanced) is LL; if that left child is
  right-heavy instead, it's LR.
- Students sometimes think a rotation is a full re-sort of the subtree,
  rather than a local pointer restructuring that preserves the in-order
  sequence of values exactly.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "AVL_BALANCE_CHECK": (
        "The student was asked whether a specific node is balanced, "
        "given its balance factor. Ground the feedback in that exact "
        "numeric value and the -1 to 1 acceptable range."
    ),
    "AVL_ROTATION_TYPE": (
        "The student was asked which of LL/RR/LR/RL rotation fixes the "
        "unbalanced node. Ground the feedback in the node's balance "
        "factor sign (left- vs right-heavy) and which grandchild the "
        "inserted/removed value affected (straight-line vs kinked shape)."
    ),
}

AVL_TREE_PSEUDOCODE = """
avl_insert(root, value):
  perform standard BST insert
  update height of every ancestor
  for each ancestor bottom-up:
    balance_factor = height(left) - height(right)
    if balance_factor > 1:  # left heavy
      if value < left.value: LL rotation
      else: LR rotation (left-right)
    if balance_factor < -1:  # right heavy
      if value > right.value: RR rotation
      else: RL rotation (right-left)

avl_delete(root, value):
  perform standard BST delete (leaf / one child / two children)
  walk back up from the deletion point to the root:
    update height, recompute balance_factor
    rebalance exactly as in avl_insert, using the child's own balance
    factor (not a "just-inserted value") to choose LL vs LR / RR vs RL
"""
