/**
 * A model answer per rung, in the same order as CODE_LADDERS.
 *
 * Kept out of codeLadders.ts, and imported only by codeLadders.test.ts, so
 * the answers are not part of any bundle the learner is served.
 *
 * These exist to check the content, not to grade anyone. Each one is run in
 * a real Python interpreter against its own rung's sandbox globals, and its
 * read-back value must equal what expectedFor computed from the engine run.
 * Without that, a rung whose expected answer disagrees with the code a
 * student is being asked to write would be found by the student.
 */
export const LADDER_SOLUTIONS: Record<string, string[]> = {
  'array-access': [
    'value = arr[i]',
    'address = base + i * size',
    'value = arr[len(arr) - 1]',
    ['values = []', 'for k in probes:', '    if 0 <= k < len(arr):', '        values.append(arr[k])', '    else:', '        values.append(None)'].join('\n'),
  ],
  'array-insert': [
    'arr[k] = arr[k - 1]',
    ['for k in range(len(arr) - 1, pos, -1):', '    arr[k] = arr[k - 1]'].join('\n'),
    'arr[pos] = value',
    [
      'arr.append(0)',
      'for k in range(len(arr) - 1, pos, -1):',
      '    arr[k] = arr[k - 1]',
      'arr[pos] = value',
    ].join('\n'),
  ],
  'array-delete': [
    'arr[k] = arr[k + 1]',
    ['for k in range(pos, len(arr) - 1):', '    arr[k] = arr[k + 1]'].join('\n'),
    'arr.pop()',
    ['for k in range(pos, len(arr) - 1):', '    arr[k] = arr[k + 1]', 'arr.pop()'].join('\n'),
  ],
  stack: [
    'stack.append(value)',
    'top = stack[-1]',
    'popped = stack.pop()',
    [
      'stack = []',
      'popped = []',
      'for value in values:',
      '    stack.append(value)',
      'popped.append(stack.pop())',
      'popped.append(stack.pop())',
    ].join('\n'),
  ],
  queue: [
    'queue.append(value)',
    'front = queue[0]',
    'removed = queue.pop(0)',
    [
      'queue = []',
      'removed = []',
      'for value in values:',
      '    queue.append(value)',
      'removed.append(queue.pop(0))',
      'removed.append(queue.pop(0))',
    ].join('\n'),
  ],
  'singly-linked-list': [
    "value = head['next']['value']",
    ['count = 0', 'node = head', 'while node is not None:', '    count = count + 1', "    node = node['next']"].join('\n'),
    "head = {'value': value, 'next': head}",
    [
      'head = None',
      'for value in reversed(values):',
      "    head = {'value': value, 'next': head}",
    ].join('\n'),
  ],
  'bubble-sort': [
    'should_swap = arr[j] > arr[j + 1]',
    'arr[j], arr[j + 1] = arr[j + 1], arr[j]',
    ['for j in range(len(arr) - 1):', '    if arr[j] > arr[j + 1]:', '        arr[j], arr[j + 1] = arr[j + 1], arr[j]'].join('\n'),
    [
      'for i in range(len(arr)):',
      '    for j in range(len(arr) - 1 - i):',
      '        if arr[j] > arr[j + 1]:',
      '            arr[j], arr[j + 1] = arr[j + 1], arr[j]',
    ].join('\n'),
  ],
  'binary-search': [
    'mid = (low + high) // 2',
    [
      'if arr[mid] == target:',
      "    half = 'found'",
      'elif arr[mid] < target:',
      "    half = 'right'",
      'else:',
      "    half = 'left'",
    ].join('\n'),
    [
      'mid = (low + high) // 2',
      'if arr[mid] == target:',
      '    low = mid',
      '    high = mid',
      'elif arr[mid] < target:',
      '    low = mid + 1',
      'else:',
      '    high = mid - 1',
      'bounds = [low, high]',
    ].join('\n'),
    [
      'low = 0',
      'high = len(arr) - 1',
      'result = -1',
      'while low <= high:',
      '    mid = (low + high) // 2',
      '    if arr[mid] == target:',
      '        result = mid',
      '        break',
      '    elif arr[mid] < target:',
      '        low = mid + 1',
      '    else:',
      '        high = mid - 1',
    ].join('\n'),
  ],
  bst: [
    "go = 'left' if target < node_value else 'right'",
    "node = {'value': target, 'left': None, 'right': None}",
    [
      'node = tree',
      'while True:',
      "    side = 'left' if target < node['value'] else 'right'",
      '    if node[side] is None:',
      "        node[side] = {'value': target, 'left': None, 'right': None}",
      '        break',
      '    node = node[side]',
    ].join('\n'),
    [
      'tree = None',
      'for target in values:',
      '    if tree is None:',
      "        tree = {'value': target, 'left': None, 'right': None}",
      '        continue',
      '    node = tree',
      '    while True:',
      "        side = 'left' if target < node['value'] else 'right'",
      '        if node[side] is None:',
      "            node[side] = {'value': target, 'left': None, 'right': None}",
      '            break',
      '        node = node[side]',
    ].join('\n'),
  ],
}
