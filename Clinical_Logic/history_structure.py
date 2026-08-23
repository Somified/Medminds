"""
Database-ready patient history structure for the MediMinds prototype.
 
This module stores patient information independently from where that
information originated. It does not contain database, OCR, chatbot, or
clinical decision logic.
 
Every stored entry carries:
  - "id": a unique identifier so the doctor dashboard (or any other
    consumer) can reference, edit, or delete a specific entry.
  - "recorded_at": when the entry was first added (UTC, ISO 8601),
    so entries can be placed on a chronological timeline.
  - "updated_at": None until the entry is edited via an update_*
    method, then the UTC ISO 8601 timestamp of the last edit.
"""
 
import uuid
from copy import deepcopy
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from typing import Any, Optional
 
 
VALID_SOURCES = {
    "frontend",
    "conversation",
    "document",
    "clinical_assessment",
}
 
# Sentinel used by update_* methods to distinguish "field not supplied"
# (leave unchanged) from "field explicitly set to None" (clear it).
_UNSET = object()
 
 
def _validate_text(value, field_name, required=True):
    if value is None:
        if required:
            raise ValueError(f"{field_name} is required.")
        return None
 
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string.")
 
    value = value.strip()
 
    if required and not value:
        raise ValueError(f"{field_name} cannot be empty.")
 
    return value or None
 
 
def _validate_source(source):
    source = _validate_text(source, "source")
 
    if source not in VALID_SOURCES:
        raise ValueError(
            "source must be one of: "
            + ", ".join(sorted(VALID_SOURCES))
        )
 
    return source
 
 
def _json_compatible(value, field_name="value"):
    """
    Return a deep JSON-compatible copy.
 
    Accepted values are dict, list, string, number, boolean, None,
    and tuples containing JSON-compatible values. Tuples are converted
    to lists.
    """
 
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
 
    if isinstance(value, tuple):
        value = list(value)
 
    if isinstance(value, list):
        return [
            _json_compatible(item, field_name)
            for item in value
        ]
 
    if isinstance(value, dict):
        result = {}
 
        for key, item in value.items():
            if not isinstance(key, str):
                raise ValueError(
                    f"{field_name} dictionary keys must be strings."
                )
 
            result[key] = _json_compatible(item, field_name)
 
        return result
 
    raise ValueError(
        f"{field_name} must contain only JSON-compatible data."
    )
 
 
def _serialize_optional(value):
    if value is None:
        return None
 
    if hasattr(value, "to_dict"):
        value = value.to_dict()
    elif is_dataclass(value):
        value = asdict(value)
 
    return _json_compatible(value)
 
 
def _new_id():
    return uuid.uuid4().hex
 
 
def _now_iso():
    return datetime.now(timezone.utc).isoformat()
 
 
def _base_fields():
    """Common bookkeeping fields attached to every stored entry."""
 
    return {
        "id": _new_id(),
        "recorded_at": _now_iso(),
        "updated_at": None,
    }
 
 
def _find_entry(collection, entry_id, label):
    entry_id = _validate_text(entry_id, "entry_id")
 
    for entry in collection:
        if entry.get("id") == entry_id:
            return entry
 
    raise ValueError(f"No {label} entry found with id '{entry_id}'.")
 
 
def _remove_entry(collection, entry_id, label):
    entry = _find_entry(collection, entry_id, label)
    collection.remove(entry)
    return deepcopy(entry)
 
 
class PatientHistory:
    """
    Aggregates patient information from frontend, conversation, documents,
    and completed ClinicalEngine assessments.
 
    The class intentionally stores data only. It does not make diagnoses
    or duplicate ClinicalEngine traversal/red-flag logic.
    """
 
    def __init__(self, patient_id=None):
        self.patient_id = _validate_text(
            patient_id,
            "patient_id",
            required=False,
        )
 
        self.symptoms = []
        self.medical_history = []
        self.medications = []
        self.allergies = []
        self.family_history = []
        self.social_history = []
        self.documents = []
        self.conversation_information = []
        self.clinical_assessments = []
 
    # ------------------------------------------------------------------
    # Symptoms
    # ------------------------------------------------------------------
 
    def add_symptom(
        self,
        name,
        source,
        duration=None,
        severity=None,
        document_id=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "name": _validate_text(name, "name"),
            "duration": _validate_text(
                duration,
                "duration",
                required=False,
            ),
            "severity": _validate_text(
                severity,
                "severity",
                required=False,
            ),
            "source": _validate_source(source),
            "document_id": _validate_text(
                document_id,
                "document_id",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.symptoms.append(entry)
        return deepcopy(entry)
 
    def update_symptom(
        self,
        entry_id,
        name=_UNSET,
        duration=_UNSET,
        severity=_UNSET,
        document_id=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(self.symptoms, entry_id, "symptom")
 
        if name is not _UNSET:
            entry["name"] = _validate_text(name, "name")
        if duration is not _UNSET:
            entry["duration"] = _validate_text(
                duration, "duration", required=False
            )
        if severity is not _UNSET:
            entry["severity"] = _validate_text(
                severity, "severity", required=False
            )
        if document_id is not _UNSET:
            entry["document_id"] = _validate_text(
                document_id, "document_id", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_symptom(self, entry_id):
        return _remove_entry(self.symptoms, entry_id, "symptom")
 
    # ------------------------------------------------------------------
    # Medical history
    # ------------------------------------------------------------------
 
    def add_medical_history(
        self,
        condition,
        source,
        document_id=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "condition": _validate_text(condition, "condition"),
            "source": _validate_source(source),
            "document_id": _validate_text(
                document_id,
                "document_id",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.medical_history.append(entry)
        return deepcopy(entry)
 
    def update_medical_history(
        self,
        entry_id,
        condition=_UNSET,
        document_id=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(
            self.medical_history, entry_id, "medical history"
        )
 
        if condition is not _UNSET:
            entry["condition"] = _validate_text(condition, "condition")
        if document_id is not _UNSET:
            entry["document_id"] = _validate_text(
                document_id, "document_id", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_medical_history(self, entry_id):
        return _remove_entry(
            self.medical_history, entry_id, "medical history"
        )
 
    # ------------------------------------------------------------------
    # Medications
    # ------------------------------------------------------------------
 
    def add_medication(
        self,
        name,
        source,
        dosage=None,
        frequency=None,
        document_id=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "name": _validate_text(name, "name"),
            "dosage": _validate_text(
                dosage,
                "dosage",
                required=False,
            ),
            "frequency": _validate_text(
                frequency,
                "frequency",
                required=False,
            ),
            "source": _validate_source(source),
            "document_id": _validate_text(
                document_id,
                "document_id",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.medications.append(entry)
        return deepcopy(entry)
 
    def update_medication(
        self,
        entry_id,
        name=_UNSET,
        dosage=_UNSET,
        frequency=_UNSET,
        document_id=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(self.medications, entry_id, "medication")
 
        if name is not _UNSET:
            entry["name"] = _validate_text(name, "name")
        if dosage is not _UNSET:
            entry["dosage"] = _validate_text(
                dosage, "dosage", required=False
            )
        if frequency is not _UNSET:
            entry["frequency"] = _validate_text(
                frequency, "frequency", required=False
            )
        if document_id is not _UNSET:
            entry["document_id"] = _validate_text(
                document_id, "document_id", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_medication(self, entry_id):
        return _remove_entry(self.medications, entry_id, "medication")
 
    # ------------------------------------------------------------------
    # Allergies
    # ------------------------------------------------------------------
 
    def add_allergy(
        self,
        name,
        source,
        reaction=None,
        document_id=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "name": _validate_text(name, "name"),
            "reaction": _validate_text(
                reaction,
                "reaction",
                required=False,
            ),
            "source": _validate_source(source),
            "document_id": _validate_text(
                document_id,
                "document_id",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.allergies.append(entry)
        return deepcopy(entry)
 
    def update_allergy(
        self,
        entry_id,
        name=_UNSET,
        reaction=_UNSET,
        document_id=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(self.allergies, entry_id, "allergy")
 
        if name is not _UNSET:
            entry["name"] = _validate_text(name, "name")
        if reaction is not _UNSET:
            entry["reaction"] = _validate_text(
                reaction, "reaction", required=False
            )
        if document_id is not _UNSET:
            entry["document_id"] = _validate_text(
                document_id, "document_id", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_allergy(self, entry_id):
        return _remove_entry(self.allergies, entry_id, "allergy")
 
    # ------------------------------------------------------------------
    # Family history
    # ------------------------------------------------------------------
 
    def add_family_history(
        self,
        information,
        source,
        document_id=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "information": _validate_text(
                information,
                "information",
            ),
            "source": _validate_source(source),
            "document_id": _validate_text(
                document_id,
                "document_id",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.family_history.append(entry)
        return deepcopy(entry)
 
    def update_family_history(
        self,
        entry_id,
        information=_UNSET,
        document_id=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(
            self.family_history, entry_id, "family history"
        )
 
        if information is not _UNSET:
            entry["information"] = _validate_text(
                information, "information"
            )
        if document_id is not _UNSET:
            entry["document_id"] = _validate_text(
                document_id, "document_id", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_family_history(self, entry_id):
        return _remove_entry(
            self.family_history, entry_id, "family history"
        )
 
    # ------------------------------------------------------------------
    # Social history
    # ------------------------------------------------------------------
 
    def add_social_history(
        self,
        information,
        source,
        document_id=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "information": _validate_text(
                information,
                "information",
            ),
            "source": _validate_source(source),
            "document_id": _validate_text(
                document_id,
                "document_id",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.social_history.append(entry)
        return deepcopy(entry)
 
    def update_social_history(
        self,
        entry_id,
        information=_UNSET,
        document_id=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(
            self.social_history, entry_id, "social history"
        )
 
        if information is not _UNSET:
            entry["information"] = _validate_text(
                information, "information"
            )
        if document_id is not _UNSET:
            entry["document_id"] = _validate_text(
                document_id, "document_id", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_social_history(self, entry_id):
        return _remove_entry(
            self.social_history, entry_id, "social history"
        )
 
    # ------------------------------------------------------------------
    # Documents
    # ------------------------------------------------------------------
 
    def add_document(
        self,
        document_id,
        source="document",
        document_type=None,
        reference=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "document_id": _validate_text(
                document_id,
                "document_id",
            ),
            "source": _validate_source(source),
            "document_type": _validate_text(
                document_type,
                "document_type",
                required=False,
            ),
            "reference": _validate_text(
                reference,
                "reference",
                required=False,
            ),
            "details": _json_compatible(details, "details"),
        }
 
        self.documents.append(entry)
        return deepcopy(entry)
 
    def update_document(
        self,
        entry_id,
        document_type=_UNSET,
        reference=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(self.documents, entry_id, "document")
 
        if document_type is not _UNSET:
            entry["document_type"] = _validate_text(
                document_type, "document_type", required=False
            )
        if reference is not _UNSET:
            entry["reference"] = _validate_text(
                reference, "reference", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_document(self, entry_id):
        return _remove_entry(self.documents, entry_id, "document")
 
    # ------------------------------------------------------------------
    # Conversation information
    # ------------------------------------------------------------------
 
    def add_conversation_information(
        self,
        information,
        category=None,
        details=None,
    ):
        entry = {
            **_base_fields(),
            "information": _validate_text(
                information,
                "information",
            ),
            "category": _validate_text(
                category,
                "category",
                required=False,
            ),
            "source": "conversation",
            "details": _json_compatible(details, "details"),
        }
 
        self.conversation_information.append(entry)
        return deepcopy(entry)
 
    def update_conversation_information(
        self,
        entry_id,
        information=_UNSET,
        category=_UNSET,
        details=_UNSET,
    ):
        entry = _find_entry(
            self.conversation_information,
            entry_id,
            "conversation information",
        )
 
        if information is not _UNSET:
            entry["information"] = _validate_text(
                information, "information"
            )
        if category is not _UNSET:
            entry["category"] = _validate_text(
                category, "category", required=False
            )
        if details is not _UNSET:
            entry["details"] = _json_compatible(details, "details")
 
        entry["updated_at"] = _now_iso()
        return deepcopy(entry)
 
    def remove_conversation_information(self, entry_id):
        return _remove_entry(
            self.conversation_information,
            entry_id,
            "conversation information",
        )
 
    # ------------------------------------------------------------------
    # Clinical assessments
    # ------------------------------------------------------------------
 
    def add_clinical_assessment(self, clinical_engine):
        """
        Store a completed ClinicalEngine assessment without modifying
        ClinicalEngine or reproducing its clinical logic.
 
        Clinical assessments are not editable via an update_* method
        (they are a generated clinical record, not free-text notes),
        but can be removed with remove_clinical_assessment if an entry
        was added by mistake.
        """
 
        required_methods = (
            "is_finished",
            "get_answer_history",
            "get_outcome",
            "get_red_flag_result",
        )
 
        if any(
            not callable(getattr(clinical_engine, method, None))
            for method in required_methods
        ):
            raise ValueError(
                "clinical_engine does not provide the expected "
                "ClinicalEngine interface."
            )
 
        if not clinical_engine.is_finished():
            raise ValueError(
                "Only completed clinical assessments can be added."
            )
 
        complaint = _validate_text(
            getattr(clinical_engine, "complaint", None),
            "complaint",
        )
 
        answer_history = _json_compatible(
            clinical_engine.get_answer_history(),
            "answer_history",
        )
 
        outcome = _json_compatible(
            clinical_engine.get_outcome(),
            "outcome",
        )
 
        red_flag = _serialize_optional(
            clinical_engine.get_red_flag_result()
        )
 
        entry = {
            **_base_fields(),
            "complaint": complaint,
            "source": "clinical_assessment",
            "answer_history": answer_history,
            "outcome": outcome,
            "red_flag": red_flag,
        }
 
        self.clinical_assessments.append(entry)
        return deepcopy(entry)
 
    def remove_clinical_assessment(self, entry_id):
        return _remove_entry(
            self.clinical_assessments, entry_id, "clinical assessment"
        )
 
    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
 
    def to_dict(self):
        """Return the complete JSON-serializable patient history."""
 
        return deepcopy({
            "patient_id": self.patient_id,
            "symptoms": self.symptoms,
            "medical_history": self.medical_history,
            "medications": self.medications,
            "allergies": self.allergies,
            "family_history": self.family_history,
            "social_history": self.social_history,
            "documents": self.documents,
            "conversation_information": self.conversation_information,
            "clinical_assessments": self.clinical_assessments,
        })
 
    @classmethod
    def from_dict(cls, data):
        """Reconstruct PatientHistory from data produced by to_dict()."""
 
        if not isinstance(data, dict):
            raise ValueError("data must be a dictionary.")
 
        history = cls(data.get("patient_id"))
 
        fields = (
            "symptoms",
            "medical_history",
            "medications",
            "allergies",
            "family_history",
            "social_history",
            "documents",
            "conversation_information",
            "clinical_assessments",
        )
 
        for field in fields:
            value = data.get(field, [])
 
            if not isinstance(value, list):
                raise ValueError(f"{field} must be a list.")
 
            setattr(
                history,
                field,
                _json_compatible(value, field),
            )
 
        return history
 