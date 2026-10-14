"""INSERT_BETWEEN grades by where the insert lands (Phase 7A.2): an append,
and a DLL front insert, mark their right option 'correct'; only an insert
between two nodes uses the A-and-B options."""

from models.request_models import PredictionRequest, ScaffoldingLevel
from routers.predictions import evaluate_answer

SLL = [{"id": "a", "value": 3, "next": "b"}, {"id": "b", "value": 7, "next": None}]
DLL = [{"id": "a", "value": 3, "next": "b", "prev": None}, {"id": "b", "value": 7, "next": None, "prev": "a"}]


def _grade(nodes: list[dict], position: int, answer: str) -> bool:
    state = {
        "criticalJunctionType": "INSERT_BETWEEN",
        "dataStructureState": {"nodes": nodes, "insertPosition": position, "operationValue": 8},
    }
    return evaluate_answer(
        PredictionRequest(
            algorithm_name="Linked List",
            step_index=4,
            current_state=state,
            student_answer=answer,
            scaffolding_level=ScaffoldingLevel.MEDIUM,
            session_id="test-session",
        )
    )


def test_append_and_dll_front_take_the_correct_tile():
    assert _grade(SLL, 2, "correct") is True
    assert _grade(SLL, 2, "new-then-prev") is False
    assert _grade(DLL, 2, "correct") is True
    assert _grade(DLL, 2, "all-four") is False
    assert _grade(DLL, 0, "correct") is True


def test_insert_between_keeps_its_own_options():
    assert _grade(SLL, 1, "new-then-prev") is True
    assert _grade(DLL, 1, "all-four") is True
    assert _grade(DLL, 1, "correct") is False
