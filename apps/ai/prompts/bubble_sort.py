BUBBLE_SORT_CONTEXT = """Bubble Sort repeatedly steps through the array, compares each pair of
adjacent elements, and swaps them if they are in the wrong order. The pass
through the array is repeated until no swaps are needed, at which point the
array is sorted. Larger elements "bubble up" to the end of the array with
each pass.
"""

BUBBLE_SORT_PSEUDOCODE = """1  procedure bubbleSort(A: list)
2      n = length(A)
3      repeat
4          swapped = false
5          for i = 1 to n - 1 inclusive do
6              if A[i - 1] > A[i] then
7                  swap(A[i - 1], A[i])
8                  swapped = true
9              end if
10         end for
11         n = n - 1
12     until not swapped
13 end procedure
"""
