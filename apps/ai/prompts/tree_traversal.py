TREE_TRAVERSAL_CONTEXT = """
A tree traversal visits every node in a binary tree exactly once, in an
order determined by when each node is processed relative to its children.
Three classic orders exist:

- Inorder (left, root, right): on a BST, this visits nodes in ascending
  sorted order, the defining property of a BST's structure.
- Preorder (root, left, right): visits the current node before either
  child, useful for copying a tree or serialising its structure so it can
  be rebuilt in the same shape.
- Postorder (left, right, root): visits both children before their
  parent, useful for safely deleting a tree bottom-up or evaluating an
  expression tree.

Key properties:
- Time complexity: O(n) always, every node is visited exactly once,
  regardless of tree shape.
- Space complexity: O(h) for the call stack (or an equivalent explicit
  stack), where h is the tree's height.
- The three orders differ only in WHEN a node is added to the output
  relative to recursing into its children; the recursive structure
  (visit left subtree, visit right subtree, visit self) is identical.

Common misconceptions:
- VISIT_NODE: Student predicts the wrong next node because they confuse
  which traversal order is active (e.g. applying preorder's "visit first"
  rule during an inorder traversal). Ground feedback in the specific
  traversal type and which nodes have already been visited.
- Students often think traversal order depends on node value (like a
  search), when it actually depends purely on tree structure/position;
  every node is visited regardless of its value.
- Students sometimes assume postorder is "preorder reversed" - it is not
  the same as reading preorder backwards; it has its own left/right/root
  recursive structure.

Example prediction prompts:
1. "Inorder visits left subtree first. We've visited [2, 4] so far. Which
   node is visited next?" (correct: the next node in ascending order)
2. "Preorder visits the current node before its children. We've visited
   [8] so far. Which node is visited next?" (correct: the root's left
   child, since preorder descends left immediately after visiting a node)
3. "Postorder visits children before their parent. We've visited [2, 6]
   so far. Which node is visited next?" (correct: the parent of the just-
   completed subtree, or the start of the next subtree)

Example misconception scenarios:
1. Student picks the node with the smallest remaining value during a
   preorder traversal, treating it like a sorted (inorder) visit. Correct
   by pointing out preorder has no relationship to value order at all.
2. Student picks a node's parent immediately after visiting the node
   during an inorder traversal, skipping the still-unvisited right
   subtree. Correct by walking through "left, root, right" for that
   specific node.
3. Student reverses a preorder-looking sequence to answer a postorder
   question, producing "right, root, left" instead of "left, right,
   root". Correct by re-deriving postorder from its own left/right/root
   recursive definition rather than inverting another order.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "VISIT_NODE": (
        "The student was asked which node the traversal visits next, "
        "given the nodes already visited so far. Ground the feedback in "
        "the active traversal type (inorder/preorder/postorder) and the "
        "exact visited-order list shown to the student."
    ),
}

TREE_TRAVERSAL_PSEUDOCODE = """
procedure inorder(node):
  if node is null: return
  inorder(node.left)
  visit(node)
  inorder(node.right)

procedure preorder(node):
  if node is null: return
  visit(node)
  preorder(node.left)
  preorder(node.right)

procedure postorder(node):
  if node is null: return
  postorder(node.left)
  postorder(node.right)
  visit(node)
"""
