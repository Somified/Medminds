import json
import unittest
 
from clinical_engine import ClinicalEngine
from history_structure import PatientHistory
 
 
class PatientHistoryTests(unittest.TestCase):
 
    def test_initializes_correctly_and_supports_partial_history(self):
        history = PatientHistory()
 
        self.assertEqual(history.patient_id, None)
        self.assertEqual(history.symptoms, [])
        self.assertEqual(history.clinical_assessments, [])
 
        data = history.to_dict()
        self.assertIsNone(data["patient_id"])
        self.assertEqual(data["medications"], [])
 
    def test_add_symptom(self):
        history = PatientHistory("patient-1")
 
        history.add_symptom(
            "fever",
            source="conversation",
            duration="3 days",
            severity="moderate",
        )
 
        self.assertEqual(len(history.symptoms), 1)
        self.assertEqual(history.symptoms[0]["name"], "fever")
        self.assertEqual(history.symptoms[0]["source"], "conversation")
 
    def test_add_medical_history(self):
        history = PatientHistory()
 
        history.add_medical_history(
            "hypertension",
            source="document",
            document_id="doc-1",
        )
 
        self.assertEqual(
            history.medical_history[0]["condition"],
            "hypertension",
        )
 
    def test_add_medication(self):
        history = PatientHistory()
 
        history.add_medication(
            "paracetamol",
            source="frontend",
            dosage="500 mg",
            frequency="twice daily",
        )
 
        self.assertEqual(
            history.medications[0]["name"],
            "paracetamol",
        )
 
    def test_add_allergy(self):
        history = PatientHistory()
 
        history.add_allergy(
            "penicillin",
            source="document",
            reaction="rash",
        )
 
        self.assertEqual(history.allergies[0]["reaction"], "rash")
 
    def test_add_document(self):
        history = PatientHistory()
 
        history.add_document(
            "report-123",
            document_type="lab_report",
            reference="stored-document-reference",
        )
 
        self.assertEqual(history.documents[0]["document_id"], "report-123")
        self.assertEqual(history.documents[0]["source"], "document")
 
    def test_add_conversation_information(self):
        history = PatientHistory()
 
        history.add_conversation_information(
            "Patient reports symptoms worsen at night.",
            category="symptom_detail",
        )
 
        entry = history.conversation_information[0]
        self.assertEqual(entry["source"], "conversation")
        self.assertEqual(entry["category"], "symptom_detail")
 
    def test_multiple_sources_can_coexist_without_erasing_information(self):
        history = PatientHistory()
 
        history.add_symptom("cough", source="frontend")
        history.add_symptom(
            "fever",
            source="conversation",
            duration="2 days",
        )
        history.add_medical_history(
            "asthma",
            source="document",
            document_id="doc-2",
        )
 
        self.assertEqual(len(history.symptoms), 2)
        self.assertEqual(len(history.medical_history), 1)
 
    def test_completed_clinical_assessment_preserves_answer_history(self):
        engine = ClinicalEngine("fever")
 
        while not engine.is_finished():
            question = engine.get_current_question()
 
            if question["type"] == "yes_no":
                answer = "no"
            elif question["type"] == "single_choice":
                answer = next(iter(question["options"]))
            else:
                answer = "38.5"
 
            engine.submit_answer(answer)
 
        original_answer_history = engine.get_answer_history()
 
        history = PatientHistory()
        assessment = history.add_clinical_assessment(engine)
 
        self.assertEqual(
            assessment["answer_history"],
            original_answer_history,
        )
        self.assertEqual(
            history.clinical_assessments[0]["outcome"],
            engine.get_outcome(),
        )
        self.assertEqual(
            history.clinical_assessments[0]["source"],
            "clinical_assessment",
        )
 
    def test_unfinished_assessment_is_rejected(self):
        history = PatientHistory()
        engine = ClinicalEngine("fever")
 
        with self.assertRaises(ValueError):
            history.add_clinical_assessment(engine)
 
    def test_to_dict_is_json_compatible(self):
        history = PatientHistory("patient-1")
 
        history.add_symptom(
            "headache",
            source="conversation",
            details={"reported": True, "scores": [3, 5]},
        )
 
        serialized = history.to_dict()
        encoded = json.dumps(serialized)
        decoded = json.loads(encoded)
 
        self.assertEqual(decoded["patient_id"], "patient-1")
 
    def test_from_dict_round_trip(self):
        history = PatientHistory("patient-9")
        history.add_symptom("nausea", source="frontend")
        history.add_allergy("latex", source="document")
 
        restored = PatientHistory.from_dict(history.to_dict())
 
        self.assertEqual(restored.to_dict(), history.to_dict())
 
    def test_invalid_inputs_are_handled(self):
        history = PatientHistory()
 
        with self.assertRaises(ValueError):
            history.add_symptom("", source="frontend")
 
        with self.assertRaises(ValueError):
            history.add_symptom("fever", source="unknown")
 
        with self.assertRaises(ValueError):
            history.add_document("")
 
        with self.assertRaises(ValueError):
            PatientHistory.from_dict({"symptoms": "not-a-list"})
 
    # ----------------------------------------------------------------
    # New: entry IDs and timestamps
    # ----------------------------------------------------------------
 
    def test_entries_get_unique_ids_and_recorded_at_timestamp(self):
        history = PatientHistory()
 
        first = history.add_symptom("cough", source="frontend")
        second = history.add_symptom("fever", source="conversation")
 
        self.assertIsNotNone(first["id"])
        self.assertIsNotNone(second["id"])
        self.assertNotEqual(first["id"], second["id"])
 
        self.assertIsNotNone(first["recorded_at"])
        self.assertIsNone(first["updated_at"])
 
    def test_ids_are_unique_across_all_categories(self):
        history = PatientHistory()
 
        ids = [
            history.add_symptom("cough", source="frontend")["id"],
            history.add_medical_history(
                "asthma", source="document"
            )["id"],
            history.add_medication("paracetamol", source="frontend")["id"],
            history.add_allergy("latex", source="document")["id"],
            history.add_family_history(
                "father has diabetes", source="conversation"
            )["id"],
            history.add_social_history(
                "non-smoker", source="conversation"
            )["id"],
            history.add_document("report-1")["id"],
            history.add_conversation_information("notes here")["id"],
        ]
 
        self.assertEqual(len(ids), len(set(ids)))
 
    # ----------------------------------------------------------------
    # New: document_id on family/social history
    # ----------------------------------------------------------------
 
    def test_family_history_supports_document_id(self):
        history = PatientHistory()
 
        entry = history.add_family_history(
            "mother has hypertension",
            source="document",
            document_id="doc-5",
        )
 
        self.assertEqual(entry["document_id"], "doc-5")
 
    def test_social_history_supports_document_id(self):
        history = PatientHistory()
 
        entry = history.add_social_history(
            "occasional alcohol use",
            source="document",
            document_id="doc-6",
        )
 
        self.assertEqual(entry["document_id"], "doc-6")
 
    # ----------------------------------------------------------------
    # New: update_* methods
    # ----------------------------------------------------------------
 
    def test_update_symptom_changes_only_provided_fields(self):
        history = PatientHistory()
        entry = history.add_symptom(
            "cough", source="frontend", severity="mild"
        )
 
        updated = history.update_symptom(
            entry["id"], severity="severe"
        )
 
        self.assertEqual(updated["name"], "cough")
        self.assertEqual(updated["severity"], "severe")
        self.assertIsNotNone(updated["updated_at"])
        self.assertEqual(history.symptoms[0]["severity"], "severe")
 
    def test_update_medical_history(self):
        history = PatientHistory()
        entry = history.add_medical_history(
            "asthma", source="document", document_id="doc-1"
        )
 
        updated = history.update_medical_history(
            entry["id"], condition="asthma - moderate"
        )
 
        self.assertEqual(updated["condition"], "asthma - moderate")
        self.assertEqual(updated["document_id"], "doc-1")
 
    def test_update_medication(self):
        history = PatientHistory()
        entry = history.add_medication(
            "paracetamol", source="frontend", dosage="500 mg"
        )
 
        updated = history.update_medication(
            entry["id"], dosage="650 mg", frequency="thrice daily"
        )
 
        self.assertEqual(updated["dosage"], "650 mg")
        self.assertEqual(updated["frequency"], "thrice daily")
 
    def test_update_allergy(self):
        history = PatientHistory()
        entry = history.add_allergy("penicillin", source="document")
 
        updated = history.update_allergy(entry["id"], reaction="hives")
 
        self.assertEqual(updated["reaction"], "hives")
 
    def test_update_family_history(self):
        history = PatientHistory()
        entry = history.add_family_history(
            "father has diabetes", source="conversation"
        )
 
        updated = history.update_family_history(
            entry["id"], information="father has type 2 diabetes"
        )
 
        self.assertEqual(
            updated["information"], "father has type 2 diabetes"
        )
 
    def test_update_social_history(self):
        history = PatientHistory()
        entry = history.add_social_history(
            "smoker", source="conversation"
        )
 
        updated = history.update_social_history(
            entry["id"], information="ex-smoker, quit 2 years ago"
        )
 
        self.assertEqual(
            updated["information"], "ex-smoker, quit 2 years ago"
        )
 
    def test_update_document(self):
        history = PatientHistory()
        entry = history.add_document("report-123")
 
        updated = history.update_document(
            entry["id"], document_type="lab_report"
        )
 
        self.assertEqual(updated["document_type"], "lab_report")
 
    def test_update_conversation_information(self):
        history = PatientHistory()
        entry = history.add_conversation_information(
            "worsens at night", category="symptom_detail"
        )
 
        updated = history.update_conversation_information(
            entry["id"], information="worsens at night and after meals"
        )
 
        self.assertEqual(
            updated["information"],
            "worsens at night and after meals",
        )
 
    def test_update_unknown_id_raises(self):
        history = PatientHistory()
        history.add_symptom("cough", source="frontend")
 
        with self.assertRaises(ValueError):
            history.update_symptom("does-not-exist", severity="severe")
 
    # ----------------------------------------------------------------
    # New: remove_* methods
    # ----------------------------------------------------------------
 
    def test_remove_symptom(self):
        history = PatientHistory()
        entry = history.add_symptom("cough", source="frontend")
        history.add_symptom("fever", source="conversation")
 
        removed = history.remove_symptom(entry["id"])
 
        self.assertEqual(removed["name"], "cough")
        self.assertEqual(len(history.symptoms), 1)
        self.assertEqual(history.symptoms[0]["name"], "fever")
 
    def test_remove_unknown_id_raises(self):
        history = PatientHistory()
 
        with self.assertRaises(ValueError):
            history.remove_symptom("does-not-exist")
 
    def test_remove_clinical_assessment(self):
        engine = ClinicalEngine("fever")
 
        while not engine.is_finished():
            question = engine.get_current_question()
            if question["type"] == "yes_no":
                answer = "no"
            elif question["type"] == "single_choice":
                answer = next(iter(question["options"]))
            else:
                answer = "38.5"
            engine.submit_answer(answer)
 
        history = PatientHistory()
        assessment = history.add_clinical_assessment(engine)
 
        removed = history.remove_clinical_assessment(assessment["id"])
 
        self.assertEqual(removed["complaint"], engine.complaint)
        self.assertEqual(history.clinical_assessments, [])
 
    # ----------------------------------------------------------------
    # Round trip still holds with the new fields
    # ----------------------------------------------------------------
 
    def test_from_dict_round_trip_with_updates(self):
        history = PatientHistory("patient-9")
        entry = history.add_symptom("nausea", source="frontend")
        history.update_symptom(entry["id"], severity="mild")
        history.add_allergy(
            "latex", source="document", document_id="doc-3"
        )
 
        restored = PatientHistory.from_dict(history.to_dict())
 
        self.assertEqual(restored.to_dict(), history.to_dict())
 
 
if __name__ == "__main__":
    unittest.main()
 