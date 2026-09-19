"""Deterministic challenge array generation (remediation doc Phase 7.2).

Covers the defect the phase fixes: the misconception-to-array mapping was
inverted (STRUCTURAL_PROPERTY_VIOLATION, an under-swapping habit, got an
equal-heavy array that reinforces "leave it" - the same habit that causes
the misconception). An LLM is also no longer needed to produce a
provably-on-target array."""

from routers.challenges import generate_challenge_array


def _is_ascending(array: list[int]) -> bool:
    return all(array[i] <= array[i + 1] for i in range(len(array) - 1))


def _is_descending(array: list[int]) -> bool:
    return all(array[i] >= array[i + 1] for i in range(len(array) - 1))


def test_order_of_operations_generates_an_array_needing_no_swaps():
    # ORDER_OF_OPERATIONS is over-swapping - the remediation array must be
    # (close to) already sorted so "leave it" is the correct answer at
    # every adjacent pair, the opposite of the old inverted mapping.
    array, challenge_type, explanation = generate_challenge_array("ORDER_OF_OPERATIONS", "INTERMEDIATE", 7)
    assert len(array) == 7
    assert _is_ascending(array)
    assert "over-swap" in explanation


def test_structural_property_violation_generates_an_array_needing_many_swaps():
    # STRUCTURAL_PROPERTY_VIOLATION is under-swapping - the remediation
    # array must force many genuine swaps (reverse sorted), not the old
    # equal-heavy array that reinforced never swapping.
    array, challenge_type, explanation = generate_challenge_array("STRUCTURAL_PROPERTY_VIOLATION", "INTERMEDIATE", 7)
    assert len(array) == 7
    assert _is_descending(array)
    assert "under-swap" in explanation


def test_the_two_core_mappings_are_not_accidentally_identical():
    # A regression guard for the exact inversion bug: these two categories
    # must never resolve to the same array shape again.
    over_swap, _, _ = generate_challenge_array("ORDER_OF_OPERATIONS", "INTERMEDIATE", 7)
    under_swap, _, _ = generate_challenge_array("STRUCTURAL_PROPERTY_VIOLATION", "INTERMEDIATE", 7)
    assert over_swap != under_swap
    assert _is_ascending(over_swap)
    assert _is_descending(under_swap)


def test_off_by_one_places_extreme_values_at_extreme_positions():
    array, challenge_type, _explanation = generate_challenge_array("OFF_BY_ONE", "INTERMEDIATE", 7)
    assert len(array) == 7
    assert array[0] == max(array)
    assert array[-1] == min(array)
    assert challenge_type == "boundary_test"


def test_premature_termination_is_almost_sorted_with_one_pair_out_of_place():
    array, _challenge_type, _explanation = generate_challenge_array("PREMATURE_TERMINATION", "INTERMEDIATE", 7)
    assert len(array) == 7
    # Sorting it should take very little work - only the last pair is swapped.
    assert sorted(array) != array
    assert array[:-2] == sorted(array)[:-2]


def test_unmapped_misconception_falls_back_to_worst_case():
    array, challenge_type, explanation = generate_challenge_array("TRAVERSAL_ORDER_CONFUSION", "INTERMEDIATE", 7)
    assert len(array) == 7
    assert _is_descending(array)
    assert challenge_type == "worst_case"


def test_null_misconception_falls_back_to_worst_case():
    array, challenge_type, explanation = generate_challenge_array(None, "INTERMEDIATE", 7)
    assert len(array) == 7
    assert _is_descending(array)
    assert "No misconception" in explanation


def test_requested_array_size_is_always_honoured():
    for size in (1, 3, 7, 12):
        for misconception in (None, "ORDER_OF_OPERATIONS", "STRUCTURAL_PROPERTY_VIOLATION", "OFF_BY_ONE", "COMPARISON_DIRECTION", "PREMATURE_TERMINATION"):
            array, _challenge_type, _explanation = generate_challenge_array(misconception, "BEGINNER", size)
            assert len(array) == size, f"size={size} misconception={misconception} produced {array}"


def test_advanced_difficulty_introduces_a_duplicate():
    array, _challenge_type, _explanation = generate_challenge_array("STRUCTURAL_PROPERTY_VIOLATION", "ADVANCED", 7)
    assert len(array) != len(set(array))
