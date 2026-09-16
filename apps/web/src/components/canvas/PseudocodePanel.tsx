import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

// Each array's line order matches that algorithm's own PSEUDOCODE_LINE
// constants in its engine file exactly (index-for-index), since the
// active snapshot's `pseudocodeLine` is generated against those
// constants and used directly as an index here - a couple of engines
// declare a PSEUDOCODE_LINE value that's never actually emitted (e.g.
// Selection Sort's inner-loop-start, BST's GO_LEFT/GO_RIGHT); those
// still get a plausible line of text, they just never highlight.
const PSEUDOCODE: Record<string, string[]> = {
  'bubble-sort': [
    'for i from 0 to n-1 do',
    '  for j from 0 to n-i-2 do',
    '    if arr[j] > arr[j+1] then',
    '      swap arr[j] and arr[j+1]',
    '  end for',
    'end for',
    'array is sorted',
  ],
  'linear-search': [
    'for i from 0 to n-1 do',
    '  if arr[i] == target then',
    '    return i',
    '  end if',
    'return -1 (not found)',
  ],
  'binary-search': [
    'low = 0, high = n-1',
    'while low <= high do',
    '  mid = (low + high) / 2',
    '  if arr[mid] == target: return mid; else narrow low/high',
    'return -1 (not found)',
  ],
  'selection-sort': [
    'for i from 0 to n-1 do',
    '  min_idx = i; for j from i+1 to n-1 do',
    '    if arr[j] < arr[min_idx]:',
    '      min_idx = j',
    '  end for',
    '  swap arr[i] and arr[min_idx]',
    'array is sorted',
  ],
  'insertion-sort': [
    'for i from 1 to n-1 do',
    '  key = arr[i]',
    '  while j >= 0 and arr[j] > key:',
    '    arr[j+1] = arr[j]; j = j - 1',
    '  arr[j+1] = key',
    'array is sorted',
  ],
  'merge-sort': [
    'for passSize = 1, 2, 4, ... while passSize < n do',
    '  for each adjacent pair of runs of size passSize',
    '    compare front elements of left and right runs',
    '    place the smaller into the merged result',
    '  end for',
    'array is sorted',
  ],
  'quick-sort': [
    'partition(low, high):',
    '  pivot = arr[high]; i = low - 1',
    '  for j from low to high-1: if arr[j] < pivot:',
    '    i++; swap arr[i] and arr[j]',
    '  swap arr[i+1] and arr[high]',
    'array is sorted',
  ],
  'shell-sort': [
    'gap = floor(n / 2)',
    'while gap > 0:',
    '  for i from gap to n-1:',
    '    key = arr[i]; j = i',
    '    while j >= gap and arr[j-gap] > key:',
    '      arr[j] = arr[j-gap]; j -= gap',
    '    arr[j] = key',
    '  gap = floor(gap / 2)',
    'array is sorted',
  ],
  'heap-sort': [
    'build_max_heap(arr): heapify every internal node bottom-up',
    'heapify(arr, size, i):',
    '  largest = i; l = 2i+1; r = 2i+2',
    '  if a child is larger than arr[largest]: largest = that child',
    '  if largest != i: swap arr[i] and arr[largest]; heapify(arr, size, largest)',
    'for i from n-1 down to 1:',
    '  swap arr[0] (max) and arr[i]; heapSize = i',
    '  heapify(arr, heapSize, 0)',
    'array is sorted',
  ],
  'counting-sort': [
    'find max value k in input',
    'count = array of zeros, length k+1',
    'for each element in input:',
    '  count[element] += 1',
    'for i from 1 to k:',
    '  count[i] += count[i-1]',
    'for i from n-1 down to 0:',
    '  output[count[input[i]] - 1] = input[i]',
    '  count[input[i]] -= 1',
    'copy output back to input',
  ],
  'radix-sort': [
    'find max value in input',
    'maxDigits = number of digits in max value',
    'for digitPos = 1; digitPos <= max; digitPos *= 10:',
    '  initialise 10 empty buckets (0-9)',
    '  for each element in array:',
    '    digit = floor(element / digitPos) mod 10',
    '    append element to bucket[digit]',
    '  collect buckets 0-9 back into array',
    'array is sorted',
  ],
  bst: [
    'insert(root, value):',
    '  if root is null: create node',
    '  if value < root.value:',
    '    insert(root.left, value)',
    '  else if value > root.value:',
    '    insert(root.right, value)',
    '  else: duplicate, ignore',
    'delete: leaf or one child - replace node with its child (or null)',
    'delete: two children - copy in-order successor value, delete successor',
  ],
  'bst-search': [
    'insert(root, value):',
    '  if root is null: create node',
    '  if value < root.value:',
    '    insert(root.left, value)',
    '  else if value > root.value:',
    '    insert(root.right, value)',
    '  else: duplicate, ignore',
    'delete: leaf or one child - replace node with its child (or null)',
    'delete: two children - copy in-order successor value, delete successor',
  ],
  'bst-delete': [
    'insert(root, value):',
    '  if root is null: create node',
    '  if value < root.value:',
    '    insert(root.left, value)',
    '  else if value > root.value:',
    '    insert(root.right, value)',
    '  else: duplicate, ignore',
    'delete: leaf or one child - replace node with its child (or null)',
    'delete: two children - copy in-order successor value, delete successor',
  ],
  'tree-inorder': [
    'inorder(node):',
    '  if node is null: return',
    '  inorder(node.left)',
    '  visit(node)',
    '  inorder(node.right)',
    'Result: nodes in ascending sorted order',
  ],
  'tree-preorder': [
    'preorder(node):',
    '  if node is null: return',
    '  visit(node)',
    '  preorder(node.left)',
    '  preorder(node.right)',
    'Result: root before children (useful for copying/serialising a tree)',
  ],
  'tree-postorder': [
    'postorder(node):',
    '  if node is null: return',
    '  postorder(node.left)',
    '  postorder(node.right)',
    '  visit(node)',
    'Result: children before their parent (useful for deleting a tree or evaluating expressions)',
  ],
  'tree-level-order': [
    'levelorder(root):',
    '  if root is null: return',
    '  queue = [root]',
    '  while queue is not empty:',
    '    node = dequeue()',
    '    visit(node)',
    '    enqueue node.left, node.right if they exist',
    'Result: nodes grouped by depth, left to right within each level',
  ],
  bfs: [
    'enqueue startNode',
    'mark startNode visited',
    'while queue not empty:',
    '  node = dequeue()',
    '  if node == target: found',
    '  for each neighbour of node:',
    '    if not visited: enqueue',
  ],
  stack: [
    'push(value): if size == capacity: OVERFLOW',
    '  else: top = top + 1; stack[top] = value',
    'pop(): if top == -1: UNDERFLOW',
    '  else: value = stack[top]; top = top - 1; return value',
    'peek(): if top == -1: EMPTY',
    '  else: return stack[top]',
  ],
  queue: [
    'enqueue(value): if size == capacity: FULL',
    '  else: queue[rear] = value; rear = rear + 1; size = size + 1',
    'dequeue(): if size == 0: EMPTY',
    '  else: value = queue[front]; front = front + 1; size = size - 1; return value',
    'if rear reaches capacity: wrap rear back to 0 (circular queue only)',
  ],
  'circular-queue': [
    'enqueue(value): if size == capacity: FULL',
    '  else: queue[rear] = value; rear = rear + 1; size = size + 1',
    'dequeue(): if size == 0: EMPTY',
    '  else: value = queue[front]; front = front + 1; size = size - 1; return value',
    'rear = (rear + 1) mod capacity  // wrap back to 0 at the end of the array',
  ],
  deque: [
    'pushFront(value) / pushBack(value): if size == capacity: FULL',
    '  else: insert value at the front or back; size = size + 1',
    'popFront() / popBack(): if size == 0: EMPTY',
    '  else: remove and return the value from that end; size = size - 1',
    'both ends support insert and remove in O(1)',
  ],
  'singly-linked-list': [
    'traverse: start at head, follow node.next until node.next is null',
    'insertFront(value): newNode.next = head',
    '  head = newNode',
    'insertBack(value): find last node (node.next is null)',
    '  last.next = newNode',
    'delete(target): find node before target (prev.next.value == target)',
    '  prev.next = prev.next.next  // unlink the target node',
    'search(target): if node.value == target: found',
    'reverse: prev = null; curr = head',
    '  next = curr.next; curr.next = prev; prev = curr; curr = next',
  ],
  'doubly-linked-list': [
    'traverse: start at head, follow node.next pointers',
    'insert(value): newNode.next = node; newNode.prev = node.prev',
    '  node.prev.next = newNode; node.prev = newNode',
    'find node at the target position or value',
    'delete(target): target.prev.next = target.next',
    '  target.next.prev = target.prev  // relink both directions',
    'reverse: curr = head; prev = null',
    '  swap curr.next and curr.prev; prev = curr; curr = curr.next (original)',
  ],
  'circular-linked-list': [
    'traverse: start at head, follow node.next until back at head',
    'insert(value): newNode.next = head  // close the circle',
    '  tail.next = newNode; tail = newNode',
    'traverse: curr = curr.next',
    'stop when curr == head again (full loop complete)',
    'delete(target): prev.next = target.next  // relink around the deleted node',
  ],
  'array-access': [
    'access(index):',
    '  if index < 0 or index >= length: OUT OF BOUNDS',
    '  return arr[index]',
  ],
  'array-insert': [
    'insert(index, value):',
    '  for i from length-1 down to index: arr[i+1] = arr[i]  // shift right',
    '  arr[index] = value; length = length + 1',
  ],
  'array-delete': [
    'delete(index):',
    '  for i from index to length-2: arr[i] = arr[i+1]  // shift left',
    '  length = length - 1',
  ],
  'hash-table-chaining': [
    'index = hash(key) = key mod capacity',
    'if bucket[index] already has an entry: append to its chain (collision)',
    'insert (key, value) into bucket[index]',
    'search(key): walk bucket[hash(key)]\'s chain; if key matches: return value',
    'if key not found after checking the whole chain: return null',
  ],
  'hash-table-probing': [
    'index = hash(key) = key mod capacity',
    'if bucket[index] occupied: probe next slot, (index + 1) mod capacity',
    'insert (key, value) into the first open slot found',
    'search(key): probe from hash(key); if bucket[i].key == key: return value',
    'if an empty slot is reached before a match: return null (not found)',
  ],
  'two-pointer': [
    'left = 0, right = n - 1',
    'while left < right: sum = arr[left] + arr[right]',
    '  if sum < target: left = left + 1',
    '  if sum > target: right = right - 1',
    '  if sum == target: pair found',
  ],
  'sliding-window-fixed': [
    'left = 0, right = 0, windowSum = 0',
    'windowSum = sum of arr[left..right] for the first k elements',
    'slide: windowSum = windowSum - arr[left] + arr[right+1]; left++, right++',
    'compare windowSum against the best value seen so far',
    'return the best window found',
  ],
  'sliding-window-variable': [
    'left = 0, right = 0, windowSum = 0',
    'windowSum = sum of arr[left..right]',
    'expand: windowSum = windowSum + arr[right]; right = right + 1',
    'while windowSum >= target: record window size; windowSum -= arr[left]; left++',
    'return the smallest window that met the target',
  ],
  'jump-search': [
    'jumpSize = floor(sqrt(n))',
    'while arr[min(step, n) - 1] < target: step = step + jumpSize',
    'linear search within the block [step - jumpSize, step)',
    'if arr[i] == target: return i',
    'return -1 (not found)',
  ],
  'interpolation-search': [
    'low = 0, high = n - 1',
    'while low <= high and target is within arr[low..high]:',
    '  pos = low + ((target - arr[low]) * (high - low)) / (arr[high] - arr[low])',
    '  if arr[pos] == target: return pos',
    'return -1 (not found)',
  ],
  'exponential-search': [
    'if arr[0] == target: return 0',
    'bound = 1; while bound < n and arr[bound] < target: bound = bound * 2',
    'binary search within [bound/2, min(bound, n-1)]',
    'if arr[mid] == target: return mid',
    'return -1 (not found)',
  ],
  'recursion-factorial': [
    'factorial(n):',
    '  if n == 0: return 1',
    '  return n * factorial(n - 1)',
  ],
  'recursion-fibonacci': [
    'fib(n):',
    '  if n <= 1: return n',
    '  return fib(n - 1) + fib(n - 2)',
  ],
}

function ComingSoonLabel({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-not-allowed text-text-muted dark:text-dark-text-secondary">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label} implementation coming soon</TooltipContent>
    </Tooltip>
  )
}

export default function PseudocodePanel() {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const activeLine = snapshot?.pseudocodeLine
  const lines = PSEUDOCODE[algorithmSlug ?? '']

  if (!lines) {
    return (
      <div
        className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-white dark:bg-dark-surface"
        style={{ width: '100%' }}
      >
        <div className="border-b border-border px-4 py-2">
          <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Pseudocode</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-center">
          <span className="text-sm text-text-muted dark:text-dark-text-secondary">
            No pseudocode available for this algorithm yet.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-white dark:bg-dark-surface"
      style={{ width: '100%' }}
    >
      <div className="border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Pseudocode</span>
      </div>
      <div
        className="flex items-center gap-3 px-4 py-1.5 text-[11px]"
        style={{ borderBottom: '0.5px solid var(--border)' }}
      >
        <span className="font-medium text-primary">Pseudocode</span>
        <span className="text-text-muted dark:text-dark-text-secondary">|</span>
        <ComingSoonLabel label="Python" />
        <span className="text-text-muted dark:text-dark-text-secondary">|</span>
        <ComingSoonLabel label="Java" />
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto p-2 font-mono">
        {lines.map((line, index) => {
          const isActive = index === activeLine
          return (
            <div key={index} className="relative flex py-1" style={{ lineHeight: 1.7, width: 'max-content', minWidth: '100%' }}>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 border-l-[3px] border-[#378add] bg-[rgba(55,138,221,0.1)]"
                  />
                )}
              </AnimatePresence>
              <span className="relative w-5 shrink-0 pl-2 text-right text-[10px] text-text-muted select-none">
                {index + 1}
              </span>
              <span
                className={cn(
                  'relative min-w-0 flex-1 pl-2 text-[11px]',
                  isActive ? 'font-medium text-text-accent' : 'font-normal text-text-primary dark:text-dark-text-primary',
                )}
                style={{ whiteSpace: 'nowrap', overflow: 'visible' }}
              >
                {line}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
