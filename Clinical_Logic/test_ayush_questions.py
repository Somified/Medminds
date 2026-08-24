"""
Pytest tests for the AYUSH / Dashavidha questionnaire definition.

These tests verify structure and integration stability only. They do not test
diagnosis, Ayurvedic interpretation, scoring, or red-flag detection.
"""

import pytest

from ayush_questions import (
    DASHAVIDHA_QUESTIONNAIRE,
    VALID_ANSWER_TYPES,
    VALID_SOURCES,
    get_all_questions,
    get_category,
    get_question,
    get_questions_by_category,
    validate_questionnaire,
)


EXPECTED_CATEGORIES = [
    "prakriti", "vikriti", "sara", "samhanana", "pramana",
    "satmya", "satva", "ahara_shakti", "vyayama_shakti", "vaya",
]


def test_all_ten_categories_exist():
    assert list(DASHAVIDHA_QUESTIONNAIRE.keys()) == EXPECTED_CATEGORIES
    assert len(DASHAVIDHA_QUESTIONNAIRE) == 10


def test_every_category_has_category_id():
    for category_key, category in DASHAVIDHA_QUESTIONNAIRE.items():
        assert category["category_id"] == category_key
        assert category["category_name"]
        assert category["questions"]


def test_every_question_has_required_core_fields():
    for question in get_all_questions():
        assert question["question_id"]
        assert question["category"]
        assert question["question_text"]
        assert question["answer_type"]


def test_question_ids_are_unique():
    ids = [q["question_id"] for q in get_all_questions()]
    assert len(ids) == len(set(ids))


def test_all_choice_questions_have_options():
    for question in get_all_questions():
        if question["answer_type"] == "single_choice":
            assert question.get("options")


def test_every_option_has_value_and_label():
    for question in get_all_questions():
        for option in question.get("options", []):
            assert option["value"]
            assert option["label"]


def test_option_values_are_unique_within_question():
    for question in get_all_questions():
        values = [option["value"] for option in question.get("options", [])]
        assert len(values) == len(set(values))


def test_every_question_has_valid_source():
    for question in get_all_questions():
        assert question["source"] in VALID_SOURCES


def test_every_question_has_valid_timeframe():
    for question in get_all_questions():
        assert question["timeframe"]


def test_numeric_questions_are_marked_number():
    numeric_ids = {
        "pramana_age_01",
        "pramana_height_01",
        "pramana_weight_01",
        "pramana_waist_circumference_01",
        "vaya_age_01",
    }
    for question_id in numeric_ids:
        question = get_question(question_id)
        assert question is not None
        assert question["answer_type"] == "number"


def test_date_questions_are_marked_date():
    question = get_question("vaya_date_of_birth_01")
    assert question is not None
    assert question["answer_type"] == "date"


def test_helper_functions_return_expected_questions():
    assert get_category("prakriti")["category_name"] == "Prakriti"
    assert len(get_questions_by_category("prakriti")) == 10
    assert get_question("prakriti_appetite_tendency_01")["question_text"] == (
        "How would you describe your usual appetite when you are well?"
    )
    assert len(get_all_questions()) == 61


def test_no_empty_question_text():
    for question in get_all_questions():
        assert question["question_text"].strip()


def test_questionnaire_validation_has_no_errors():
    assert validate_questionnaire() == []


def test_supported_answer_types_are_explicit():
    assert {"single_choice", "multiple_choice", "free_text", "number", "date"} <= VALID_ANSWER_TYPES