"""
Comprehensive tests for ClinicalEngine.

Tests:
    - all 10 clinical question trees
    - valid branches
    - red-flag branches
    - emergency outcomes
    - soon outcomes
    - routine outcomes
    - invalid answers
    - number validation
    - answer normalization
    - answer history
    - state
    - reset
    - aliases
    - tree integrity
    - transition integrity
"""

import pytest

from clinical_engine import ClinicalEngine
from Clinical_Questions import QUESTION_TREES
from red_flag_detector import (
    EMERGENCY,
    NONE,
    URGENT,
    RedFlagResult,
    detect_red_flag,
)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def run_answers(engine, answers):
    """
    Submit multiple answers to the engine.

    Returns the final outcome.
    """

    result = None

    for answer in answers:
        result = engine.submit_answer(answer)

    assert engine.is_finished()
    assert engine.get_outcome() is not None

    return result


def assert_outcome(engine, expected_urgency):
    """
    Check that the engine has finished with the
    expected urgency.
    """

    assert engine.is_finished() is True
    assert engine.get_outcome() is not None
    assert engine.get_outcome()["urgency"] == expected_urgency


# ============================================================
# INITIALIZATION
# ============================================================

class TestInitialization:

    def test_supported_complaint(self):

        engine = ClinicalEngine("fever")

        assert engine.complaint == "Fever"
        assert engine.is_finished() is False
        assert engine.get_outcome() is None
        assert engine.get_current_question() is not None

    def test_case_insensitive_complaint(self):

        engine = ClinicalEngine("FEVER")

        assert engine.complaint == "Fever"

    def test_whitespace_complaint(self):

        engine = ClinicalEngine("   fever   ")

        assert engine.complaint == "Fever"

    def test_unsupported_complaint(self):

        with pytest.raises(ValueError):
            ClinicalEngine("malaria")


# ============================================================
# ALL 10 TREES INITIALIZE
# ============================================================

class TestAllTrees:

    @pytest.mark.parametrize(
        "complaint",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_tree_initializes(self, complaint):

        engine = ClinicalEngine(complaint)

        assert engine.get_current_question() is not None
        assert engine.is_finished() is False
        assert engine.get_outcome() is None


# ============================================================
# QUESTION INTERFACE
# ============================================================

class TestQuestionInterface:

    def test_question_text(self):

        engine = ClinicalEngine("headache")

        assert (
            engine.get_question_text()
            == "Did the headache reach maximum intensity suddenly?"
        )

    def test_yes_no_options(self):

        engine = ClinicalEngine("headache")

        assert engine.get_options() == [
            "yes",
            "no",
        ]

    def test_single_choice_options(self):

        engine = ClinicalEngine("fever")

        assert engine.get_options() == [
            "less_than_24h",
            "1_to_3_days",
            "4_to_7_days",
            "more_than_7_days",
        ]

    def test_number_question_has_no_options(self):

        engine = ClinicalEngine("fever")

        engine.submit_answer("less_than_24h")

        assert engine.get_options() == []

    def test_finished_has_no_question(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        assert engine.is_finished()
        assert engine.get_current_question() is None
        assert engine.get_question_text() is None
        assert engine.get_options() == []


# ============================================================
# FEVER
# ============================================================

class TestFever:

    def test_breathing_red_flag(self):

        engine = ClinicalEngine("fever")

        run_answers(
            engine,
            [
                "less_than_24h",
                "38",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_confusion_red_flag(self):

        engine = ClinicalEngine("fever")

        run_answers(
            engine,
            [
                "1_to_3_days",
                "38",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_meningitis_red_flag(self):

        engine = ClinicalEngine("fever")

        run_answers(
            engine,
            [
                "4_to_7_days",
                "38",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_rash_red_flag(self):

        engine = ClinicalEngine("fever")

        run_answers(
            engine,
            [
                "more_than_7_days",
                "38",
                "no",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_routine_path(self):

        engine = ClinicalEngine("fever")

        run_answers(
            engine,
            [
                "less_than_24h",
                "38",
                "no",
                "no",
                "no",
                "no",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# ABDOMINAL PAIN
# ============================================================

class TestAbdominalPain:

    def test_severe_pain_red_flag(self):

        engine = ClinicalEngine("abdominal_pain")

        run_answers(
            engine,
            [
                "upper_right",
                "yes",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_rigid_abdomen_red_flag(self):

        engine = ClinicalEngine("abdominal_pain")

        run_answers(
            engine,
            [
                "upper_left",
                "yes",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_vomiting_path(self):

        engine = ClinicalEngine("abdominal_pain")

        # Correct path:
        # q1 location
        # q2 sudden? -> no
        # q4 rigid/tender? -> no
        # q5 repeated vomiting/unable to keep fluids? -> yes
        run_answers(
            engine,
            [
                "lower_right",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_bleeding_red_flag(self):

        engine = ClinicalEngine("abdominal_pain")

        # Correct path:
        # q1 location
        # q2 sudden? -> no
        # q4 rigid/tender? -> no
        # q5 vomiting? -> no
        # q6 blood/black stool? -> yes
        run_answers(
            engine,
            [
                "lower_left",
                "no",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_routine_path(self):

        engine = ClinicalEngine("abdominal_pain")

        # Correct path:
        # q1 location
        # q2 sudden? -> no
        # q4 rigid/tender? -> no
        # q5 vomiting? -> no
        # q6 bleeding? -> no
        # q7 fever/chills? -> no
        run_answers(
            engine,
            [
                "generalized",
                "no",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# HEADACHE
# ============================================================

class TestHeadache:

    def test_thunderclap_red_flag(self):

        engine = ClinicalEngine("headache")

        # headache_q1 is YES/NO.
        # Therefore the correct answer is "yes".

        engine.submit_answer("yes")

        assert_outcome(engine, "emergency")

    def test_neurological_red_flag(self):

        engine = ClinicalEngine("headache")

        run_answers(
            engine,
            [
                "no",
                "today",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_meningitis_red_flag(self):

        engine = ClinicalEngine("headache")

        run_answers(
            engine,
            [
                "no",
                "few_days",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_headache_routine(self):

        engine = ClinicalEngine("headache")

        run_answers(
            engine,
            [
                "no",
                "more_than_week",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# COUGH
# ============================================================

class TestCough:

    def test_breathing_red_flag(self):

        engine = ClinicalEngine("cough")

        run_answers(
            engine,
            [
                "less_than_1_week",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_blood_red_flag(self):

        engine = ClinicalEngine("cough")

        run_answers(
            engine,
            [
                "1_to_3_weeks",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_chest_pain_path(self):

        engine = ClinicalEngine("cough")

        run_answers(
            engine,
            [
                "more_than_3_weeks",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_routine_path(self):

        engine = ClinicalEngine("cough")

        run_answers(
            engine,
            [
                "less_than_1_week",
                "no",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# DIFFICULTY BREATHING
# ============================================================

class TestDifficultyBreathing:

    def test_severe_breathing_emergency(self):

        engine = ClinicalEngine("difficulty_breathing")

        engine.submit_answer("yes")

        assert_outcome(engine, "emergency")

    def test_associated_symptoms_emergency(self):

        engine = ClinicalEngine("difficulty_breathing")

        run_answers(
            engine,
            [
                "no",
                "yes",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_sudden_breathing_problem(self):

        engine = ClinicalEngine("difficulty_breathing")

        run_answers(
            engine,
            [
                "no",
                "yes",
                "no",
            ],
        )

        assert_outcome(engine, "soon")

    def test_routine_path(self):

        engine = ClinicalEngine("difficulty_breathing")

        # Correct path:
        # q1 severe breathing? -> no
        # q2 sudden? -> no
        # q4 getting worse? -> no
        # q5 respiratory symptoms? -> no
        run_answers(
            engine,
            [
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# CHEST PAIN
# ============================================================

class TestChestPain:

    def test_associated_symptoms_emergency(self):

        engine = ClinicalEngine("chest_pain")

        run_answers(
            engine,
            [
                "yes",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_severe_chest_pain(self):

        engine = ClinicalEngine("chest_pain")

        run_answers(
            engine,
            [
                "yes",
                "no",
            ],
        )

        assert_outcome(engine, "soon")

    def test_radiating_pain_emergency(self):

        engine = ClinicalEngine("chest_pain")

        run_answers(
            engine,
            [
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_exertional_pain(self):

        engine = ClinicalEngine("chest_pain")

        run_answers(
            engine,
            [
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_reproducible_pain(self):

        engine = ClinicalEngine("chest_pain")

        run_answers(
            engine,
            [
                "no",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# VOMITING
# ============================================================

class TestVomiting:

    def test_blood_emergency(self):

        engine = ClinicalEngine("vomiting")

        run_answers(
            engine,
            [
                "less_than_24h",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_dehydration_urgent(self):

        engine = ClinicalEngine("vomiting")

        run_answers(
            engine,
            [
                "1_to_3_days",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_abdominal_red_flag(self):

        engine = ClinicalEngine("vomiting")

        run_answers(
            engine,
            [
                "more_than_3_days",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_routine_path(self):

        engine = ClinicalEngine("vomiting")

        run_answers(
            engine,
            [
                "less_than_24h",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# NAUSEA
# ============================================================

class TestNausea:

    def test_blood_emergency(self):

        engine = ClinicalEngine("nausea")

        run_answers(
            engine,
            [
                "less_than_24h",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_abdominal_emergency(self):

        engine = ClinicalEngine("nausea")

        run_answers(
            engine,
            [
                "1_to_3_days",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_chest_emergency(self):

        engine = ClinicalEngine("nausea")

        run_answers(
            engine,
            [
                "more_than_3_days",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_routine_path(self):

        engine = ClinicalEngine("nausea")

        run_answers(
            engine,
            [
                "1_to_3_days",
                "no",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# DIARRHEA
# ============================================================

class TestDiarrhea:

    def test_blood_emergency(self):

        engine = ClinicalEngine("diarrhea")

        run_answers(
            engine,
            [
                "less_than_2_days",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_black_stool_emergency(self):

        engine = ClinicalEngine("diarrhea")

        run_answers(
            engine,
            [
                "2_to_7_days",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_dehydration_urgent(self):

        engine = ClinicalEngine("diarrhea")

        run_answers(
            engine,
            [
                "more_than_7_days",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_routine_path(self):

        engine = ClinicalEngine("diarrhea")

        run_answers(
            engine,
            [
                "less_than_2_days",
                "no",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# BACK PAIN
# ============================================================

class TestBackPain:

    def test_trauma_path(self):

        engine = ClinicalEngine("back_pain")

        run_answers(
            engine,
            [
                "upper",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_cord_compression_emergency(self):

        engine = ClinicalEngine("back_pain")

        run_answers(
            engine,
            [
                "lower",
                "no",
                "yes",
                "yes",
            ],
        )

        assert_outcome(engine, "emergency")

    def test_neurological_symptoms(self):

        engine = ClinicalEngine("back_pain")

        run_answers(
            engine,
            [
                "middle",
                "no",
                "yes",
                "no",
            ],
        )

        assert_outcome(engine, "soon")

    def test_infection_path(self):

        engine = ClinicalEngine("back_pain")

        run_answers(
            engine,
            [
                "lower",
                "no",
                "no",
                "yes",
            ],
        )

        assert_outcome(engine, "soon")

    def test_routine_path(self):

        engine = ClinicalEngine("back_pain")

        # Correct path:
        # q1 location
        # q2 trauma? -> no
        # q3 neurological symptoms? -> no
        # q5 fever/unwell? -> no
        # q6 urinary symptoms/flank pain? -> no
        run_answers(
            engine,
            [
                "upper",
                "no",
                "no",
                "no",
                "no",
            ],
        )

        assert_outcome(engine, "routine")


# ============================================================
# INVALID ANSWERS
# ============================================================

class TestInvalidAnswers:

    @pytest.mark.parametrize(
        "answer",
        [
            "sudden",
            "maybe",
            "true",
            "false",
            "1",
            "y",
            "n",
            "",
            " ",
        ],
    )
    def test_invalid_yes_no(self, answer):

        engine = ClinicalEngine("headache")

        with pytest.raises(ValueError):

            engine.submit_answer(answer)

        # Invalid answer must not change state.
        assert engine.current_node_id == "headache_q1"
        assert engine.answer_history == []
        assert engine.is_finished() is False

    @pytest.mark.parametrize(
        "answer",
        [
            "abc",
            "temperature",
            "38 degrees",
            "NaN",
            "inf",
            "-inf",
            "",
            " ",
        ],
    )
    def test_invalid_number(self, answer):

        engine = ClinicalEngine("fever")

        engine.submit_answer("less_than_24h")

        with pytest.raises(ValueError):

            engine.submit_answer(answer)

        assert engine.current_node_id == "fever_q2"
        assert len(engine.answer_history) == 1

    @pytest.mark.parametrize(
        "answer",
        [
            None,
            10,
            38.5,
            True,
            False,
            [],
            {},
        ],
    )
    def test_non_string_answer(self, answer):

        engine = ClinicalEngine("headache")

        with pytest.raises(ValueError):

            engine.submit_answer(answer)

        assert engine.current_node_id == "headache_q1"
        assert engine.answer_history == []


# ============================================================
# NORMALIZATION
# ============================================================

class TestNormalization:

    def test_yes_uppercase(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("YES")

        assert engine.is_finished()

    def test_yes_with_spaces(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("  yes  ")

        assert engine.is_finished()

    def test_single_choice_normalization(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("NO")
        engine.submit_answer(" TODAY ")

        assert engine.current_node_id == "headache_q3"


# ============================================================
# ANSWER HISTORY
# ============================================================

class TestHistory:

    def test_history_is_recorded(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("no")
        engine.submit_answer("today")
        engine.submit_answer("yes")

        history = engine.get_answer_history()

        assert len(history) == 3

        assert history[0]["question_id"] == "headache_q1"
        assert history[0]["answer"] == "no"

        assert history[1]["question_id"] == "headache_q2"
        assert history[1]["answer"] == "today"

        assert history[2]["question_id"] == "headache_q3"
        assert history[2]["answer"] == "yes"

    def test_history_returns_copy(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        history = engine.get_answer_history()

        history.clear()

        assert len(engine.get_answer_history()) == 1


# ============================================================
# RESET
# ============================================================

class TestReset:

    def test_reset_partial_assessment(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("no")
        engine.submit_answer("today")

        assert len(engine.answer_history) == 2

        engine.reset()

        assert engine.current_node_id == "headache_q1"
        assert engine.answer_history == []
        assert engine.finished is False
        assert engine.outcome is None

    def test_reset_finished_assessment(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        assert engine.is_finished()

        engine.reset()

        assert engine.is_finished() is False
        assert engine.get_outcome() is None
        assert engine.get_current_question()["id"] == "headache_q1"
        assert engine.get_answer_history() == []

    def test_reuse_after_reset(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        assert engine.is_finished()

        engine.reset()

        engine.submit_answer("yes")

        assert engine.is_finished()
        assert len(engine.get_answer_history()) == 1


# ============================================================
# FINISHED ASSESSMENT
# ============================================================

class TestFinishedAssessment:

    def test_submit_after_finished(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        with pytest.raises(RuntimeError):

            engine.submit_answer("no")

    def test_history_does_not_change_after_finished(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        old_history = engine.get_answer_history()

        with pytest.raises(RuntimeError):

            engine.submit_answer("no")

        assert engine.get_answer_history() == old_history


# ============================================================
# STATE
# ============================================================

class TestState:

    def test_initial_state(self):

        engine = ClinicalEngine("fever")

        state = engine.get_state()

        assert state["complaint"] == "Fever"
        assert state["finished"] is False
        assert state["outcome"] is None
        assert state["question"]["id"] == "fever_q1"
        assert state["answer_history"] == []

    def test_state_after_answer(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("no")

        state = engine.get_state()

        assert state["finished"] is False
        assert state["question"]["id"] == "headache_q2"
        assert len(state["answer_history"]) == 1

    def test_state_after_finish(self):

        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        state = engine.get_state()

        assert state["finished"] is True
        assert state["question"] is None
        assert state["outcome"] is not None


# ============================================================
# ALIASES
# ============================================================

class TestAliases:

    @pytest.mark.parametrize(
        "alias,expected",
        [
            ("temperature", "Fever"),
            ("high temperature", "Fever"),
            ("abdominal pain", "Abdominal Pain"),
            ("stomach pain", "Abdominal Pain"),
            ("belly pain", "Abdominal Pain"),
            ("stomach ache", "Abdominal Pain"),
            ("head pain", "Headache"),
            ("shortness of breath", "Difficulty Breathing"),
            ("breathlessness", "Difficulty Breathing"),
            ("breathing difficulty", "Difficulty Breathing"),
            ("sob", "Difficulty Breathing"),
            ("chest pain", "Chest Pain"),
            ("throwing up", "Vomiting"),
            ("vomit", "Vomiting"),
            ("feeling nauseous", "Nausea"),
            ("diarrhoea", "Diarrhea"),
            ("loose motions", "Diarrhea"),
            ("loose stools", "Diarrhea"),
            ("back pain", "Back Pain"),
        ],
    )
    def test_alias(self, alias, expected):

        engine = ClinicalEngine(alias)

        assert engine.complaint == expected


# ============================================================
# TREE INTEGRITY
# ============================================================

class TestTreeIntegrity:

    def test_expected_trees_exist(self):

        expected = {
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        }

        assert expected.issubset(
            set(QUESTION_TREES.keys())
        )

    @pytest.mark.parametrize(
        "tree_name",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_start_node_exists(self, tree_name):

        tree = QUESTION_TREES[tree_name]

        assert tree["start"] in tree["questions"]

    @pytest.mark.parametrize(
        "tree_name",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_question_structure(self, tree_name):

        tree = QUESTION_TREES[tree_name]

        for question_id, question in tree["questions"].items():

            assert "id" in question
            assert "question" in question
            assert "type" in question

            if question["type"] == "yes_no":

                assert "yes" in question
                assert "no" in question

            elif question["type"] == "single_choice":

                assert "options" in question
                assert isinstance(
                    question["options"],
                    dict,
                )
                assert "next" in question

            elif question["type"] == "number":

                assert "next" in question

            else:

                pytest.fail(
                    f"Unknown question type "
                    f"'{question['type']}' in "
                    f"{tree_name}:{question_id}"
                )

    @pytest.mark.parametrize(
        "tree_name",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_transitions_are_valid(self, tree_name):

        tree = QUESTION_TREES[tree_name]

        questions = set(
            tree["questions"].keys()
        )

        outcomes = set(
            tree["outcomes"].keys()
        )

        valid_nodes = questions | outcomes

        for question_id, question in tree["questions"].items():

            if question["type"] == "yes_no":

                transitions = [
                    question["yes"],
                    question["no"],
                ]

            else:

                transitions = [
                    question["next"],
                ]

            for transition in transitions:

                assert transition in valid_nodes, (
                    f"Invalid transition: "
                    f"{tree_name} / "
                    f"{question_id} -> "
                    f"{transition}"
                )


# ============================================================
# OUTCOME STRUCTURE
# ============================================================

class TestOutcomes:

    @pytest.mark.parametrize(
        "tree_name",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_outcomes_are_valid(self, tree_name):

        tree = QUESTION_TREES[tree_name]

        assert len(tree["outcomes"]) > 0

        for outcome_id, outcome in tree["outcomes"].items():

            assert "message" in outcome
            assert "urgency" in outcome

            assert outcome["urgency"] in {
                "routine",
                "soon",
                "emergency",
            }


# ============================================================
# RETURN VALUES
# ============================================================

class TestReturnValues:

    def test_intermediate_answer_returns_none(self):

        engine = ClinicalEngine("headache")

        result = engine.submit_answer("no")

        assert result is None
        assert engine.is_finished() is False

    def test_final_answer_returns_outcome(self):

        engine = ClinicalEngine("headache")

        result = engine.submit_answer("yes")

        assert result is not None
        assert result == engine.get_outcome()

# ============================================================
# RED FLAG DETECTOR
# ============================================================

class TestRedFlagDetector:

    def test_emergency_red_flag_result(self):
        tree = QUESTION_TREES["headache"]
        question = tree["questions"]["headache_q1"]

        result = detect_red_flag(
            tree,
            question,
            "yes",
            "headache_emergency_thunderclap",
        )

        assert isinstance(result, RedFlagResult)
        assert result.is_red_flag is True
        assert result.severity == EMERGENCY
        assert result.red_flag_type == "headache_emergency_thunderclap"
        assert result.message is not None
        assert result.recommended_action is not None

    def test_urgent_red_flag_result(self):
        tree = QUESTION_TREES["back_pain"]
        question = tree["questions"]["back_q2"]

        result = detect_red_flag(
            tree,
            question,
            "yes",
            "back_urgent_trauma",
        )

        assert result.is_red_flag is True
        assert result.severity == URGENT
        assert result.red_flag_type == "back_urgent_trauma"

    def test_normal_answer_is_not_red_flag(self):
        tree = QUESTION_TREES["headache"]
        question = tree["questions"]["headache_q1"]

        result = detect_red_flag(
            tree,
            question,
            "no",
            "headache_q2",
        )

        assert result.is_red_flag is False
        assert result.severity == NONE
        assert result.red_flag_type is None
        assert result.message is None
        assert result.recommended_action is None

    def test_routine_outcome_is_not_red_flag(self):
        tree = QUESTION_TREES["headache"]
        question = tree["questions"]["headache_q6"]

        result = detect_red_flag(
            tree,
            question,
            "no",
            "headache_routine",
        )

        assert result.is_red_flag is False
        assert result.severity == NONE

    def test_detector_does_not_search_text_for_keywords(self):
        tree = QUESTION_TREES["cough"]
        question = tree["questions"]["cough_q3"]

        # The question contains the word "blood", but "no" follows
        # the normal structured transition to cough_q4.
        result = detect_red_flag(
            tree,
            question,
            "no",
            "cough_q4",
        )

        assert result.is_red_flag is False
        assert result.severity == NONE


# ============================================================
# RED FLAG INTEGRATION
# ============================================================

class TestRedFlagIntegration:

    @pytest.mark.parametrize(
        "complaint,answers,expected_type,expected_severity",
        [
            (
                "fever",
                ["less_than_24h", "38", "yes"],
                "fever_emergency_breathing",
                EMERGENCY,
            ),
            (
                "abdominal_pain",
                ["upper_right", "yes", "yes"],
                "abdominal_emergency_severe",
                EMERGENCY,
            ),
            (
                "headache",
                ["yes"],
                "headache_emergency_thunderclap",
                EMERGENCY,
            ),
            (
                "cough",
                ["less_than_1_week", "yes"],
                "cough_emergency_breathing",
                EMERGENCY,
            ),
            (
                "difficulty_breathing",
                ["yes"],
                "breathing_emergency_severe",
                EMERGENCY,
            ),
            (
                "chest_pain",
                ["yes", "yes"],
                "chest_emergency",
                EMERGENCY,
            ),
            (
                "vomiting",
                ["less_than_24h", "yes"],
                "vomiting_emergency_blood",
                EMERGENCY,
            ),
            (
                "nausea",
                ["less_than_24h", "yes"],
                "nausea_emergency_blood",
                EMERGENCY,
            ),
            (
                "diarrhea",
                ["less_than_2_days", "yes"],
                "diarrhea_emergency_blood",
                EMERGENCY,
            ),
            (
                "back_pain",
                ["lower", "no", "yes", "yes"],
                "back_emergency_cord",
                EMERGENCY,
            ),
        ],
    )
    def test_each_tree_detects_red_flag(
        self,
        complaint,
        answers,
        expected_type,
        expected_severity,
    ):
        engine = ClinicalEngine(complaint)

        result = run_answers(engine, answers)

        assert result["urgency"] == "emergency"

        red_flag = engine.get_red_flag_result()

        assert red_flag is not None
        assert red_flag.is_red_flag is True
        assert red_flag.red_flag_type == expected_type
        assert red_flag.severity == expected_severity

        # The red flag must also be available in the engine state.
        state = engine.get_state()
        assert state["red_flag"] == red_flag

    @pytest.mark.parametrize(
        "complaint,answers",
        [
            (
                "fever",
                [
                    "less_than_24h",
                    "38",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                ],
            ),
            (
                "abdominal_pain",
                [
                    "generalized",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                ],
            ),
            (
                "headache",
                ["no", "more_than_week", "no", "no", "no"],
            ),
            (
                "cough",
                [
                    "less_than_1_week",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                ],
            ),
            (
                "difficulty_breathing",
                ["no", "no", "no", "no"],
            ),
            (
                "chest_pain",
                ["no", "no", "no", "yes"],
            ),
            (
                "vomiting",
                ["less_than_24h", "no", "no", "no", "no"],
            ),
            (
                "nausea",
                [
                    "1_to_3_days",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                ],
            ),
            (
                "diarrhea",
                [
                    "less_than_2_days",
                    "no",
                    "no",
                    "no",
                    "no",
                    "no",
                ],
            ),
            (
                "back_pain",
                ["upper", "no", "no", "no", "no"],
            ),
        ],
    )
    def test_each_tree_normal_path_has_no_red_flag(
        self,
        complaint,
        answers,
    ):
        engine = ClinicalEngine(complaint)

        run_answers(engine, answers)

        assert engine.get_red_flag_result() is None
        assert engine.get_outcome()["urgency"] == "routine"

    def test_red_flag_is_recorded_in_answer_history(self):
        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        history = engine.get_answer_history()

        assert len(history) == 1
        assert history[0]["question_id"] == "headache_q1"
        assert history[0]["answer"] == "yes"

        red_flag = engine.get_red_flag_result()

        assert red_flag is not None
        assert red_flag.red_flag_type == "headache_emergency_thunderclap"

    def test_red_flag_terminates_assessment(self):
        engine = ClinicalEngine("difficulty_breathing")

        result = engine.submit_answer("yes")

        assert result["urgency"] == "emergency"
        assert engine.is_finished() is True
        assert engine.get_current_question() is None

        with pytest.raises(RuntimeError):
            engine.submit_answer("no")

    def test_red_flag_after_normal_questions(self):
        engine = ClinicalEngine("fever")

        engine.submit_answer("1_to_3_days")
        engine.submit_answer("38")
        result = engine.submit_answer("no")
        assert result is None

        result = engine.submit_answer("yes")

        assert result["urgency"] == "emergency"
        assert engine.get_red_flag_result().is_red_flag is True
        assert len(engine.get_answer_history()) == 4

    def test_multiple_potential_red_flags_stop_at_first_terminal_flag(self):
        engine = ClinicalEngine("fever")

        # The first red flag ends the tree. A second answer cannot
        # be submitted until reset.
        engine.submit_answer("less_than_24h")
        engine.submit_answer("38")
        engine.submit_answer("yes")

        assert engine.is_finished() is True
        assert engine.get_red_flag_result() is not None

        with pytest.raises(RuntimeError):
            engine.submit_answer("yes")

    def test_reset_clears_red_flag(self):
        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")

        assert engine.get_red_flag_result() is not None

        engine.reset()

        assert engine.get_red_flag_result() is None
        assert engine.get_outcome() is None
        assert engine.get_answer_history() == []
        assert engine.is_finished() is False

    def test_new_assessment_after_reset_can_detect_red_flag_again(self):
        engine = ClinicalEngine("headache")

        engine.submit_answer("yes")
        first_result = engine.get_red_flag_result()

        engine.reset()
        assert engine.get_red_flag_result() is None

        engine.submit_answer("yes")
        second_result = engine.get_red_flag_result()

        assert first_result is not None
        assert second_result is not None
        assert second_result.red_flag_type == (
            "headache_emergency_thunderclap"
        )

    def test_invalid_answer_does_not_create_red_flag(self):
        engine = ClinicalEngine("headache")

        with pytest.raises(ValueError):
            engine.submit_answer("maybe")

        assert engine.get_red_flag_result() is None
        assert engine.get_answer_history() == []
        assert engine.is_finished() is False

    def test_intermediate_normal_answer_has_no_red_flag(self):
        engine = ClinicalEngine("headache")

        result = engine.submit_answer("no")

        assert result is None
        assert engine.get_red_flag_result() is None
        assert engine.is_finished() is False


# ============================================================
# RED FLAG OUTCOME COVERAGE
# ============================================================

class TestRedFlagOutcomeCoverage:

    @pytest.mark.parametrize(
        "tree_name",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_each_tree_contains_at_least_one_red_flag_outcome(
        self,
        tree_name,
    ):
        tree = QUESTION_TREES[tree_name]

        red_flag_outcomes = [
            outcome
            for outcome in tree["outcomes"].values()
            if outcome["urgency"] in {"soon", "emergency"}
        ]

        assert red_flag_outcomes

    @pytest.mark.parametrize(
        "tree_name",
        [
            "fever",
            "abdominal_pain",
            "headache",
            "cough",
            "difficulty_breathing",
            "chest_pain",
            "vomiting",
            "nausea",
            "diarrhea",
            "back_pain",
        ],
    )
    def test_tree_red_flag_transition_is_structured(
        self,
        tree_name,
    ):
        tree = QUESTION_TREES[tree_name]

        for question in tree["questions"].values():
            if question["type"] == "yes_no":
                transitions = [
                    question["yes"],
                    question["no"],
                ]
            else:
                transitions = [question["next"]]

            for transition in transitions:
                if transition in tree["outcomes"]:
                    urgency = tree["outcomes"][transition]["urgency"]

                    if urgency in {"soon", "emergency"}:
                        result = detect_red_flag(
                            tree,
                            question,
                            "yes" if question["type"] == "yes_no"
                            and question["yes"] == transition
                            else "no",
                            transition,
                        )

                        assert result.is_red_flag is True