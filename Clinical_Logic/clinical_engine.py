"""
Clinical question-tree traversal engine.

This engine:
    - starts an assessment
    - presents questions
    - validates answers according to question type
    - moves through the tree
    - records answer history
    - produces an outcome
    - supports reset

This is a prototype and is not a medical diagnostic system.
"""

from Clinical_Questions import (
    QUESTION_TREES,
    get_question_tree,
)
from red_flag_detector import detect_red_flag


class ClinicalEngine:
    """
    Engine responsible for traversing one clinical question tree.
    """

    # ========================================================
    # INITIALIZATION
    # ========================================================

    def __init__(self, complaint):
        """
        Initialize an assessment for the given complaint.

        Args:
            complaint (str): Complaint name or supported alias.

        Raises:
            ValueError: If the complaint is not supported.
        """

        tree = get_question_tree(complaint)

        if tree is None:
            supported = ", ".join(QUESTION_TREES.keys())

            raise ValueError(
                f"Unsupported complaint: '{complaint}'. "
                f"Supported complaints are: {supported}"
            )

        self.complaint = tree["complaint"]
        self.tree = tree

        self.current_node_id = tree["start"]

        self.answer_history = []

        self.finished = False

        self.outcome = None

        self.red_flag_result = None

        self.red_flag_result = None

        self.red_flag_result = None

    # ========================================================
    # CURRENT QUESTION
    # ========================================================

    def get_current_question(self):
        """
        Return the current question dictionary.

        Returns:
            dict | None
        """

        if self.finished:
            return None

        return self.tree["questions"].get(
            self.current_node_id
        )

    # ========================================================
    # QUESTION TEXT
    # ========================================================

    def get_question_text(self):
        """
        Return the text of the current question.

        Returns:
            str | None
        """

        question = self.get_current_question()

        if question is None:
            return None

        return question["question"]

    # ========================================================
    # OPTIONS
    # ========================================================

    def get_options(self):
        """
        Return valid answer options for the current question.

        For:
            yes_no       -> ["yes", "no"]
            single_choice -> option keys
            number       -> []

        Returns:
            list
        """

        question = self.get_current_question()

        if question is None:
            return []

        question_type = question.get("type")

        # ----------------------------------------------------
        # YES / NO
        # ----------------------------------------------------

        if question_type == "yes_no":
            return [
                "yes",
                "no",
            ]

        # ----------------------------------------------------
        # SINGLE CHOICE
        # ----------------------------------------------------

        if question_type == "single_choice":
            options = question.get("options", {})

            return list(options.keys())

        # ----------------------------------------------------
        # NUMBER
        # ----------------------------------------------------

        if question_type == "number":
            return []

        # ----------------------------------------------------
        # UNKNOWN TYPE
        # ----------------------------------------------------

        return []

    # ========================================================
    # ANSWER NORMALIZATION
    # ========================================================

    def _normalize_answer(self, answer):
        """
        Normalize an answer before validation.

        Args:
            answer: User-provided answer.

        Returns:
            str

        Raises:
            ValueError: If answer is not a string or is empty.
        """

        if not isinstance(answer, str):
            raise ValueError(
                "Answer must be provided as a string."
            )

        normalized = answer.strip().lower()

        if not normalized:
            raise ValueError(
                "Answer cannot be empty."
            )

        return normalized

    # ========================================================
    # VALIDATE ANSWER
    # ========================================================

    def _validate_answer(self, question, answer):
        """
        Validate an answer according to the question type.

        Args:
            question (dict): Current question.
            answer (str): Normalized answer.

        Raises:
            ValueError: If the answer is invalid.
        """

        question_type = question.get("type")

        # ----------------------------------------------------
        # YES / NO
        # ----------------------------------------------------

        if question_type == "yes_no":

            if answer not in {"yes", "no"}:
                raise ValueError(
                    "Invalid answer. "
                    "Please answer 'yes' or 'no'."
                )

            return

        # ----------------------------------------------------
        # SINGLE CHOICE
        # ----------------------------------------------------

        if question_type == "single_choice":

            options = question.get("options", {})

            if not isinstance(options, dict):
                raise ValueError(
                    "Invalid question configuration: "
                    "'options' must be a dictionary."
                )

            valid_options = set(options.keys())

            if answer not in valid_options:
                raise ValueError(
                    "Invalid option. "
                    f"Valid options are: "
                    f"{', '.join(options.keys())}"
                )

            return

        # ----------------------------------------------------
        # NUMBER
        # ----------------------------------------------------

        if question_type == "number":

            try:
                value = float(answer)

            except (ValueError, TypeError):
                raise ValueError(
                    "Please enter a valid number."
                )

            # Reject NaN and infinity.
            if value != value or value in (
                float("inf"),
                float("-inf"),
            ):
                raise ValueError(
                    "Please enter a valid finite number."
                )

            return

        # ----------------------------------------------------
        # UNKNOWN TYPE
        # ----------------------------------------------------

        raise ValueError(
            f"Unsupported question type: {question_type}"
        )

    # ========================================================
    # FIND NEXT NODE
    # ========================================================

    def _get_next_node(self, question, answer):
        """
        Determine the next node based on the question type.

        yes_no:
            Uses question["yes"] or question["no"]

        single_choice:
            Uses question["next"]

        number:
            Uses question["next"]

        Returns:
            str

        Raises:
            RuntimeError: If tree configuration is invalid.
        """

        question_type = question.get("type")

        # ----------------------------------------------------
        # YES / NO
        # ----------------------------------------------------

        if question_type == "yes_no":

            if answer not in {"yes", "no"}:
                raise RuntimeError(
                    "Invalid yes/no answer encountered "
                    "while determining the next node."
                )

            if answer not in question:
                raise RuntimeError(
                    f"Broken tree: question "
                    f"'{question['id']}' does not define "
                    f"a '{answer}' transition."
                )

            return question[answer]

        # ----------------------------------------------------
        # SINGLE CHOICE / NUMBER
        # ----------------------------------------------------

        if question_type in {
            "single_choice",
            "number",
        }:

            if "next" not in question:
                raise RuntimeError(
                    f"Broken tree: question "
                    f"'{question['id']}' does not define "
                    f"a 'next' transition."
                )

            return question["next"]

        # ----------------------------------------------------
        # UNKNOWN TYPE
        # ----------------------------------------------------

        raise RuntimeError(
            f"Unsupported question type: {question_type}"
        )

    # ========================================================
    # SUBMIT ANSWER
    # ========================================================

    def submit_answer(self, answer):
        """
        Submit an answer to the current question.

        Returns:
            dict | None

            Returns the outcome dictionary if the assessment
            finishes.

            Returns None if another question follows.

        Raises:
            RuntimeError: If assessment is finished or tree is broken.
            ValueError: If the answer is invalid.
        """

        # ----------------------------------------------------
        # CHECK FINISHED
        # ----------------------------------------------------

        if self.finished:
            raise RuntimeError(
                "The assessment is already finished. "
                "Please reset the assessment before continuing."
            )

        # ----------------------------------------------------
        # GET CURRENT QUESTION
        # ----------------------------------------------------

        question = self.get_current_question()

        if question is None:
            raise RuntimeError(
                "No current question is available."
            )

        # ----------------------------------------------------
        # NORMALIZE ANSWER
        # ----------------------------------------------------

        normalized_answer = self._normalize_answer(
            answer
        )

        # ----------------------------------------------------
        # VALIDATE ANSWER
        # ----------------------------------------------------

        self._validate_answer(
            question,
            normalized_answer
        )

        # ----------------------------------------------------
        # RECORD ANSWER
        # ----------------------------------------------------

        self.answer_history.append(
            {
                "question_id": question["id"],
                "question": question["question"],
                "answer": normalized_answer,
            }
        )

        # ----------------------------------------------------
        # FIND NEXT NODE
        # ----------------------------------------------------

        next_node = self._get_next_node(
            question,
            normalized_answer
        )

        # ----------------------------------------------------
        # CHECK FOR RED FLAG
        # ----------------------------------------------------

        detected_red_flag = detect_red_flag(
            self.tree,
            question,
            normalized_answer,
            next_node,
        )

        if detected_red_flag.is_red_flag:
            self.red_flag_result = detected_red_flag
        else:
            self.red_flag_result = None

        # ----------------------------------------------------
        # CHECK OUTCOME
        # ----------------------------------------------------

        if next_node in self.tree["outcomes"]:

            self.outcome = self.tree["outcomes"][next_node]

            self.finished = True

            self.current_node_id = None

            return self.outcome

        # ----------------------------------------------------
        # CHECK NEXT QUESTION
        # ----------------------------------------------------

        if next_node in self.tree["questions"]:

            self.current_node_id = next_node

            return None

        # ----------------------------------------------------
        # BROKEN TREE
        # ----------------------------------------------------

        raise RuntimeError(
            f"Invalid tree transition: "
            f"'{question['id']}' points to "
            f"'{next_node}', which does not exist."
        )

    # ========================================================
    # IS FINISHED
    # ========================================================

    def is_finished(self):
        """
        Return whether the assessment has finished.

        Returns:
            bool
        """

        return self.finished

    # ========================================================
    # GET OUTCOME
    # ========================================================

    def get_outcome(self):
        """
        Return the current outcome.

        Returns:
            dict | None
        """

        return self.outcome

    # ========================================================
    # GET ANSWER HISTORY
    # ========================================================

    def get_answer_history(self):
        """
        Return a copy of the answer history.

        Returns:
            list
        """

        return list(self.answer_history)

    # ========================================================
    # GET RED FLAG RESULT
    # ========================================================

    def get_red_flag_result(self):
        """
        Return the most recent red-flag result.

        Returns:
            RedFlagResult | None
        """

        return self.red_flag_result

    # ========================================================
    # GET STATE
    # ========================================================

    def get_state(self):
        """
        Return the complete current engine state.

        Returns:
            dict
        """

        return {
            "complaint": self.complaint,
            "finished": self.finished,
            "question": self.get_current_question(),
            "outcome": self.outcome,
            "red_flag": self.red_flag_result,
            "answer_history": self.get_answer_history(),
        }

    # ========================================================
    # RESET
    # ========================================================

    def reset(self):
        """
        Reset the assessment to its initial state.
        """

        self.current_node_id = self.tree["start"]

        self.answer_history = []

        self.finished = False

        self.outcome = None

        self.red_flag_result = None