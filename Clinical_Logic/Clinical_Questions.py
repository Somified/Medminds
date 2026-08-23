

"""
Clinical question trees for the Mediminds prototype.

IMPORTANT:
This is a prototype decision-support system.
It is NOT a diagnostic system and should not replace
professional medical assessment.
"""


# ============================================================
# OUTCOME HELPERS
# ============================================================

def outcome(message, urgency):
    return {
        "message": message,
        "urgency": urgency,
    }


# ============================================================
# 1. FEVER
# ============================================================

FEVER_TREE = {
    "complaint": "Fever",

    "start": "fever_q1",

    "questions": {

        "fever_q1": {
            "id": "fever_q1",
            "question": "How long have you had the fever?",
            "type": "single_choice",
            "options": {
                "less_than_24h": "Less than 24 hours",
                "1_to_3_days": "1–3 days",
                "4_to_7_days": "4–7 days",
                "more_than_7_days": "More than 7 days",
            },
            "next": "fever_q2",
        },

        "fever_q2": {
            "id": "fever_q2",
            "question": "What is your highest measured temperature in °C?",
            "type": "number",
            "next": "fever_q3",
        },

        "fever_q3": {
            "id": "fever_q3",
            "question": "Are you having difficulty breathing?",
            "type": "yes_no",
            "yes": "fever_emergency_breathing",
            "no": "fever_q4",
        },

        "fever_q4": {
            "id": "fever_q4",
            "question": "Are you confused, unusually drowsy, or difficult to wake?",
            "type": "yes_no",
            "yes": "fever_emergency_confusion",
            "no": "fever_q5",
        },

        "fever_q5": {
            "id": "fever_q5",
            "question": "Do you have a severe headache or stiff neck?",
            "type": "yes_no",
            "yes": "fever_emergency_meningitis",
            "no": "fever_q6",
        },

        "fever_q6": {
            "id": "fever_q6",
            "question": "Do you have a new widespread rash?",
            "type": "yes_no",
            "yes": "fever_emergency_rash",
            "no": "fever_q7",
        },

        "fever_q7": {
            "id": "fever_q7",
            "question": "Do you have significant cough, chest pain, or other respiratory symptoms?",
            "type": "yes_no",
            "yes": "fever_urgent_respiratory",
            "no": "fever_q8",
        },

        "fever_q8": {
            "id": "fever_q8",
            "question": "Do you have significant vomiting, diarrhea, or abdominal symptoms?",
            "type": "yes_no",
            "yes": "fever_urgent_gastro",
            "no": "fever_q9",
        },

        "fever_q9": {
            "id": "fever_q9",
            "question": "Do you have burning urination, frequent urination, or flank pain?",
            "type": "yes_no",
            "yes": "fever_urgent_urinary",
            "no": "fever_q10",
        },

        "fever_q10": {
            "id": "fever_q10",
            "question": "Have you recently had significant travel, mosquito exposure, or another relevant infection exposure?",
            "type": "yes_no",
            "yes": "fever_soon_exposure",
            "no": "fever_routine",
        },
    },

    "outcomes": {

        "fever_emergency_breathing": outcome(
            "Fever with difficulty breathing requires urgent medical assessment.",
            "emergency",
        ),

        "fever_emergency_confusion": outcome(
            "Fever with altered mental status requires urgent medical assessment.",
            "emergency",
        ),

        "fever_emergency_meningitis": outcome(
            "Fever with severe headache or neck stiffness requires urgent medical assessment.",
            "emergency",
        ),

        "fever_emergency_rash": outcome(
            "Fever with a new widespread rash requires urgent medical assessment.",
            "emergency",
        ),

        "fever_urgent_respiratory": outcome(
            "Fever with significant respiratory symptoms should be assessed promptly.",
            "soon",
        ),

        "fever_urgent_gastro": outcome(
            "Fever with significant gastrointestinal symptoms should be assessed promptly.",
            "soon",
        ),

        "fever_urgent_urinary": outcome(
            "Fever with urinary or flank symptoms should be assessed promptly.",
            "soon",
        ),

        "fever_soon_exposure": outcome(
            "Fever following relevant travel or exposure should be medically evaluated.",
            "soon",
        ),

        "fever_routine": outcome(
            "No immediate red flags were identified. Monitor symptoms and seek medical care if they worsen or persist.",
            "routine",
        ),
    },
}


# ============================================================
# 2. ABDOMINAL PAIN
# ============================================================

ABDOMINAL_PAIN_TREE = {

    "complaint": "Abdominal Pain",

    "start": "abdominal_q1",

    "questions": {

        "abdominal_q1": {
            "id": "abdominal_q1",
            "question": "Where is the abdominal pain mainly located?",
            "type": "single_choice",
            "options": {
                "upper_right": "Upper right abdomen",
                "upper_left": "Upper left abdomen",
                "lower_right": "Lower right abdomen",
                "lower_left": "Lower left abdomen",
                "central": "Central abdomen",
                "lower": "Lower abdomen",
                "generalized": "All over the abdomen",
            },
            "next": "abdominal_q2",
        },

        "abdominal_q2": {
            "id": "abdominal_q2",
            "question": "Did the pain begin suddenly?",
            "type": "yes_no",
            "yes": "abdominal_q3",
            "no": "abdominal_q4",
        },

        "abdominal_q3": {
            "id": "abdominal_q3",
            "question": "Is the pain severe or rapidly worsening?",
            "type": "yes_no",
            "yes": "abdominal_emergency_severe",
            "no": "abdominal_q4",
        },

        "abdominal_q4": {
            "id": "abdominal_q4",
            "question": "Is your abdomen very hard, rigid, or extremely tender?",
            "type": "yes_no",
            "yes": "abdominal_emergency_rigid",
            "no": "abdominal_q5",
        },

        "abdominal_q5": {
            "id": "abdominal_q5",
            "question": "Are you repeatedly vomiting or unable to keep fluids down?",
            "type": "yes_no",
            "yes": "abdominal_urgent_vomiting",
            "no": "abdominal_q6",
        },

        "abdominal_q6": {
            "id": "abdominal_q6",
            "question": "Have you noticed blood in your vomit or stool, or black stool?",
            "type": "yes_no",
            "yes": "abdominal_emergency_bleeding",
            "no": "abdominal_q7",
        },

        "abdominal_q7": {
            "id": "abdominal_q7",
            "question": "Do you have fever or chills?",
            "type": "yes_no",
            "yes": "abdominal_urgent_infection",
            "no": "abdominal_routine",
        },
    },

    "outcomes": {

        "abdominal_emergency_severe": outcome(
            "Severe or rapidly worsening abdominal pain requires urgent medical assessment.",
            "emergency",
        ),

        "abdominal_emergency_rigid": outcome(
            "A rigid or extremely tender abdomen requires urgent medical assessment.",
            "emergency",
        ),

        "abdominal_emergency_bleeding": outcome(
            "Possible gastrointestinal bleeding requires urgent medical assessment.",
            "emergency",
        ),

        "abdominal_urgent_vomiting": outcome(
            "Persistent vomiting or inability to keep fluids down should be assessed promptly.",
            "soon",
        ),

        "abdominal_urgent_infection": outcome(
            "Abdominal pain with fever or chills should be assessed promptly.",
            "soon",
        ),

        "abdominal_routine": outcome(
            "No immediate red flags were identified. Monitor symptoms and seek care if they worsen or persist.",
            "routine",
        ),
    },
}


# ============================================================
# 3. HEADACHE
# ============================================================

HEADACHE_TREE = {

    "complaint": "Headache",

    "start": "headache_q1",

    "questions": {

        "headache_q1": {
            "id": "headache_q1",
            "question": "Did the headache reach maximum intensity suddenly?",
            "type": "yes_no",
            "yes": "headache_emergency_thunderclap",
            "no": "headache_q2",
        },

        "headache_q2": {
            "id": "headache_q2",
            "question": "Did the headache begin today or within the last few days?",
            "type": "single_choice",
            "options": {
                "today": "Today",
                "few_days": "Within a few days",
                "more_than_week": "More than a week ago",
            },
            "next": "headache_q3",
        },

        "headache_q3": {
            "id": "headache_q3",
            "question": "Do you have weakness, numbness, speech difficulty, confusion, or vision loss?",
            "type": "yes_no",
            "yes": "headache_emergency_neurological",
            "no": "headache_q4",
        },

        "headache_q4": {
            "id": "headache_q4",
            "question": "Do you have fever with neck stiffness?",
            "type": "yes_no",
            "yes": "headache_emergency_meningitis",
            "no": "headache_q5",
        },

        "headache_q5": {
            "id": "headache_q5",
            "question": "Do you have nausea or vomiting with the headache?",
            "type": "yes_no",
            "yes": "headache_q6",
            "no": "headache_routine",
        },

        "headache_q6": {
            "id": "headache_q6",
            "question": "Are light or sound particularly uncomfortable during the headache?",
            "type": "yes_no",
            "yes": "headache_routine",
            "no": "headache_soon",
        },
    },

    "outcomes": {

        "headache_emergency_thunderclap": outcome(
            "A sudden severe headache reaching maximum intensity rapidly requires urgent medical assessment.",
            "emergency",
        ),

        "headache_emergency_neurological": outcome(
            "Headache with neurological symptoms requires urgent medical assessment.",
            "emergency",
        ),

        "headache_emergency_meningitis": outcome(
            "Headache with fever and neck stiffness requires urgent medical assessment.",
            "emergency",
        ),

        "headache_routine": outcome(
            "No immediate red flags were identified. Monitor symptoms and seek medical care if they persist or worsen.",
            "routine",
        ),

        "headache_soon": outcome(
            "The headache pattern should be assessed if persistent, recurrent, or worsening.",
            "soon",
        ),
    },
}


# ============================================================
# 4. COUGH
# ============================================================

COUGH_TREE = {

    "complaint": "Cough",

    "start": "cough_q1",

    "questions": {

        "cough_q1": {
            "id": "cough_q1",
            "question": "How long have you had the cough?",
            "type": "single_choice",
            "options": {
                "less_than_1_week": "Less than 1 week",
                "1_to_3_weeks": "1–3 weeks",
                "more_than_3_weeks": "More than 3 weeks",
            },
            "next": "cough_q2",
        },

        "cough_q2": {
            "id": "cough_q2",
            "question": "Are you having significant difficulty breathing?",
            "type": "yes_no",
            "yes": "cough_emergency_breathing",
            "no": "cough_q3",
        },

        "cough_q3": {
            "id": "cough_q3",
            "question": "Are you coughing up blood?",
            "type": "yes_no",
            "yes": "cough_emergency_blood",
            "no": "cough_q4",
        },

        "cough_q4": {
            "id": "cough_q4",
            "question": "Do you have significant chest pain?",
            "type": "yes_no",
            "yes": "cough_urgent_chest",
            "no": "cough_q5",
        },

        "cough_q5": {
            "id": "cough_q5",
            "question": "Do you have a high fever or severe weakness?",
            "type": "yes_no",
            "yes": "cough_urgent_infection",
            "no": "cough_q6",
        },

        "cough_q6": {
            "id": "cough_q6",
            "question": "Is the cough persistent or recurrent?",
            "type": "yes_no",
            "yes": "cough_soon",
            "no": "cough_routine",
        },
    },

    "outcomes": {

        "cough_emergency_breathing": outcome(
            "Cough with significant breathing difficulty requires urgent medical assessment.",
            "emergency",
        ),

        "cough_emergency_blood": outcome(
            "Coughing up blood requires medical assessment, especially if significant or recurrent.",
            "emergency",
        ),

        "cough_urgent_chest": outcome(
            "Cough with significant chest pain should be assessed promptly.",
            "soon",
        ),

        "cough_urgent_infection": outcome(
            "Cough with high fever or severe weakness should be assessed promptly.",
            "soon",
        ),

        "cough_soon": outcome(
            "A persistent or recurrent cough should be medically evaluated.",
            "soon",
        ),

        "cough_routine": outcome(
            "No immediate red flags were identified. Monitor symptoms and seek care if they persist or worsen.",
            "routine",
        ),
    },
}


# ============================================================
# 5. DIFFICULTY BREATHING
# ============================================================

DIFFICULTY_BREATHING_TREE = {

    "complaint": "Difficulty Breathing",

    "start": "breathing_q1",

    "questions": {

        "breathing_q1": {
            "id": "breathing_q1",
            "question": "Are you having severe difficulty breathing right now?",
            "type": "yes_no",
            "yes": "breathing_emergency_severe",
            "no": "breathing_q2",
        },

        "breathing_q2": {
            "id": "breathing_q2",
            "question": "Did the breathing difficulty start suddenly?",
            "type": "yes_no",
            "yes": "breathing_q3",
            "no": "breathing_q4",
        },

        "breathing_q3": {
            "id": "breathing_q3",
            "question": "Do you also have chest pain, fainting, blue lips, or severe weakness?",
            "type": "yes_no",
            "yes": "breathing_emergency",
            "no": "breathing_urgent",
        },

        "breathing_q4": {
            "id": "breathing_q4",
            "question": "Is the breathing difficulty getting worse?",
            "type": "yes_no",
            "yes": "breathing_urgent",
            "no": "breathing_q5",
        },

        "breathing_q5": {
            "id": "breathing_q5",
            "question": "Do you have fever, cough, wheezing, or other respiratory symptoms?",
            "type": "yes_no",
            "yes": "breathing_soon",
            "no": "breathing_routine",
        },
    },

    "outcomes": {

        "breathing_emergency_severe": outcome(
            "Severe difficulty breathing requires immediate emergency medical attention.",
            "emergency",
        ),

        "breathing_emergency": outcome(
            "Breathing difficulty with concerning associated symptoms requires immediate assessment.",
            "emergency",
        ),

        "breathing_urgent": outcome(
            "Worsening or sudden breathing difficulty should be assessed promptly.",
            "soon",
        ),

        "breathing_soon": outcome(
            "Breathing difficulty with respiratory symptoms should be medically assessed.",
            "soon",
        ),

        "breathing_routine": outcome(
            "No immediate red flags were identified. Seek medical care if symptoms worsen or persist.",
            "routine",
        ),
    },
}


# ============================================================
# 6. CHEST PAIN
# ============================================================

CHEST_PAIN_TREE = {

    "complaint": "Chest Pain",

    "start": "chest_q1",

    "questions": {

        "chest_q1": {
            "id": "chest_q1",
            "question": "Is the chest pain severe, crushing, or pressure-like?",
            "type": "yes_no",
            "yes": "chest_q2",
            "no": "chest_q3",
        },

        "chest_q2": {
            "id": "chest_q2",
            "question": "Is the pain associated with sweating, nausea, shortness of breath, or fainting?",
            "type": "yes_no",
            "yes": "chest_emergency",
            "no": "chest_urgent",
        },

        "chest_q3": {
            "id": "chest_q3",
            "question": "Does the pain spread to the arm, shoulder, jaw, neck, or back?",
            "type": "yes_no",
            "yes": "chest_emergency_radiation",
            "no": "chest_q4",
        },

        "chest_q4": {
            "id": "chest_q4",
            "question": "Is the pain triggered by physical activity?",
            "type": "yes_no",
            "yes": "chest_urgent",
            "no": "chest_q5",
        },

        "chest_q5": {
            "id": "chest_q5",
            "question": "Is the pain clearly reproducible by touching or moving the chest?",
            "type": "yes_no",
            "yes": "chest_routine",
            "no": "chest_soon",
        },
    },

    "outcomes": {

        "chest_emergency": outcome(
            "Chest pain with concerning associated symptoms requires immediate medical assessment.",
            "emergency",
        ),

        "chest_emergency_radiation": outcome(
            "Chest pain radiating to other areas can indicate a serious condition and requires urgent assessment.",
            "emergency",
        ),

        "chest_urgent": outcome(
            "The chest pain pattern warrants prompt medical evaluation.",
            "soon",
        ),

        "chest_routine": outcome(
            "The pain may be related to the chest wall, but seek medical care if it persists or changes.",
            "routine",
        ),

        "chest_soon": outcome(
            "Unexplained chest pain should be medically assessed.",
            "soon",
        ),
    },
}


# ============================================================
# 7. VOMITING
# ============================================================

VOMITING_TREE = {

    "complaint": "Vomiting",

    "start": "vomiting_q1",

    "questions": {

        "vomiting_q1": {
            "id": "vomiting_q1",
            "question": "How long have you been vomiting?",
            "type": "single_choice",
            "options": {
                "less_than_24h": "Less than 24 hours",
                "1_to_3_days": "1–3 days",
                "more_than_3_days": "More than 3 days",
            },
            "next": "vomiting_q2",
        },

        "vomiting_q2": {
            "id": "vomiting_q2",
            "question": "Is there blood or coffee-ground material in the vomit?",
            "type": "yes_no",
            "yes": "vomiting_emergency_blood",
            "no": "vomiting_q3",
        },

        "vomiting_q3": {
            "id": "vomiting_q3",
            "question": "Are you unable to keep fluids down?",
            "type": "yes_no",
            "yes": "vomiting_urgent_dehydration",
            "no": "vomiting_q4",
        },

        "vomiting_q4": {
            "id": "vomiting_q4",
            "question": "Do you have severe abdominal pain?",
            "type": "yes_no",
            "yes": "vomiting_emergency_abdominal",
            "no": "vomiting_q5",
        },

        "vomiting_q5": {
            "id": "vomiting_q5",
            "question": "Do you have fever or significant diarrhea?",
            "type": "yes_no",
            "yes": "vomiting_soon",
            "no": "vomiting_routine",
        },
    },

    "outcomes": {

        "vomiting_emergency_blood": outcome(
            "Blood or coffee-ground material in vomit requires urgent medical assessment.",
            "emergency",
        ),

        "vomiting_emergency_abdominal": outcome(
            "Vomiting with severe abdominal pain requires urgent medical assessment.",
            "emergency",
        ),

        "vomiting_urgent_dehydration": outcome(
            "Inability to keep fluids down creates a risk of dehydration and should be assessed promptly.",
            "soon",
        ),

        "vomiting_soon": outcome(
            "Vomiting with fever or significant diarrhea should be assessed if persistent or worsening.",
            "soon",
        ),

        "vomiting_routine": outcome(
            "No immediate red flags were identified. Maintain hydration and seek care if symptoms worsen or persist.",
            "routine",
        ),
    },
}


# ============================================================
# 8. NAUSEA
# ============================================================

NAUSEA_TREE = {

    "complaint": "Nausea",

    "start": "nausea_q1",

    "questions": {

        "nausea_q1": {
            "id": "nausea_q1",
            "question": "How long have you had nausea?",
            "type": "single_choice",
            "options": {
                "less_than_24h": "Less than 24 hours",
                "1_to_3_days": "1–3 days",
                "more_than_3_days": "More than 3 days",
            },
            "next": "nausea_q2",
        },

        "nausea_q2": {
            "id": "nausea_q2",
            "question": "Are you vomiting blood or coffee-ground material?",
            "type": "yes_no",
            "yes": "nausea_emergency_blood",
            "no": "nausea_q3",
        },

        "nausea_q3": {
            "id": "nausea_q3",
            "question": "Do you have severe abdominal pain?",
            "type": "yes_no",
            "yes": "nausea_emergency_abdominal",
            "no": "nausea_q4",
        },

        "nausea_q4": {
            "id": "nausea_q4",
            "question": "Do you have chest pain or significant difficulty breathing?",
            "type": "yes_no",
            "yes": "nausea_emergency_chest",
            "no": "nausea_q5",
        },

        "nausea_q5": {
            "id": "nausea_q5",
            "question": "Are you unable to keep fluids down?",
            "type": "yes_no",
            "yes": "nausea_urgent_dehydration",
            "no": "nausea_q6",
        },

        "nausea_q6": {
            "id": "nausea_q6",
            "question": "Is the nausea persistent or recurrent?",
            "type": "yes_no",
            "yes": "nausea_soon",
            "no": "nausea_routine",
        },
    },

    "outcomes": {

        "nausea_emergency_blood": outcome(
            "Blood or coffee-ground material in vomit requires urgent medical assessment.",
            "emergency",
        ),

        "nausea_emergency_abdominal": outcome(
            "Nausea with severe abdominal pain requires urgent assessment.",
            "emergency",
        ),

        "nausea_emergency_chest": outcome(
            "Nausea associated with chest pain or significant breathing difficulty requires urgent assessment.",
            "emergency",
        ),

        "nausea_urgent_dehydration": outcome(
            "Inability to keep fluids down creates a risk of dehydration and should be assessed promptly.",
            "soon",
        ),

        "nausea_soon": outcome(
            "Persistent or recurrent nausea should be medically evaluated.",
            "soon",
        ),

        "nausea_routine": outcome(
            "No immediate red flags were identified. Monitor symptoms and seek care if they persist or worsen.",
            "routine",
        ),
    },
}


# ============================================================
# 9. DIARRHEA
# ============================================================

DIARRHEA_TREE = {

    "complaint": "Diarrhea",

    "start": "diarrhea_q1",

    "questions": {

        "diarrhea_q1": {
            "id": "diarrhea_q1",
            "question": "How long have you had diarrhea?",
            "type": "single_choice",
            "options": {
                "less_than_2_days": "Less than 2 days",
                "2_to_7_days": "2–7 days",
                "more_than_7_days": "More than 7 days",
            },
            "next": "diarrhea_q2",
        },

        "diarrhea_q2": {
            "id": "diarrhea_q2",
            "question": "Is there visible blood in the stool?",
            "type": "yes_no",
            "yes": "diarrhea_emergency_blood",
            "no": "diarrhea_q3",
        },

        "diarrhea_q3": {
            "id": "diarrhea_q3",
            "question": "Are the stools black or tar-like?",
            "type": "yes_no",
            "yes": "diarrhea_emergency_black",
            "no": "diarrhea_q4",
        },

        "diarrhea_q4": {
            "id": "diarrhea_q4",
            "question": "Do you have signs of significant dehydration such as very little urine, severe dizziness, or inability to drink?",
            "type": "yes_no",
            "yes": "diarrhea_urgent_dehydration",
            "no": "diarrhea_q5",
        },

        "diarrhea_q5": {
            "id": "diarrhea_q5",
            "question": "Do you have severe abdominal pain or high fever?",
            "type": "yes_no",
            "yes": "diarrhea_urgent",
            "no": "diarrhea_q6",
        },

        "diarrhea_q6": {
            "id": "diarrhea_q6",
            "question": "Has the diarrhea persisted for more than a week?",
            "type": "yes_no",
            "yes": "diarrhea_soon",
            "no": "diarrhea_routine",
        },
    },

    "outcomes": {

        "diarrhea_emergency_blood": outcome(
            "Bloody diarrhea requires urgent medical assessment.",
            "emergency",
        ),

        "diarrhea_emergency_black": outcome(
            "Black or tar-like stool can indicate gastrointestinal bleeding and requires urgent assessment.",
            "emergency",
        ),

        "diarrhea_urgent_dehydration": outcome(
            "Significant dehydration requires prompt medical assessment.",
            "soon",
        ),

        "diarrhea_urgent": outcome(
            "Diarrhea with severe abdominal pain or high fever should be assessed promptly.",
            "soon",
        ),

        "diarrhea_soon": outcome(
            "Persistent diarrhea should be medically evaluated.",
            "soon",
        ),

        "diarrhea_routine": outcome(
            "No immediate red flags were identified. Maintain hydration and seek care if symptoms persist or worsen.",
            "routine",
        ),
    },
}


# ============================================================
# 10. BACK PAIN
# ============================================================

BACK_PAIN_TREE = {

    "complaint": "Back Pain",

    "start": "back_q1",

    "questions": {

        "back_q1": {
            "id": "back_q1",
            "question": "Where is the pain mainly located?",
            "type": "single_choice",
            "options": {
                "upper": "Upper back",
                "middle": "Middle back",
                "lower": "Lower back",
                "flank": "Side/flank",
            },
            "next": "back_q2",
        },

        "back_q2": {
            "id": "back_q2",
            "question": "Did the pain begin after significant injury or trauma?",
            "type": "yes_no",
            "yes": "back_urgent_trauma",
            "no": "back_q3",
        },

        "back_q3": {
            "id": "back_q3",
            "question": "Do you have new weakness, numbness, or difficulty walking?",
            "type": "yes_no",
            "yes": "back_q4",
            "no": "back_q5",
        },

        "back_q4": {
            "id": "back_q4",
            "question": "Do you have new loss of bladder or bowel control, or numbness around the groin/saddle area?",
            "type": "yes_no",
            "yes": "back_emergency_cord",
            "no": "back_urgent_neurological",
        },

        "back_q5": {
            "id": "back_q5",
            "question": "Do you have fever or feel significantly unwell?",
            "type": "yes_no",
            "yes": "back_urgent_infection",
            "no": "back_q6",
        },

        "back_q6": {
            "id": "back_q6",
            "question": "Do you have urinary symptoms or severe flank pain?",
            "type": "yes_no",
            "yes": "back_soon_urinary",
            "no": "back_routine",
        },
    },

    "outcomes": {

        "back_urgent_trauma": outcome(
            "Back pain following significant trauma should be medically assessed promptly.",
            "soon",
        ),

        "back_emergency_cord": outcome(
            "Back pain with new bladder/bowel dysfunction or saddle numbness requires urgent emergency assessment.",
            "emergency",
        ),

        "back_urgent_neurological": outcome(
            "Back pain with new neurological symptoms should be assessed promptly.",
            "soon",
        ),

        "back_urgent_infection": outcome(
            "Back pain with fever or significant systemic illness should be assessed promptly.",
            "soon",
        ),

        "back_soon_urinary": outcome(
            "Back/flank pain with urinary symptoms should be medically evaluated.",
            "soon",
        ),

        "back_routine": outcome(
            "No immediate red flags were identified. Monitor symptoms and seek care if they persist or worsen.",
            "routine",
        ),
    },
}


# ============================================================
# MASTER TREE DICTIONARY
# ============================================================

QUESTION_TREES = {

    "fever": FEVER_TREE,

    "abdominal_pain": ABDOMINAL_PAIN_TREE,

    "headache": HEADACHE_TREE,

    "cough": COUGH_TREE,

    "difficulty_breathing": DIFFICULTY_BREATHING_TREE,

    "chest_pain": CHEST_PAIN_TREE,

    "vomiting": VOMITING_TREE,

    "nausea": NAUSEA_TREE,

    "diarrhea": DIARRHEA_TREE,

    "back_pain": BACK_PAIN_TREE,
}


# ============================================================
# COMPLAINT ALIASES
# ============================================================

COMPLAINT_ALIASES = {

    # Fever
    "fever": "fever",
    "temperature": "fever",
    "high temperature": "fever",

    # Abdominal pain
    "abdominal_pain": "abdominal_pain",
    "abdominal pain": "abdominal_pain",
    "stomach pain": "abdominal_pain",
    "belly pain": "abdominal_pain",
    "stomach ache": "abdominal_pain",

    # Headache
    "headache": "headache",
    "head pain": "headache",

    # Cough
    "cough": "cough",

    # Difficulty breathing
    "difficulty_breathing": "difficulty_breathing",
    "difficulty breathing": "difficulty_breathing",
    "shortness of breath": "difficulty_breathing",
    "breathlessness": "difficulty_breathing",
    "breathing difficulty": "difficulty_breathing",
    "sob": "difficulty_breathing",

    # Chest pain
    "chest_pain": "chest_pain",
    "chest pain": "chest_pain",

    # Vomiting
    "vomiting": "vomiting",
    "throwing up": "vomiting",
    "vomit": "vomiting",

    # Nausea
    "nausea": "nausea",
    "feeling nauseous": "nausea",

    # Diarrhea
    "diarrhea": "diarrhea",
    "diarrhoea": "diarrhea",
    "loose motions": "diarrhea",
    "loose stools": "diarrhea",

    # Back pain
    "back_pain": "back_pain",
    "back pain": "back_pain",
}


# ============================================================
# GET QUESTION TREE
# ============================================================

def get_question_tree(complaint):
    """
    Return the appropriate question tree.

    Accepts:
        - canonical names
        - aliases
        - different capitalization
        - surrounding whitespace
    """

    if not isinstance(complaint, str):
        return None

    normalized = complaint.strip().lower()

    # Direct canonical lookup.
    if normalized in QUESTION_TREES:
        return QUESTION_TREES[normalized]

    # Alias lookup.
    canonical_name = COMPLAINT_ALIASES.get(normalized)

    if canonical_name is None:
        return None

    return QUESTION_TREES.get(canonical_name)