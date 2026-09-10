STACK_QUEUE_CONTEXT = """
Stacks and queues are both restricted-access linear structures, but they
release elements in opposite orders. A stack is LIFO (last-in,
first-out): push and pop both happen at the same end, the "top" - think
of a stack of plates, you can only add or remove from the top. A queue is
FIFO (first-in, first-out): enqueue happens at the rear, dequeue happens
at the front - think of a line at a checkout counter.

A fixed-capacity stack overflows when a push is attempted with no room
left; popping from an empty stack underflows. The same two failure modes
apply to a queue's enqueue/dequeue.

A naive linear queue (a plain array with a front and rear index) has a
real problem: once elements are dequeued from the front, those array
slots are never reused - the front index just keeps advancing, wasting
space permanently even though the array isn't logically full. A circular
queue fixes this by wrapping the rear index back to 0 once it passes the
last slot (using modulo arithmetic), reusing the freed space instead of
abandoning it. This wasted-space problem is the entire motivation for why
circular queues exist - ground any explanation of circular queues in this
specific waste, not just "it's more efficient."

A deque (double-ended queue) generalises both: elements can be pushed or
popped from either end.

When giving feedback, always refer to the actual values and indices on
screen. Never give generic explanations.

Common errors to watch for:
- ORDER_OF_OPERATIONS: The student confuses which end an operation acts
  on (e.g. thinking dequeue removes from the rear like pop does on a
  stack, or thinking a deque's popFront is the same as a stack's pop).
- STRUCTURAL_PROPERTY_VIOLATION: The student didn't check for
  overflow/underflow before assuming an operation succeeds, or assumed a
  linear queue's freed front slots are automatically reused (they are
  not - only a circular queue does that).
- OFF_BY_ONE: The student's rear index for a circular queue is off by one
  after a wrap (forgetting the modulo, or applying it to the wrong
  index).
- COMPLEXITY_MISATTRIBUTION: The student thinks a circular queue's wrap
  changes the O(1) cost of enqueue/dequeue - it doesn't, it only changes
  which slot gets used, not how much work is done.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "STACK_PUSH_RESULT": (
        "The student was asked what the new top of stack is immediately "
        "after a push. It is always the value just pushed. Ground the "
        "feedback in that exact value."
    ),
    "STACK_POP_RESULT": (
        "The student was asked what pop() returns. It is always the "
        "value that was at the top before the pop, not the value that "
        "becomes the new top afterward. Ground the feedback in that "
        "distinction."
    ),
    "OVERFLOW_CHECK": (
        "The student was asked whether a push can succeed when the "
        "stack is already at capacity. It cannot - this is overflow. "
        "Ground the feedback in the specific capacity shown."
    ),
    "UNDERFLOW_CHECK": (
        "The student was asked what pop() does on an empty stack. It "
        "cannot return a value - this is underflow, an error condition, "
        "not 0/-1/null pretending nothing happened."
    ),
    "QUEUE_REAR": (
        "The student was asked where the rear pointer is after an "
        "enqueue. Ground the feedback in the exact index the new "
        "element landed at."
    ),
    "QUEUE_FRONT": (
        "The student was asked what dequeue() returns - always the "
        "value that was at the front before the dequeue."
    ),
    "LOAD_FACTOR": (
        "For a linear queue, the student was asked how much array space "
        "between index 0 and the front pointer is permanently wasted - "
        "ground the feedback in that this space can never be reused by "
        "a plain linear queue, which is exactly why circular queues "
        "exist."
    ),
    "CIRCULAR_WRAP": (
        "The student was asked where the rear pointer goes after it "
        "passes the last valid index. It wraps to index 0 via modulo "
        "arithmetic - this wraparound is the core insight of a circular "
        "queue. Ground the feedback in the actual capacity shown."
    ),
    "DEQUE_END": (
        "The student was asked which end (front or back) a specific "
        "deque operation acts on. Ground the feedback in the operation "
        "name shown (pushFront/pushBack/popFront/popBack)."
    ),
}

STACK_QUEUE_PSEUDOCODE = """// Stack (array-backed)
push(x): if size == capacity: overflow; else: arr[top++] = x
pop():   if top == 0: underflow; else: return arr[--top]
peek():  if top == 0: underflow; else: return arr[top - 1]

// Linear queue (array-backed) - front slots are never reused
enqueue(x): if size == capacity: full; else: arr[rear++] = x; size++
dequeue():  if size == 0: empty; else: x = arr[front++]; size--; return x

// Circular queue - rear wraps via modulo, reusing freed slots
enqueue(x): rear = (rear + 1) % capacity; arr[rear] = x; size++
dequeue():  x = arr[front]; front = (front + 1) % capacity; size--; return x

// Deque - four operations, one per end
pushFront(x): ...  pushBack(x): ...
popFront():   ...  popBack():   ...
"""
