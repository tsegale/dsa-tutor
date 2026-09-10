HASH_TABLE_CONTEXT = """
A hash table maps keys to array indices ("buckets") using a hash
function - here, the simplest useful one: hash(key) = key % capacity.
The capacity (number of buckets) is chosen as a prime number (7 in this
platform's examples) because a prime spreads keys more evenly than a
composite one; with a composite capacity like 8, every even key collides
in an even bucket, wasting half the table.

A collision happens when two different keys hash to the same bucket.
This platform demonstrates two resolution strategies. Chaining stores a
small list at each bucket, so colliding keys simply join the same
bucket's chain (this implementation appends new entries to the back of
the chain). Linear probing instead keeps one slot per bucket and, on a
collision, checks the next slot (index + 1, wrapping via modulo) and
keeps going until an empty slot is found - this is the entire mechanism
worth grounding feedback in, not just "it finds another spot."

Load factor (alpha = number of entries / number of buckets) measures how
full the table is. As it rises, chaining leads to longer chains
(degrading search from O(1) toward O(n) in the worst case), while linear
probing suffers from clustering - probe sequences bunch up, making
insertions and searches slower. Above roughly 0.7, it's time to resize
(grow the table and rehash everything).

When giving feedback, always refer to the actual key, bucket index, and
capacity on screen. Never give generic explanations.

Common errors to watch for:
- OFF_BY_ONE: The student computed the probe sequence without the
  modulo wraparound, or miscounted which bucket index is next.
- COMPLEXITY_MISATTRIBUTION: The student thinks hash table operations
  are always O(1) regardless of load factor or collision pattern - the
  average case is O(1) only with a good hash function and reasonable
  load factor; worst case (many collisions) degrades toward O(n).
- STRUCTURAL_PROPERTY_VIOLATION: The student inserted a colliding key at
  the front of a chain instead of the back (this implementation's
  convention), or assumed linear probing checks a random slot instead of
  the very next one.
- ORDER_OF_OPERATIONS: The student evaluated the hash function
  incorrectly (e.g. forgetting the modulo, or applying it to the wrong
  value).
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "HASH_BUCKET": (
        "The student was asked which bucket a key maps to via "
        "hash(key) = key % capacity. Ground the feedback in the exact "
        "key and capacity shown, and show the arithmetic."
    ),
    "COLLISION_RESOLVE": (
        "The student was asked where a new key goes when its bucket "
        "already has entries (chaining). This implementation's "
        "convention is the back of the chain - ground the feedback in "
        "that convention and the existing chain's contents."
    ),
    "PROBE_NEXT": (
        "The student was asked which slot linear probing checks next "
        "after finding one occupied. It is always (index + 1) % "
        "capacity, never a jump of more than one slot. Ground the "
        "feedback in the specific index that was occupied."
    ),
    "LOAD_FACTOR": (
        "The student was asked whether the table should be resized "
        "given its current load factor. Above roughly 0.7, yes - ground "
        "the feedback in the actual entry count and capacity shown."
    ),
}

HASH_TABLE_PSEUDOCODE = """hash(key, capacity):
  return key % capacity

// Chaining
insert(key):
  bucket = hash(key, capacity)
  table[bucket].append(key)          // always at the back of the chain

// Linear probing
insert(key):
  i = hash(key, capacity)
  while table[i] is occupied:
    i = (i + 1) % capacity           // check the very next slot, wrapping
  table[i] = key

search(key):
  i = hash(key, capacity)
  while table[i] is occupied:
    if table[i] == key: return i
    i = (i + 1) % capacity
  return not found                   // stopped at an empty slot
"""
