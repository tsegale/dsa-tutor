RED_BLACK_TREE_CONTEXT = """
A Red-Black tree is a self-balancing Binary Search Tree that colours
each node RED or BLACK and enforces five properties:
1. Every node is red or black.
2. The root is black.
3. Every null leaf (the absence of a child) counts as black.
4. A red node never has a red child (no two reds in a row on any path).
5. Every path from a node to any of its descendant null leaves passes
   through the same number of black nodes (its "black-height").

These properties together bound the tree's height at roughly 2*log(n+1),
guaranteeing O(log n) search, insert, and delete - looser than an AVL
tree's balance guarantee (which is tighter, closer to log n), but
Red-Black trees need fewer rotations on average, which is why they're
the standard choice for many language standard libraries (e.g. C++'s
std::map, Java's TreeMap).

Insertion colours the new node RED (this can only ever violate property
4, never property 5, since a red leaf doesn't change any black-height)
and walks up fixing violations via three cases, determined by the
colour of the node's uncle (the parent's sibling):
- Case 1 (uncle RED): recolour parent and uncle BLACK, grandparent RED,
  and continue checking from the grandparent - the violation just moved
  up two levels, it didn't disappear.
- Case 2 (uncle BLACK, node is an "inner" grandchild - a left child of a
  right child, or vice versa): rotate the parent to convert the shape
  into an "outer" one, reducing to Case 3.
- Case 3 (uncle BLACK, node is an "outer" grandchild): recolour parent
  BLACK and grandparent RED, then rotate the grandparent. This always
  terminates the fix-up - no case reduces from here.

Deletion is more involved: removing a BLACK node creates a "double
black" deficiency at the node that took its place, fixed by walking up
through four sibling-based cases (sibling RED; sibling's children both
BLACK; sibling's near child RED; sibling's far child RED) until the
deficiency is absorbed or reaches the root.

Common misconceptions:
- RB_COLOR_DECISION: student doesn't realise the uncle's colour alone
  determines the WHOLE outcome regardless of shape - Case 1 (recolour)
  applies whenever the uncle is red, full stop; shape only matters once
  the uncle is black.
- RB_ROTATION_RECOLOR: student picks a rotation direction that doesn't
  match which side the violation is on, or thinks recolouring alone is
  always enough even when the uncle is black (it never is - a black
  uncle always needs at least one rotation).
- Students often confuse Red-Black balance with AVL balance - a
  Red-Black tree is NOT height-balanced in the same strict per-node
  sense as AVL; it only bounds height indirectly via the black-height
  and no-two-reds-in-a-row rules.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "RB_COLOR_DECISION": (
        "The student was asked whether the relevant uncle/sibling node "
        "is RED or BLACK, and what that implies (recolour-only vs. a "
        "rotation being needed). Ground the feedback in that node's "
        "exact colour."
    ),
    "RB_ROTATION_RECOLOR": (
        "The student was asked which fix-up operation (recolour, "
        "left-rotate, or right-rotate) resolves the current violation. "
        "Ground the feedback in which side of the tree is unbalanced "
        "and the specific case (1-4 for delete, 1-3 for insert) that "
        "applies."
    ),
}

RED_BLACK_TREE_PSEUDOCODE = """
rb_insert(root, value):
  standard BST insert, colour the new node RED
  while parent is RED:
    if uncle is RED: recolour parent+uncle BLACK, grandparent RED (Case 1)
    else if node is an "inner" grandchild: rotate parent (Case 2, reduces to Case 3)
    else: recolour parent/grandparent, rotate grandparent (Case 3)
  root.colour = BLACK

rb_delete(root, value):
  standard BST delete (leaf / one child / two children)
  if the removed node was BLACK, walk up fixing the "double black":
    Case 1: sibling RED -> recolour + rotate parent, reduces to Case 2-4
    Case 2: both of sibling's children BLACK -> recolour sibling RED, move up
    Case 3: sibling's near child RED, far child BLACK -> recolour + rotate sibling, reduces to Case 4
    Case 4: sibling's far child RED -> recolour + rotate parent, done
  root.colour = BLACK
"""
