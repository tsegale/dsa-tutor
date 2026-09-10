LINKED_LIST_CONTEXT = """
Linked lists store nodes scattered anywhere in memory, connected only by
pointers. This context covers singly linked lists (SLL, one forward
pointer), doubly linked lists (DLL, forward and backward pointers), and
circular linked lists (CLL, the tail's pointer wraps back to the head
instead of terminating in null).

The defining skill this whole topic tests is pointer reassignment order.
Every insert or delete is really "which pointers must change, and in what
order" - get the order wrong and you either lose the rest of the list
(overwrite a pointer before following it) or create a dangling/broken
link. In a DLL specifically, every insert and delete must update BOTH a
.next AND a .prev pointer; students who only update one leave the list in
an inconsistent state that a forward traversal won't reveal, but a
backward traversal will.

In a CLL, there is no null terminator: the last node's .next points back
to the head. Traversal must stop when it returns to the head, not when it
finds null (which never happens in a well-formed circular list) - looking
for null is an infinite loop waiting to happen.

When giving feedback, always refer to the actual node values on screen.
Never give generic explanations.

Common errors to watch for:
- POINTER_CONFUSION: The student updated a pointer that doesn't need to
  change, missed one that does, or got the reassignment order backward
  (e.g. setting A.next = new before saving what A.next used to point to,
  losing the rest of the list). Walk through the exact pointers involved
  by name.
- STRUCTURAL_PROPERTY_VIOLATION: In a DLL, the student updated .next but
  not the corresponding .prev (or vice versa), breaking the two-way
  invariant. In a CLL, the student described the last node's .next as
  null instead of pointing back to the head.
- BASE_CASE_OMISSION: The student's traversal logic doesn't handle the
  empty-list or single-node case correctly (e.g. assuming there is
  always a "next" node to inspect).
- ORDER_OF_OPERATIONS: The student described the base case for "when is
  a circular traversal complete" as null-based rather than
  head-revisited-based.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "NULL_CHECK": (
        "Depending on context this asks either what a brand-new node's "
        ".next should point to (current head, or null if the list was "
        "empty), whether the current node is the last one in the list, "
        "or - for a circular list - what the actual termination "
        "condition for traversal is (reaching the head again, never a "
        "null check). Ground the feedback in which of these the "
        "snapshot is actually asking."
    ),
    "INSERT_BETWEEN": (
        "The student was asked what must happen to link a new node "
        "between two existing ones. In a DLL this means updating all "
        "four pointers (new.next, new.prev, and both neighbours' "
        "pointers back to the new node); in an SLL it means saving the "
        "next pointer before overwriting it. Ground the feedback in the "
        "exact node names shown."
    ),
    "DELETE_RELINK": (
        "The student was asked how many pointers (SLL: 1, DLL: 2) or "
        "which specific pointer must be updated to relink around a "
        "deleted node. Ground the feedback in the specific predecessor "
        "and successor node names."
    ),
    "POINTER_FOLLOW": (
        "The student was asked which node a .next or .prev pointer "
        "leads to, or - during a reversal - where a node's own pointer "
        "should now point (the previous node). Ground the feedback in "
        "the actual pointer being followed."
    ),
    "TRAVERSE_DIRECTION": (
        "The student was asked which node is reached by following a "
        "pointer in a specific direction (a DLL's key advantage: "
        "traversal works both forward via .next and backward via "
        ".prev). Ground the feedback in the direction actually used."
    ),
    "WRAP_CHECK": (
        "The student was asked what a circular list's last node's "
        ".next points to. The correct answer is always the head node, "
        "never null - that is the entire defining property of a "
        "circular list."
    ),
}

LINKED_LIST_PSEUDOCODE = """// Singly linked list
insertFront(head, value):
  newNode.next = head          // save the old head first
  head = newNode                // then repoint head

insertBack(head, tail, value):
  tail.next = newNode           // link old tail forward
  tail = newNode                // advance tail

delete(head, target):
  prev = null; curr = head
  while curr.value != target: prev = curr; curr = curr.next
  if prev == null: head = curr.next
  else: prev.next = curr.next   // relink around curr

reverse(head):
  prev = null; curr = head
  while curr != null:
    next = curr.next
    curr.next = prev            // reverse this node's pointer
    prev = curr; curr = next
  head = prev

// Doubly linked list - every insert/delete updates BOTH directions
insertBetween(A, B, value):
  newNode.next = B; newNode.prev = A
  A.next = newNode; B.prev = newNode   // all four pointers

// Circular linked list - the tail always points back to the head
insertAtBack(tail, head, value):
  tail.next = newNode; newNode.next = head; tail = newNode

traverse(head):
  curr = head
  do: visit(curr); curr = curr.next
  while curr != head            // stop on revisiting head, not on null
"""
