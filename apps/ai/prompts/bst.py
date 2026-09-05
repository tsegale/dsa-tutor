BST_CONTEXT = """
A Binary Search Tree (BST) keeps every node's left subtree smaller than the
node and every node's right subtree greater than or equal to it (duplicates
conventionally go right). Both insertion and search start at the root and
repeatedly move left or right based on comparing the target value against
the current node, until either an empty position is reached (insert here)
or the target is found.

Key properties:
- Time complexity: O(log n) average case for a balanced tree, O(n) worst
  case for a degenerate (linear-chain) tree
- Insertion always adds a new leaf - it never rearranges existing nodes
- In-order traversal of a BST visits values in sorted order

Common misconceptions:
- BST_DIRECTION: Student goes left when they should go right (or vice
  versa), or says "insert here" when there is still a node at this
  position. Address by asking: Is the target smaller or larger than the
  current node's value? Is this position actually empty?
- Students sometimes think a value can be inserted anywhere that "looks
  reasonable" in the tree shape. It must follow the exact left/right
  comparison chain from the root - there is only one correct position.
- Students sometimes forget the standard convention that a value equal to
  an existing node goes right, not left.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "BST_DIRECTION": (
        "The student was asked whether to go left, go right, or insert "
        "here (the current position is empty). Ground the feedback in "
        "the exact target value and the current node's value (if any)."
    ),
}

BST_PSEUDOCODE = """
procedure insert(node, value):
  if node is null:
    return new Node(value)
  if value < node.value:
    node.left = insert(node.left, value)
  else:
    node.right = insert(node.right, value)
  return node

procedure search(node, target):
  if node is null or node.value == target:
    return node
  if target < node.value:
    return search(node.left, target)
  else:
    return search(node.right, target)
"""
