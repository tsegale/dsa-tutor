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
