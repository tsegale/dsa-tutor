TRIE_CONTEXT = """
A Trie (prefix tree) stores strings one character at a time: each edge
represents a character, and a path from the root spells out a prefix.
A node is marked "terminal" (isTerminal) when the path from the root to
it spells a complete word that was inserted - a node can be on the path
to other words AND be terminal itself (e.g. "app" and "apple" share the
same prefix path, and the node for "app" is terminal even though the
path continues on to "apple").

Insertion walks the word character by character: if the current
character already exists as a child of the current node, just descend
into it (reusing the shared prefix); otherwise create a new node first,
then descend. At the end, mark the final node terminal.

Search walks the same way, failing immediately if any character is
missing, and finally checking whether the node reached is terminal
(reaching the end of the characters isn't enough by itself - the word
must actually have been inserted, not just be a prefix of something
else that was).

Deletion first confirms the word exists and is terminal (like search),
unmarks that terminal flag, then prunes back up the path: any node that
has become childless AND isn't terminal itself gets removed, stopping
as soon as a node still needed by another word (has children, or is
itself terminal) is reached.

Key properties:
- Time complexity: O(m) for insert/search/delete, where m is the word's
  length - completely independent of how many words are already stored,
  unlike a BST search which depends on tree size.
- Space complexity: proportional to the total number of characters
  across all inserted words, with shared prefixes stored only once.

Common misconceptions:
- TRIE_CHARACTER_MATCH / TRIE_INSERT_NEW: student assumes a character
  needs a new node just because THIS word hasn't been inserted yet, not
  realising an earlier word may have already created that exact node
  via a shared prefix.
- Students often think reaching the end of a word's characters means
  it was found - forgetting the final node must also be marked
  terminal, since it might only be a prefix of a longer word that was
  inserted instead.
- Students sometimes think deleting a word deletes every node on its
  path - pruning must stop as soon as a node is still needed by another
  word (has other children or is itself a terminal for a shorter word).
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "TRIE_CHARACTER_MATCH": (
        "The student was asked (during search or delete) whether the "
        "current character already exists as a child of the current "
        "node. Ground the feedback in the exact character and node."
    ),
    "TRIE_INSERT_NEW": (
        "The student was asked (during insert) whether a new node is "
        "needed for the current character, i.e. whether it already "
        "exists as a child of the current node from an earlier word."
    ),
}

TRIE_PSEUDOCODE = """
insert(word):
  current = root
  for each char in word:
    if char not in current.children:
      create new node for char
    current = current.children[char]
  current.isTerminal = true

search(word):
  current = root
  for each char in word:
    if char not in current.children: return NOT FOUND
    current = current.children[char]
  return current.isTerminal

delete(word):
  find the node for word (same descent as search)
  if not found or not current.isTerminal: nothing to delete
  current.isTerminal = false
  walk back up: prune any node with no children and not terminal
"""
