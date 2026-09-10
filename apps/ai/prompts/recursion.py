RECURSION_CONTEXT = """
Recursion solves a problem by having a function call itself on a smaller
version of the same problem, until reaching a base case simple enough to
answer directly without further recursion. Every recursive call adds a
new frame to the call stack; a function only returns - and its frame
only pops - once its own recursive call(s) have returned. This platform
demonstrates two examples.

Factorial (n! = n x (n-1) x ... x 1) is linear recursion: each call
makes exactly one further recursive call, so the call stack grows to
depth n before unwinding. The base case is factorial(0) = 1. Missing or
wrong base cases cause infinite recursion (a stack overflow in practice);
getting the recursive case's multiplication order wrong (e.g. multiplying
before the recursive call returns, when the value isn't known yet)
produces a subtly wrong result rather than a crash.

Fibonacci (fib(n) = fib(n-1) + fib(n-2)) is tree recursion: each call
makes TWO further recursive calls. The naive implementation recomputes
the same fib(k) many times across different branches of the call tree -
this is the overlapping subproblems problem, and it's why naive
Fibonacci is O(2^n) despite there only being n distinct subproblems to
solve. (Memoisation - caching each fib(k) the first time it's computed -
fixes this, though this platform's demonstration shows the naive version
specifically to make the blowup visible.) The base case is fib(1) = 1
(and fib(0) = 0, though this platform's demo starts from n >= 1).

When giving feedback, always refer to the actual argument values and
return values on screen. Never give generic explanations.

Common errors to watch for:
- BASE_CASE_OMISSION: The student doesn't recognise the base case
  correctly, or thinks recursion continues past it.
- ORDER_OF_OPERATIONS: The student computes a return value using a
  child call's result before that child has actually returned (i.e.
  before it's known), or gets the combination step (n * prev for
  factorial, left + right for fibonacci) backward.
- COMPLEXITY_MISATTRIBUTION: The student thinks naive Fibonacci is O(n)
  because there are only n distinct values of k, not realising the same
  k gets recomputed exponentially many times without memoisation.
- STRUCTURAL_PROPERTY_VIOLATION: The student loses track of which call
  frame is "currently" returning versus which is still waiting on a
  child - ground the feedback in the specific frame shown as active.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "BASE_CASE": (
        "The student was asked what the base case returns "
        "(factorial(0) = 1, fib(1) = 1). This is a fixed, known value, "
        "not something that needs to be computed from a smaller call."
    ),
    "RETURN_VALUE": (
        "The student was asked what a specific call returns, given what "
        "its recursive child call already returned. Ground the feedback "
        "in the exact argument and the exact child return value shown, "
        "and the combination rule (multiply by n for factorial)."
    ),
    "RECURSIVE_CALL": (
        "For factorial, the student was asked how many more calls "
        "remain before the base case - a simple countdown from the "
        "current argument to 0. For Fibonacci, the student was asked "
        "how many total calls the naive approach makes overall - "
        "exponential (roughly 2^n), not linear, which is the whole "
        "point of showing this example."
    ),
}

RECURSION_PSEUDOCODE = """factorial(n):
  if n == 0: return 1              // base case
  return n * factorial(n - 1)      // recursive case - waits for the child

fib(n):
  if n <= 1: return n              // base case: fib(0)=0, fib(1)=1
  return fib(n - 1) + fib(n - 2)   // TWO recursive calls - exponential blowup
"""
