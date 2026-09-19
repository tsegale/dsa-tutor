"""Educator summaries never see a real name (remediation doc Phase 7.4).

The request used to accept student_name and interpolate it directly into
the prompt on the same line that told the model the student was
"anonymised" - sending the model the exact thing that line claimed it
wasn't getting. The field is removed entirely rather than trusted to be
used correctly by every caller."""

from routers.summaries import STUDENT_SUMMARY_PROMPT, StudentSummaryRequest


def test_student_summary_request_has_no_name_or_email_field():
    fields = StudentSummaryRequest.model_fields.keys()
    assert "student_name" not in fields
    assert "email" not in fields
    assert "student_id" in fields


def test_prompt_template_only_needs_a_participant_id():
    rendered = STUDENT_SUMMARY_PROMPT.format(
        student_id="ab12",
        algorithm_name="Bubble Sort",
        total_sessions=3,
        correct_predictions=8,
        total_predictions=10,
        accuracy_percent=80,
        hints_requested=2,
        misconception_breakdown={},
        scaffolding_progression=["HIGH", "MEDIUM"],
        feynman_scores="none yet",
        average_time_per_step=12.3,
    )
    assert "Student ab12" in rendered
    assert "anonymised" not in rendered.lower()
