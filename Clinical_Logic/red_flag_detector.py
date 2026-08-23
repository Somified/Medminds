"""
Red-flag detection for the MediMinds clinical question trees.

This module does not diagnose disease. It identifies answers that lead to
an existing non-routine outcome in a question tree and exposes that finding
as a small structured result.

The detector intentionally uses structured tree data (question ID, answer,
and transition target) instead of searching question/answer text for words.
"""

from dataclasses import asdict, dataclass
from typing import Any, Optional


EMERGENCY = "EMERGENCY"
URGENT = "URGENT"
NONE = "NONE"


@dataclass(frozen=True)
class RedFlagResult:
    """Structured result returned by the red-flag detector."""

    is_red_flag: bool
    red_flag_type: Optional[str]
    severity: str
    message: Optional[str]
    recommended_action: Optional[str]

    def to_dict(self):
        """Return the result as a normal dictionary."""
        return asdict(self)


def _no_red_flag_result():
    """Create the standard result for a normal answer."""
    return RedFlagResult(
        is_red_flag=False,
        red_flag_type=None,
        severity=NONE,
        message=None,
        recommended_action=None,
    )


def detect_red_flag(tree, question, answer, next_node):
    """
    Detect whether the submitted answer leads to a red-flag outcome.

    Args:
        tree (dict): The current clinical question tree.
        question (dict): The question that was just answered.
        answer (str): The normalized answer.
        next_node (str): The transition already selected by ClinicalEngine.

    Returns:
        RedFlagResult

    Notes:
        The detector deliberately trusts the structured transition chosen by
        the existing question tree. It does not inspect free-form text.
    """

    if not isinstance(tree, dict):
        raise ValueError("tree must be a dictionary.")

    if not isinstance(question, dict):
        raise ValueError("question must be a dictionary.")

    if not isinstance(answer, str):
        raise ValueError("answer must be a string.")

    if not isinstance(next_node, str):
        raise ValueError("next_node must be a string.")

    outcomes = tree.get("outcomes", {})

    if not isinstance(outcomes, dict):
        raise ValueError("Tree 'outcomes' must be a dictionary.")

    outcome = outcomes.get(next_node)

    # A transition to another question is not a red flag.
    if outcome is None:
        return _no_red_flag_result()

    urgency = outcome.get("urgency")

    # The existing tree uses "routine", "soon", and "emergency".
    # "soon" is mapped to the simpler prototype severity "URGENT".
    if urgency == "emergency":
        severity = EMERGENCY
    elif urgency == "soon":
        severity = URGENT
    else:
        return _no_red_flag_result()

    return RedFlagResult(
        is_red_flag=True,
        red_flag_type=next_node,
        severity=severity,
        message=outcome.get("message"),
        recommended_action=(
            "Seek urgent medical evaluation. If symptoms are severe "
            "or life-threatening, contact emergency medical services "
            "immediately."
        ),
    )


def detect_red_flag_from_transition(tree, question_id, answer, next_node):
    """
    Convenience wrapper for callers that have a question ID instead of
    the full question dictionary.
    """

    questions = tree.get("questions", {})

    if question_id not in questions:
        raise ValueError(
            f"Unknown question ID: '{question_id}'."
        )

    return detect_red_flag(
        tree,
        questions[question_id],
        answer,
        next_node,
    )