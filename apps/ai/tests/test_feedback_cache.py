from services.feedback_cache import TTLLRUCache, make_cache_key


def test_cache_key_is_stable_for_identical_input():
    key_a = make_cache_key("Bubble Sort", "SWAP_DECISION", {"array": [5, 3]}, "swap", "HIGH", False)
    key_b = make_cache_key("Bubble Sort", "SWAP_DECISION", {"array": [5, 3]}, "swap", "HIGH", False)
    assert key_a == key_b


def test_cache_key_differs_when_any_input_differs():
    base = make_cache_key("Bubble Sort", "SWAP_DECISION", {"array": [5, 3]}, "swap", "HIGH", False)
    different_answer = make_cache_key("Bubble Sort", "SWAP_DECISION", {"array": [5, 3]}, "no-swap", "HIGH", False)
    different_correctness = make_cache_key("Bubble Sort", "SWAP_DECISION", {"array": [5, 3]}, "swap", "HIGH", True)
    different_state = make_cache_key("Bubble Sort", "SWAP_DECISION", {"array": [3, 5]}, "swap", "HIGH", False)
    assert base not in (different_answer, different_correctness, different_state)


def test_cache_get_set_round_trip():
    cache = TTLLRUCache(max_entries=10, ttl_seconds=60)
    cache.set("key", {"consequence_explanation": "text"})
    assert cache.get("key") == {"consequence_explanation": "text"}


def test_cache_evicts_least_recently_used_beyond_max_entries():
    cache = TTLLRUCache(max_entries=2, ttl_seconds=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)  # evicts "a", the least recently used
    assert cache.get("a") is None
    assert cache.get("b") == 2
    assert cache.get("c") == 3


def test_cache_get_refreshes_recency():
    cache = TTLLRUCache(max_entries=2, ttl_seconds=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")  # "a" is now more recently used than "b"
    cache.set("c", 3)  # evicts "b", not "a"
    assert cache.get("a") == 1
    assert cache.get("b") is None
    assert cache.get("c") == 3


def test_cache_entry_expires_after_ttl():
    cache = TTLLRUCache(max_entries=10, ttl_seconds=-1)  # already expired
    cache.set("key", "value")
    assert cache.get("key") is None


def test_cache_miss_returns_none():
    cache = TTLLRUCache(max_entries=10, ttl_seconds=60)
    assert cache.get("missing") is None
