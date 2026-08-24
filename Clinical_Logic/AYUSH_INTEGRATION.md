# AYUSH / Dashavidha Questionnaire Integration

## 1. What `DASHAVIDHA_QUESTIONNAIRE` contains

`ayush_questions.py` is a stable questionnaire-definition layer for the 10 Dashavidha
domains in the supplied DOCX source.

Each question contains:

- `question_id` — stable machine-readable identifier
- `category` — stable category identifier
- `question_text` — patient-facing wording from the source
- `answer_type` — `single_choice`, `multiple_choice`, `free_text`, `number`, or `date`
- `options` — for choice questions, with separate `value` and `label`
- `required` — `None`, because the source does not specify required/optional status
- `timeframe` — baseline/current context
- `source` — `self_reported`, `measured`, or `clinician_entered`

Category metadata contains `category_id`, `category_name`, `description`,
`information_focus`, and `questions`.

## 2. Frontend use

A future API layer can expose:

```python
from ayush_questions import get_questionnaire_payload

payload = get_questionnaire_payload()
```

which returns:

```python
{"categories": [...]}
```

This module intentionally does not implement FastAPI endpoints.

The frontend should display `question_text` and, for choice questions, the option
`label`. It should use an input control appropriate to `answer_type`.

## 3. What the frontend sends

For a choice question, send the stable `options[].value`, not the display `label`.

Example:

```json
{
  "question_id": "prakriti_appetite_tendency_01",
  "answer": "strong"
}
```

The UI displays **Strong**, while the backend stores `strong`.

For `number`, `date`, and `free_text`, send the corresponding value.

## 4. Why `value` should be stored

`label` is display text and can change for UI wording or localization. The stable
machine-readable `value` is intended for programmatic storage and future logic.

`question_id` is semantic rather than positional, so frontend ordering can change
without changing the identity of an existing question.

## 5. Backend answer record

The questionnaire definition is not patient data and contains no database connection.

A future backend can store an answer conceptually as:

```json
{
  "patient_id": "...",
  "question_id": "prakriti_appetite_tendency_01",
  "answer": "strong",
  "source": "self_reported",
  "recorded_at": "...",
  "clinician_note": null
}
```

The exact database schema remains the backend/database teammate's responsibility.

## 6. Answer sources

The source document requires storing both answer and source.

- `self_reported` — supplied by the patient
- `measured` — objective measurement
- `clinician_entered` — entered by a clinician

Examples in this implementation:

- Prakriti questions → `self_reported`
- Pramana height/weight/waist → `measured`
- Pramana other measured values → `clinician_entered`
- Vaya life-stage context → `clinician_entered`

The source is metadata, not a patient-selectable field.

## 7. Timeframe/context

The source distinguishes usual baseline information from current information.

- Prakriti → `usual_baseline`
- Vikriti → `current`
- Sara → `usual_baseline`
- Samhanana → `usual_baseline`
- Pramana → `current_measurement`
- Satmya → `usual_baseline`
- Satva → `usual_baseline`
- Ahara Shakti → `usual_baseline`
- Vyayama Shakti → `usual_baseline`
- Vaya → `current`

This separation prevents current symptoms from being mixed with baseline characteristics.

## 8. Future scoring/interpretation

No Vata/Pitta/Kapha scoring, Ayurvedic classification, diagnosis, treatment recommendation,
or red-flag detection is implemented here.

A future validated clinical-logic layer can consume answers by `question_id` and stable
option `value` without changing the questionnaire definition.

This keeps assessment input separate from later clinical interpretation.

## 9. Complete integration example

The frontend asks:

> How would you describe your usual appetite when you are well?

The patient selects **Strong**.

The frontend sends:

```json
{
  "question_id": "prakriti_appetite_tendency_01",
  "answer": "strong"
}
```

The backend can create:

```json
{
  "patient_id": "...",
  "question_id": "prakriti_appetite_tendency_01",
  "answer": "strong",
  "source": "self_reported",
  "recorded_at": "...",
  "clinician_note": null
}
```

No clinical classification is produced by `ayush_questions.py`.

## 10. Ambiguities preserved from the source

Two items require explicit handling rather than silently inventing content:

1. **Vikriti — Symptom duration:** the source says `Free text/date or options`.
   This implementation uses the supported `free_text` type because the source does not
   choose one definitive representation. Production UI design should review this.

2. **Pramana — Waist circumference:** the source says `cm / Not available`.
   This implementation uses `number`, `unit: "cm"`, and `allow_not_available: True`, so
   the measurement remains numeric while an unavailable state can be represented as
   null/missing.

The source also contains mixed responses such as `Free text / structured food groups`
and `Free text / structured options`. These remain `free_text` because the supplied
document does not define the structure of those groups/options.

No new clinical content has been added to resolve these points.

## 11. Validation

Run:

```bash
pytest -q test_ayush_questions.py
```

The tests cover:

- all 10 categories
- category IDs
- question core fields
- unique question IDs
- choice options and option values
- valid sources
- valid timeframes
- number/date types
- helper functions
- non-empty question text
- overall structural validation

They intentionally do not test diagnosis, scoring, or clinical interpretation.

## 12. Verification report

- Number of categories: **10**
- Number of questions: **61**
- Questions by category:
  - Prakriti: **10**
  - Vikriti: **8**
  - Sara: **6**
  - Samhanana: **5**
  - Pramana: **5**
  - Satmya: **6**
  - Satva: **6**
  - Ahara Shakti: **6**
  - Vyayama Shakti: **6**
  - Vaya: **3**
- Any ambiguous items: **Vikriti symptom duration; Pramana waist circumference; mixed free-text/structured-food or activity responses**
- Any content not represented: **No questionnaire question or response label from the DOCX is intentionally omitted.**

The source document states that the questionnaire is for assessment/history-taking support and
should not by itself be presented as a medical diagnosis.
