import React, { useEffect, useState } from "react";

const EMPTY_CASE = {
  patient: {
    type: "new",
    verificationMethod: "ABHA ID",
    verificationValue: "",
    verified: false,
    phone: "",
    password: "",
    authMethod: "password",
    otp: "",

    abhaId: "",
    name: "",
    age: "",
    gender: "",
    language: "English"
  },
  consent: false,
  documents: [],
  aiInterview: {
    messages: [],
    transcript: "",
    completed: false,
    redflag: null,
    summary: null,
    clinicalOutcome: null,
    currentQuestion: null,
    questionHistory: [],
    triageLocked: false
  },
  // Single source of truth for information already captured anywhere in the case.
  // The AI, clinical engine, manual frontend and AYUSH questionnaire all read this.
  answeredQuestions: {},
  answeredFacts: {},
  mode: "Allopathic",
  chiefComplaint: [],
  otherComplaint: "",
  hpi: {
    onset: "",
    duration: "",
    character: "",
    radiation: "",
    aggravating: "",
    relieving: "",
    associatedSymptoms: "",
    narrative: "",
    location: "",
    severity: "",
    course: "",
    temperature: ""
  },
  pastMedicalHistory: {
    conditions: [], hospitalization: "", hospitalizationDetails: "",
    currentTreatment: "", currentTreatmentDetails: ""
  },
  pastSurgicalHistory: {
    hadSurgery: "", surgeryDetails: "", surgeryWhen: ""
  },
  drugs: {
    taking: "", medicines: "", regularity: "", supplements: "", supplementDetails: ""
  },
  allergies: {
    hasAllergy: "", allergyTypes: [], reaction: ""
  },
  familyHistory: {
    importantCondition: "", conditions: [], relation: ""
  },
  personalHistory: {
    diet: "", sleep: "", activity: "", lifestyle: ""
  },
  ros: {
    general: [], respiratory: [], gastrointestinal: [], neurological: []
  },
ayush: {
    prakriti: {
      bodyBuild: "", weightTendency: "", appetiteTendency: "",
      digestionTendency: "", sleepPattern: "", temperaturePreference: ""
    },
    vikriti: {
      changeFromNormal: "", currentAppetite: "", currentDigestion: "",
      bowelHabit: "", sleepChange: "", energyChange: ""
    },
    sara: {
      overallPhysicalHealth: "", recovery: "", generalVitality: ""
    },
    samhanana: {
      bodyFrame: "", boneJointBuild: "", jointStability: ""
    },
    pramana: {
      height: "", weight: "", waistCircumference: ""
    },
    satmya: {
      foodTolerance: "", foodIntolerance: "", climateTolerance: ""
    },
    sattva: {
      stressResponse: "", copingAbility: "", concentration: "", support: ""
    },
    aharaShakti: {
      usualHunger: "", mealCapacity: "", mealTolerance: ""
    },
    vyayamaShakti: {
      usualActivity: "", exerciseTolerance: "", breathlessnessFatigue: "",
      recovery: "", usualExercise: ""
    },
    vaya: {
      lifeStageContext: ""
    }
  },
  status: "draft"
};

const API_BASE = "http://localhost:4000";

// Thin API adapter for the Python AI/Sarvam modules.
// These Python functions are NOT HTTP endpoints by themselves; a small backend
// route must expose these paths. The frontend only talks to the backend.
const AI_API = {
  turn: `${API_BASE}/api/ai/turn`,
  speechToText: `${API_BASE}/api/speech-to-text`,
  translate: `${API_BASE}/api/translate`,
  textToSpeech: `${API_BASE}/api/text-to-speech`
};

// The Python ClinicalEngine is the clinical source of truth.
// The AI is only allowed to phrase/normalize the question; it does not choose
// the next clinical question or decide whether a response is a red flag.
const CLINICAL_API = {
  start: `${API_BASE}/api/clinical/start`,
  answer: `${API_BASE}/api/clinical/answer`
};

// Canonical facts shared by every frontend section and the AI.
// If a fact is already present here, another part of the UI must not ask for it again.
const FACT_REGISTRY = [
  ["patient.name", "demographics.name", "Patient name"],
  ["patient.age", "demographics.age", "Age"],
  ["patient.gender", "demographics.gender", "Gender"],
  ["patient.language", "demographics.language", "Preferred language"],
  ["patient.abhaId", "demographics.abha_id", "ABHA ID"],

  ["chiefComplaint", "presenting.complaints", "Chief complaint"],
  ["hpi.onset", "symptom.onset", "Symptom onset"],
  ["hpi.duration", "symptom.course", "Symptom course"],
  ["hpi.location", "symptom.location", "Symptom location"],
  ["hpi.severity", "symptom.severity", "Symptom severity"],
  ["hpi.character", "symptom.character", "Symptom character"],
  ["hpi.radiation", "symptom.radiation", "Symptom radiation"],
  ["hpi.narrative", "symptom.associated_details", "Associated symptom details"],
  ["hpi.temperature", "fever.temperature", "Measured temperature"],

  ["pastMedicalHistory.conditions", "past_medical.conditions", "Past medical conditions"],
  ["pastMedicalHistory.hospitalization", "past_medical.hospitalization", "Past hospitalization"],
  ["pastMedicalHistory.hospitalizationDetails", "past_medical.hospitalization_details", "Hospitalization details"],
  ["pastMedicalHistory.currentTreatment", "past_medical.current_treatment", "Current treatment"],
  ["pastMedicalHistory.currentTreatmentDetails", "past_medical.current_treatment_details", "Current treatment details"],

  ["pastSurgicalHistory.hadSurgery", "past_surgical.had_surgery", "Previous surgery"],
  ["pastSurgicalHistory.surgeryDetails", "past_surgical.surgery_details", "Surgery details"],
  ["pastSurgicalHistory.surgeryWhen", "past_surgical.surgery_when", "Surgery timing"],

  ["drugs.taking", "medications.current", "Current medicines"],
  ["drugs.medicines", "medications.names", "Medicine names"],
  ["drugs.regularity", "medications.regularity", "Medicine regularity"],
  ["drugs.supplements", "medications.supplements", "Supplements or traditional medicines"],
  ["drugs.supplementDetails", "medications.supplement_details", "Supplement details"],

  ["allergies.hasAllergy", "allergies.known", "Known allergies"],
  ["allergies.allergyTypes", "allergies.types", "Allergy types"],
  ["allergies.reaction", "allergies.reaction", "Allergy reaction"],

  ["familyHistory.importantCondition", "family_history.present", "Important family history"],
  ["familyHistory.conditions", "family_history.conditions", "Family conditions"],
  ["familyHistory.relation", "family_history.relation", "Affected relative"],

  ["personalHistory.diet", "personal.diet", "Usual diet"],
  ["personalHistory.sleep", "personal.sleep", "Usual sleep"],
  ["personalHistory.activity", "personal.activity", "Usual activity"],
  ["personalHistory.lifestyle", "personal.lifestyle", "Lifestyle factors"]
];

const getPathValue = (object, path) =>
  path.split(".").reduce((current, key) => current?.[key], object);

const hasMeaningfulValue = value =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

function collectAnsweredFacts(caseData) {
  const facts = {};

  FACT_REGISTRY.forEach(([path, factKey, label]) => {
    const value = getPathValue(caseData, path);
    if (hasMeaningfulValue(value)) {
      facts[factKey] = {
        value,
        label,
        source: "frontend"
      };
    }
  });

  Object.entries(caseData.answeredFacts || {}).forEach(([factKey, entry]) => {
    if (entry && hasMeaningfulValue(entry.value)) {
      facts[factKey] = entry;
    }
  });

  // Clinical question IDs are also included so the AI can never ask a
  // question that has already been answered, even if semantic mapping changes.
  Object.entries(caseData.answeredQuestions || {}).forEach(([questionId, entry]) => {
    facts[`question:${questionId}`] = {
      value: entry.answer,
      label: entry.question || questionId,
      source: entry.source || "conversation",
      question_id: questionId
    };
  });

  return facts;
}

function normalizeClinicalRedFlag(redFlag) {
  if (!redFlag) return null;
  if (typeof redFlag === "string") {
    return {
      is_red_flag: true,
      severity: "EMERGENCY",
      message: redFlag,
      recommended_action: "Alert triage/clinical staff immediately."
    };
  }
  return {
    is_red_flag: Boolean(redFlag.is_red_flag ?? redFlag.isRedFlag ?? true),
    severity: redFlag.severity || redFlag.type || "URGENT",
    message: redFlag.message || redFlag.reason || "A potentially serious response was detected.",
    recommended_action:
      redFlag.recommended_action ||
      redFlag.recommendedAction ||
      "Alert triage/clinical staff immediately."
  };
}

function canonicalComplaint(value) {
  const text = String(value || "").trim().toLowerCase();
  const aliases = {
    fever: "fever",
    temperature: "fever",
    "high temperature": "fever",
    "abdominal pain": "abdominal_pain",
    abdominal_pain: "abdominal_pain",
    "stomach pain": "abdominal_pain",
    "belly pain": "abdominal_pain",
    headache: "headache",
    "head pain": "headache",
    cough: "cough",
    breathlessness: "difficulty_breathing",
    "difficulty breathing": "difficulty_breathing",
    "breathing difficulty": "difficulty_breathing",
    difficulty_breathing: "difficulty_breathing",
    "shortness of breath": "difficulty_breathing",
    "chest pain": "chest_pain",
    chest_pain: "chest_pain",
    vomiting: "vomiting",
    vomit: "vomiting",
    "throwing up": "vomiting",
    nausea: "nausea",
    "feeling nauseous": "nausea",
    diarrhea: "diarrhea",
    diarrhoea: "diarrhea",
    "loose motions": "diarrhea",
    "loose stools": "diarrhea",
    "back pain": "back_pain",
    back_pain: "back_pain"
  };
  return aliases[text] || null;
}

const sections = [
  ["complaint", "Chief Complaint"],
  ["aiInterview", "AI Case-Taking"],
  ["hpi", "History of Present Illness"],
  ["pastMedical", "Past Medical History"],
  ["pastSurgical", "Past Surgical History"],
  ["drugs", "Drug History"],
  ["allergies", "Allergy History"],
  ["family", "Family History"],
  ["personal", "Personal History"],
  ["ros", "Review of Systems"],
  ["ayush", "AYUSH History"],
  ["review", "Review & Submit"]
];

const symptomOptions = ["Fever", "Chest pain", "Cough", "Headache", "Breathlessness", "Abdominal pain", "Vomiting", "Weakness", "Other"];
const rosGroups = {
  General: ["Fever", "Weight change", "Fatigue", "Loss of appetite"],
  Respiratory: ["Cough", "Breathlessness", "Wheezing"],
  Cardiovascular: ["Chest pain", "Palpitations", "Swelling of legs"],
  Gastrointestinal: ["Nausea", "Vomiting", "Abdominal pain", "Change in bowel habits"],
  Neurological: ["Headache", "Dizziness", "Weakness", "Numbness"]
};

function cloneEmptyCase() {
  return JSON.parse(JSON.stringify(EMPTY_CASE));
}

function normalizeCase(saved) {
  const base = cloneEmptyCase();
  if (!saved || typeof saved !== "object") return base;

  const merged = {
    ...base,
    ...saved,
    patient: { ...base.patient, ...(saved.patient || {}) },
    aiInterview: { ...base.aiInterview, ...(saved.aiInterview || {}) },
    hpi: { ...base.hpi, ...(saved.hpi || {}) },
    ros: { ...base.ros, ...(saved.ros || {}) },
    ayush: {
      ...base.ayush,
      ...(saved.ayush || {}),
      prakriti: { ...base.ayush.prakriti, ...(saved.ayush?.prakriti || {}) },
      vikriti: { ...base.ayush.vikriti, ...(saved.ayush?.vikriti || {}) },
      sara: { ...base.ayush.sara, ...(saved.ayush?.sara || {}) },
      samhanana: { ...base.ayush.samhanana, ...(saved.ayush?.samhanana || {}) },
      pramana: { ...base.ayush.pramana, ...(saved.ayush?.pramana || {}) },
      satmya: { ...base.ayush.satmya, ...(saved.ayush?.satmya || {}) },
      sattva: { ...base.ayush.sattva, ...(saved.ayush?.sattva || {}) },
      aharaShakti: { ...base.ayush.aharaShakti, ...(saved.ayush?.aharaShakti || {}) },
      vyayamaShakti: { ...base.ayush.vyayamaShakti, ...(saved.ayush?.vyayamaShakti || {}) },
      vaya: { ...base.ayush.vaya, ...(saved.ayush?.vaya || {}) }
    }
  };

  const normalizeObject = (key) => {
    const value = saved[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ...base[key], ...value };
    }
    return { ...base[key] };
  };

  merged.pastMedicalHistory = normalizeObject("pastMedicalHistory");
  merged.pastSurgicalHistory = normalizeObject("pastSurgicalHistory");
  merged.drugs = normalizeObject("drugs");
  merged.allergies = normalizeObject("allergies");
  merged.familyHistory = normalizeObject("familyHistory");
  merged.personalHistory = normalizeObject("personalHistory");

  return merged;
}

const UI_TEXT = {
  English: {
    portalBadge: "PATIENT PORTAL",
    welcome: "Welcome to MediKiosk",
    subtitle: "Secure patient registration, medical record upload and guided clinical history collection.",
    newPatient: "New Patient",
    newPatientDesc: "Register for the first time using identity verification and create your login.",
    existingPatient: "Existing Patient",
    existingPatientDesc: "Already registered? Log in using your password or a one-time OTP.",
    register: "Register →",
    login: "Login →",
    prototype: "Prototype mode",
    prototypeDesc: "Identity verification, OTP delivery, biometric authentication and secure backend storage are simulated for this MVP.",
    language: "Preferred language",
    continue: "Continue →",
    back: "← Back",
    newBadge: "NEW PATIENT",
    existingBadge: "EXISTING PATIENT",
    createAccount: "Create Patient Account",
    loginTitle: "Patient Login",
    fullName: "Full name",
    phone: "Phone number",
    age: "Age",
    gender: "Gender",
    select: "Select",
    aadhaar: "Aadhaar number",
    password: "Password",
    createPassword: "Create password",
    passwordHint: "Minimum 6 characters",
    biometric: "👆 Thumb / Biometric — Coming soon",
    verifyCreate: "Verify & Create Account →",
    patientId: "Phone number / Patient ID",
    chooseLogin: "Choose login method",
    demoOtp: "Demo OTP",
    otpHint: "For this prototype, use 123456.",
    enterOtp: "Enter OTP",
    loginContinue: "Login & Continue →",
    identify: "Patient Identification",
    identificationDesc: "Confirm the patient's basic information before starting the clinical history.",
    consultationMode: "Consultation mode",
    consent: "Consent",
    consentText: "I consent to the collection and processing of my clinical history for this consultation.",
    startHistory: "Start Clinical History →",
    documents: "Upload Medical Documents",
    documentsDesc: "Add previous prescriptions, lab reports, discharge summaries, medical records or photos.",
    chooseFiles: "+ Choose Files",
    continueCase: "Continue to Case Taking →",
    caseProgress: "Case Progress",
    chiefComplaint: "Chief Complaint",
    hpi: "History of Present Illness",
    reviewSubmit: "Review & Submit",
    uploadDocuments: "Upload Documents",
    saveContinue: "Save & Continue →",
    previous: "← Previous",
    patientDescription: "Describe what has been happening in your own words...",
    noDocs: "No documents uploaded yet.",
    languageChanged: "Language updated.",
    languageHelp: "You can change this later from the patient bar."
  },
  Hindi: {
    portalBadge: "रोगी पोर्टल",
    welcome: "MediKiosk में आपका स्वागत है",
    subtitle: "सुरक्षित पंजीकरण, मेडिकल रिकॉर्ड अपलोड और निर्देशित क्लिनिकल हिस्ट्री।",
    newPatient: "नया रोगी",
    newPatientDesc: "पहली बार पंजीकरण करें, पहचान सत्यापित करें और अपना लॉगिन बनाएं।",
    existingPatient: "पहले से पंजीकृत रोगी",
    existingPatientDesc: "पहले से पंजीकृत हैं? पासवर्ड या OTP से लॉगिन करें।",
    register: "पंजीकरण करें →",
    login: "लॉगिन करें →",
    prototype: "प्रोटोटाइप मोड",
    prototypeDesc: "पहचान सत्यापन, OTP, बायोमेट्रिक और सुरक्षित बैकएंड इस MVP में सिमुलेटेड हैं।",
    language: "पसंदीदा भाषा",
    continue: "आगे बढ़ें →",
    back: "← वापस",
    newBadge: "नया रोगी",
    existingBadge: "पहले से पंजीकृत रोगी",
    createAccount: "रोगी खाता बनाएं",
    loginTitle: "रोगी लॉगिन",
    fullName: "पूरा नाम",
    phone: "फोन नंबर",
    age: "उम्र",
    gender: "लिंग",
    select: "चुनें",
    aadhaar: "आधार नंबर",
    password: "पासवर्ड",
    createPassword: "पासवर्ड बनाएं",
    passwordHint: "कम से कम 6 अक्षर",
    biometric: "👆 अंगूठा / बायोमेट्रिक — जल्द उपलब्ध",
    verifyCreate: "सत्यापित करें और खाता बनाएं →",
    patientId: "फोन नंबर / रोगी ID",
    chooseLogin: "लॉगिन का तरीका चुनें",
    demoOtp: "डेमो OTP",
    otpHint: "इस प्रोटोटाइप के लिए 123456 इस्तेमाल करें।",
    enterOtp: "OTP दर्ज करें",
    loginContinue: "लॉगिन करके आगे बढ़ें →",
    identify: "रोगी की जानकारी",
    identificationDesc: "क्लिनिकल हिस्ट्री शुरू करने से पहले जानकारी की पुष्टि करें।",
    consultationMode: "परामर्श का प्रकार",
    consent: "सहमति",
    consentText: "मैं इस परामर्श के लिए अपनी क्लिनिकल हिस्ट्री के संग्रह और उपयोग की सहमति देता/देती हूँ।",
    startHistory: "क्लिनिकल हिस्ट्री शुरू करें →",
    documents: "मेडिकल दस्तावेज़ अपलोड करें",
    documentsDesc: "पुराने प्रिस्क्रिप्शन, लैब रिपोर्ट, डिस्चार्ज समरी, मेडिकल रिकॉर्ड या फोटो जोड़ें।",
    chooseFiles: "+ फाइल चुनें",
    continueCase: "केस हिस्ट्री पर जाएं →",
    caseProgress: "केस प्रगति",
    chiefComplaint: "मुख्य शिकायत",
    hpi: "वर्तमान बीमारी का इतिहास",
    reviewSubmit: "समीक्षा और सबमिट",
    uploadDocuments: "दस्तावेज़ अपलोड करें",
    saveContinue: "सेव करें और आगे बढ़ें →",
    previous: "← पिछला",
    patientDescription: "अपनी समस्या अपने शब्दों में बताएं...",
    noDocs: "अभी कोई दस्तावेज़ अपलोड नहीं है।",
    languageChanged: "भाषा बदल दी गई है।",
    languageHelp: "आप इसे बाद में पेशेंट बार से बदल सकते हैं।"
  }
};

function t(language, key) {
  return (UI_TEXT[language] || UI_TEXT.English)[key] || UI_TEXT.English[key] || key;
}

// Combined step order used for the case-taking progress indicator.
// Mirrors the order the steps are rendered in the sidebar (documents last),
// so the progress count always matches what the patient sees on screen.
const PROGRESS_STEPS = [...sections.map(([id]) => id), "documents"];

function App() {
  const [caseData, setCaseData] = useState(() => {
    const saved = localStorage.getItem("medikiosk-case");
    if (!saved) return cloneEmptyCase();

    try {
      const restored = normalizeCase(JSON.parse(saved));
      return restored;
    } catch {
      localStorage.removeItem("medikiosk-case");
      return cloneEmptyCase();
    }
  });
  const [screen, setScreen] = useState("portal");
  const [section, setSection] = useState("complaint");
  const [alert, setAlert] = useState(null); // { message, severity: "critical" | "warning" | "info" }
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem("medikiosk-case", JSON.stringify(caseData));
  }, [caseData]);

  // Initial safety signal: this is deliberately checked before the AI starts.
  // The clinical engine remains the authoritative red-flag detector during the interview.
  const hasChestPain = caseData.chiefComplaint.includes("Chest pain");
  const hasBreathlessness = caseData.chiefComplaint.includes("Breathlessness");
  const initialRedFlag = hasChestPain && hasBreathlessness;
  const redFlag = caseData.aiInterview?.redflag || (initialRedFlag ? {
    is_red_flag: true,
    severity: "EMERGENCY",
    message: "Chest pain together with breathlessness has been selected.",
    recommended_action: "Alert triage/clinical staff immediately."
  } : null);

  useEffect(() => {
    if (initialRedFlag || caseData.aiInterview?.redflag?.is_red_flag) {
      setAlert({
        message:
          caseData.aiInterview?.redflag?.message ||
          "Potential emergency symptoms detected. Please alert triage staff immediately.",
        severity: "critical"
      });
    }
  }, [initialRedFlag, caseData.aiInterview?.redflag]);

  const update = (path, value, meta = {}) => {
    setCaseData(prev => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let obj = next;

      keys.slice(0, -1).forEach(key => {
        if (!obj[key] || typeof obj[key] !== "object" || Array.isArray(obj[key])) {
          obj[key] = {};
        }
        obj = obj[key];
      });

      obj[keys[keys.length - 1]] = value;

      if (meta.questionId) {
        next.answeredQuestions = next.answeredQuestions || {};
        next.answeredQuestions[meta.questionId] = {
          question_id: meta.questionId,
          question: meta.question || meta.questionId,
          answer: value,
          source: meta.source || "frontend",
          fact_key: meta.factKey || meta.questionId,
          recorded_at: new Date().toISOString()
        };
      }

      if (meta.factKey && hasMeaningfulValue(value)) {
        next.answeredFacts = next.answeredFacts || {};
        next.answeredFacts[meta.factKey] = {
          value,
          label: meta.label || meta.factKey,
          source: meta.source || "frontend",
          question_id: meta.questionId || null,
          recorded_at: new Date().toISOString()
        };
      }

      return next;
    });
    setSaved(false);
  };

  const toggleComplaint = (item) => {
    setCaseData(prev => {
      const exists = prev.chiefComplaint.includes(item);
      return {
        ...prev,
        chiefComplaint: exists
          ? prev.chiefComplaint.filter(x => x !== item)
          : [...prev.chiefComplaint, item]
      };
    });
    setSaved(false);
  };

  const choosePatientType = (type) => {
    setAlert(null);
    if (type === "new") {
      setCaseData(prev => ({
        ...prev,
        patient: {
          ...prev.patient,
          type: "new",
          verified: false,
          verificationMethod: "Aadhaar",
          verificationValue: "",
          password: "",
          authMethod: "password"
        }
      }));
      setScreen("newRegister");
    } else {
      setCaseData(prev => ({
        ...prev,
        patient: {
          ...prev.patient,
          type: "existing",
          verified: false,
          authMethod: "password"
        }
      }));
      setScreen("existingLogin");
    }
  };

  const registerNewPatient = async () => {
  const p = caseData.patient;
  const aadhaar = p.verificationValue.replace(/\s/g, "");

  if (!p.name.trim()) {
    setAlert({ message: "Enter the patient's full name.", severity: "warning" });
    return;
  }

  if (!/^\d{10}$/.test(p.phone)) {
    setAlert({ message: "Enter a valid 10-digit phone number.", severity: "warning" });
    return;
  }

  if (!/^\d{12}$/.test(aadhaar)) {
    setAlert({ message: "Enter a valid 12-digit Aadhaar number.", severity: "warning" });
    return;
  }

  if ((p.password || "").length < 6) {
    setAlert({ message: "Password must be at least 6 characters.", severity: "warning" });
    return;
  }

  // Frontend-only demo registration.
  // The real authentication backend is not currently present
  // in the integration-test branch.
  const demoPatient = {
    ...p,
    verified: true,
    abhaId: `DEMO-ABHA-${Date.now()}`,
    aadhaar,
  };

  // Store the demo account locally.
  localStorage.setItem(
    "medikiosk-demo-patient",
    JSON.stringify(demoPatient)
  );

  // Create a demo token so the rest of the frontend
  // considers the patient authenticated.
  localStorage.setItem(
    "medikiosk-token",
    `demo-token-${Date.now()}`
  );

  setCaseData(prev => ({
    ...prev,
    patient: {
      ...prev.patient,
      ...demoPatient,
    },
  }));

  setAlert(null);
  setScreen("identify");
};

  const loginExistingPatient = async () => {
    const p = caseData.patient;
    const credential = p.verificationValue.trim();

    if (!credential) {
      setAlert({ message: "Enter your phone number or Patient ID.", severity: "warning" });
      return;
    }

    try {
      let result;

      if (p.authMethod === "password") {
        if ((p.password || "").length < 6) {
          setAlert({ message: "Enter a password of at least 6 characters.", severity: "warning" });
          return;
        }

        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: credential,
            password: p.password
          })
        });

        result = await response.json();
        if (!response.ok) throw new Error(result.error || "Login failed.");
      } else {
        if (!/^\d{10}$/.test(credential)) {
          setAlert({ message: "For OTP login, enter the registered 10-digit phone number.", severity: "warning" });
          return;
        }

        if (!(p.otp || "").trim()) {
          const response = await fetch(`${API_BASE}/api/auth/otp/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: credential })
          });
          const requested = await response.json();
          if (!response.ok) throw new Error(requested.error || "Could not request OTP.");

          setAlert({ message: "Demo OTP generated: 123456. Enter it and press Login again.", severity: "info" });
          return;
        }

        const response = await fetch(`${API_BASE}/api/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: credential,
            otp: p.otp
          })
        });

        result = await response.json();
        if (!response.ok) throw new Error(result.error || "OTP verification failed.");
      }

      localStorage.setItem("medikiosk-token", result.token);

      setCaseData(prev => ({
        ...prev,
        patient: {
          ...prev.patient,
          verified: true,
          phone: result.patient.phone,
          name: result.patient.name || "",
          age: result.patient.age || "",
          gender: result.patient.gender || "",
          language: result.patient.language || "English",
          abhaId: result.patient.abhaId || ""
        }
      }));
      setAlert(null);
      setScreen("identify");
    } catch (error) {
      setAlert({ message: error.message, severity: "warning" });
    }
  };

  // Frontend-only demo authentication for Participant 2 testing.
  // This is intentionally separate from the real backend login flow.
  const demoLoginExistingPatient = () => {
    const demoPatient = {
      ...cloneEmptyCase().patient,
      type: "existing",
      verified: true,
      verificationMethod: "phone",
      verificationValue: "DEMO-001",
      phone: "9999999999",
      password: "",
      authMethod: "password",
      otp: "",
      abhaId: "DEMO-ABHA-001",
      name: "Demo Patient",
      age: "35",
      gender: "Prefer not to say",
      language: caseData.patient.language || "English"
    };

    setCaseData(prev => ({
      ...prev,
      patient: demoPatient,
      status: "draft"
    }));

    // Do not create a fake token or call the backend.
    setAlert(null);
    setScreen("identify");
  };

  const logoutToPortal = () => {
    setAlert(null);
    setScreen("portal");
  };

  const addDocuments = (fileList) => {
    const incoming = Array.from(fileList || []);
    const maxSize = 10 * 1024 * 1024;

    const accepted = incoming
      .filter(file => file.size <= maxSize)
      .map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        category: "Other",
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
      }));

    if (incoming.some(file => file.size > maxSize)) {
      setAlert({ message: "Some files were skipped because they are larger than 10 MB.", severity: "warning" });
    }

    setCaseData(prev => ({
      ...prev,
      documents: [...prev.documents, ...accepted]
    }));
    setSaved(false);
  };

  const removeDocument = (id) => {
    setCaseData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
    setSaved(false);
  };

  const setDocumentCategory = (id, category) => {
    setCaseData(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === id ? { ...doc, category } : doc
      )
    }));
    setSaved(false);
  };

  const startCase = () => {
    if (!caseData.patient.name && !caseData.patient.abhaId) {
      setAlert({ message: "Enter at least the patient's name or ABHA ID.", severity: "warning" });
      return;
    }
    if (!caseData.consent) {
      setAlert({ message: "Consent is required before clinical history collection.", severity: "warning" });
      return;
    }
    setScreen("case");
    setSection("complaint");
  };

  const next = () => {
    const current = sections.findIndex(([id]) => id === section);
    if (current < sections.length - 1) setSection(sections[current + 1][0]);
  };

  const previous = () => {
    const current = sections.findIndex(([id]) => id === section);
    if (current > 0) setSection(sections[current - 1][0]);
  };

  const submitCase = async () => {
  const finalized = {
    ...caseData,
    status: "submitted",
    submittedAt: new Date().toISOString()
  };

  setCaseData(finalized);
  setSaved(true);

  localStorage.setItem(
    "medikiosk-case",
    JSON.stringify(finalized)
  );

  setAlert(null);
  setScreen("submitted");
};

  const newCase = () => {
    localStorage.removeItem("medikiosk-case");
    setCaseData(cloneEmptyCase());
    setScreen("portal");
    setSection("complaint");
    setSaved(false);
    setAlert(null);
  };

  const alertHeading = alert
    ? alert.severity === "critical"
      ? "Priority Alert"
      : alert.severity === "info"
      ? "Notice"
      : "Please check"
    : "";

  return (
    <div className="app">
      <header>
        <strong>MediKiosk</strong>
        <span>Clinical History Intake MVP</span>
        {caseData.status === "submitted" && <button onClick={newCase}>New Case</button>}
        {screen !== "portal" && screen !== "submitted" && (
          <button onClick={logoutToPortal}>Patient Portal</button>
        )}
      </header>

      {alert && (
        <div
          className={`alert alert-${alert.severity}`}
          role={alert.severity === "critical" ? "alert" : "status"}
        >
          <strong>{alertHeading}</strong>
          <span>{alert.message}</span>
          <button className="ghost btn-small" onClick={() => setAlert(null)}>Dismiss</button>
        </div>
      )}

      {screen === "portal" && (
        <PatientPortal
          data={caseData}
          update={update}
          onChoose={choosePatientType}
        />
      )}

      {screen === "newRegister" && (
        <NewPatientRegistration
          data={caseData}
          update={update}
          onRegister={registerNewPatient}
          onBack={logoutToPortal}
        />
      )}

      {screen === "existingLogin" && (
        <ExistingPatientLogin
          data={caseData}
          update={update}
          onLogin={loginExistingPatient}
          onDemoLogin={demoLoginExistingPatient}
          onBack={logoutToPortal}
        />
      )}

      {screen === "identify" && (
        <Identification
          data={caseData}
          update={update}
          startCase={startCase}
        />
      )}

      {screen === "case" && (
        <div className="workspace">
          <aside>
            <h3>{t(caseData.patient.language, "caseProgress")}</h3>

            {(() => {
              const currentStepIndex = PROGRESS_STEPS.indexOf(section);
              const totalSteps = PROGRESS_STEPS.length;
              const percent = ((currentStepIndex + 1) / totalSteps) * 100;
              const progressLabel = caseData.patient.language === "Hindi"
                ? `चरण ${currentStepIndex + 1} / ${totalSteps}`
                : `Section ${currentStepIndex + 1} of ${totalSteps}`;
              return (
                <div className="step-progress">
                  <div className="step-progress-track">
                    <div className="step-progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="step-progress-label">{progressLabel}</span>
                </div>
              );
            })()}

            <div className="progress-note">
              {section === "review"
                ? (caseData.patient.language === "Hindi" ? "लगभग पूरा — समीक्षा के लिए तैयार" : "Almost done — ready for review")
                : (caseData.patient.language === "Hindi" ? "आपकी जानकारी अपने आप सेव हो रही है।" : "Your progress is saved automatically.")}
            </div>

            {sections.map(([id, label]) => {
              const idx = PROGRESS_STEPS.indexOf(id);
              const currentStepIndex = PROGRESS_STEPS.indexOf(section);
              const state = idx < currentStepIndex ? "completed" : idx === currentStepIndex ? "current" : "upcoming";
              const displayLabel = label === "Chief Complaint" ? t(caseData.patient.language, "chiefComplaint")
                : label === "History of Present Illness" ? t(caseData.patient.language, "hpi")
                : label === "Review & Submit" ? t(caseData.patient.language, "reviewSubmit")
                : label;
              return (
                <button
                  key={id}
                  className={`step-item step-${state}`}
                  aria-current={state === "current" ? "step" : undefined}
                  onClick={() => setSection(id)}
                >
                  <span className="step-marker" aria-hidden="true">{state === "completed" ? "✓" : idx + 1}</span>
                  <span className="step-text">{displayLabel}</span>
                </button>
              );
            })}

            {(() => {
              const idx = PROGRESS_STEPS.indexOf("documents");
              const currentStepIndex = PROGRESS_STEPS.indexOf(section);
              const state = idx < currentStepIndex ? "completed" : idx === currentStepIndex ? "current" : "upcoming";
              return (
                <button
                  className={`step-item step-${state}`}
                  aria-current={state === "current" ? "step" : undefined}
                  onClick={() => setSection("documents")}
                >
                  <span className="step-marker" aria-hidden="true">{state === "completed" ? "✓" : idx + 1}</span>
                  <span className="step-text">{t(caseData.patient.language, "uploadDocuments")}</span>
                </button>
              );
            })()}
          </aside>

          <main>
            <div className="patient-bar">
              <span><strong>{caseData.patient.name || "Unnamed patient"}</strong></span>
              <span>{caseData.patient.age ? `${caseData.patient.age} yrs` : ""}</span>
              <span>{caseData.patient.gender}</span>
              <span>{caseData.patient.language}</span>
              <span>Mode: {caseData.mode}</span>
              <label className="inline-language">
                {t(caseData.patient.language, "language")}
                <select
                  value={caseData.patient.language}
                  onChange={e => update("patient.language", e.target.value)}
                >
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </label>
            </div>

            {section === "aiInterview" && (
              <AIInterviewSection data={caseData} update={update} setSection={setSection} />
            )}
            {section === "complaint" && (
              <ComplaintSection data={caseData} toggle={toggleComplaint} update={update} setSection={setSection} />
            )}
            {section === "hpi" && (
              <HPISection data={caseData} update={update} />
            )}
            {section === "pastMedical" && (
              <PastMedicalSection
                data={caseData.pastMedicalHistory}
                update={update}
              />
            )}
            {section === "pastSurgical" && (
              <PastSurgicalSection
                data={caseData.pastSurgicalHistory}
                update={update}
                setSection={setSection}
              />
            )}
            {section === "drugs" && (
              <DrugHistorySection
                data={caseData.drugs}
                update={update}
                setSection={setSection}
              />
            )}
            {section === "allergies" && (
              <AllergyHistorySection
                data={caseData.allergies}
                update={update}
                setSection={setSection}
              />
            )}
            {section === "family" && (
              <FamilyHistorySection
                data={caseData.familyHistory}
                update={update}
              />
            )}
            {section === "personal" && (
              <PersonalHistorySection
                data={caseData.personalHistory}
                update={update}
              />
            )}
            {section === "ros" && (
              <ROSSection data={caseData.ros} update={update} />
            )}
            {section === "ayush" && (
              <AYUSHSection data={caseData.ayush} update={update} />
            )}
            {section === "documents" && (
              <DocumentsSection
                documents={caseData.documents}
                addDocuments={addDocuments}
                removeDocument={removeDocument}
                setDocumentCategory={setDocumentCategory}
                onContinue={() => setSection("complaint")}
              />
            )}
            {section === "review" && (
              <Review data={caseData} redFlag={redFlag} onSubmit={submitCase} />
            )}

            {section !== "review" && section !== "documents" && section !== "aiInterview" && (
              <div className="navigation">
                <button className="ghost" onClick={previous}>{t(caseData.patient.language, "previous")}</button>
                <button className="primary" onClick={next}>{t(caseData.patient.language, "saveContinue")}</button>
              </div>
            )}
          </main>
        </div>
      )}

      {screen === "submitted" && (
        <Submitted data={caseData} onNew={newCase} />
      )}
    </div>
  );
}


function PatientPortal({ data, update, onChoose }) {
  const language = data.patient.language || "English";

  return (
    <main className="single portal-screen">
      <div className="portal-topline">
        <div className="portal-badge">{t(language, "portalBadge")}</div>
        <label className="language-picker">
          {t(language, "language")}
          <select
            value={language}
            onChange={e => update("patient.language", e.target.value)}
          >
            <option>English</option>
            <option>Hindi</option>
          </select>
        </label>
      </div>

      <h1>{t(language, "welcome")}</h1>
      <p className="lead">{t(language, "subtitle")}</p>

      <div className="patient-choice-grid">
        <button className="choice-card" onClick={() => onChoose("new")}>
          <div className="choice-icon">＋</div>
          <h2>{t(language, "newPatient")}</h2>
          <p>{t(language, "newPatientDesc")}</p>
          <span>{t(language, "register")}</span>
        </button>

        <button className="choice-card" onClick={() => onChoose("existing")}>
          <div className="choice-icon">↪</div>
          <h2>{t(language, "existingPatient")}</h2>
          <p>{t(language, "existingPatientDesc")}</p>
          <span>{t(language, "login")}</span>
        </button>
      </div>

      <div className="card demo-note">
        <strong>{t(language, "prototype")}</strong>
        <p>{t(language, "prototypeDesc")}</p>
      </div>
    </main>
  );
}

function NewPatientRegistration({ data, update, onRegister, onBack }) {
  const language = data.patient.language || "English";
  return (
    <main className="single auth-screen">
      <button className="ghost" onClick={onBack}>{t(language, "back")}</button>
      <div className="portal-badge">{t(language, "newBadge")}</div>
      <h1>{t(language, "createAccount")}</h1>
      <p>{language === "Hindi"
        ? "क्लिनिकल हिस्ट्री शुरू करने से पहले पहचान सत्यापित करें और खाता बनाएं।"
        : "Complete identity verification and create your account before clinical history collection."}</p>

      <div className="card">
        <h2>{language === "Hindi" ? "1. मूल जानकारी" : "1. Basic details"}</h2>

        <div className="grid">
          <label>
            {t(language, "fullName")}
            <input
              value={data.patient.name}
              onChange={e => update("patient.name", e.target.value)}
              placeholder="Patient full name"
            />
          </label>

          <label>
            {t(language, "phone")}
            <input
              value={data.patient.phone}
              onChange={e => update("patient.phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit phone number"
              inputMode="numeric"
            />
          </label>

          <label>
            {t(language, "age")}
            <input
              type="number"
              min="0"
              max="130"
              value={data.patient.age}
              onChange={e => update("patient.age", e.target.value)}
            />
          </label>

          <label>
            {t(language, "gender")}
            <select
              value={data.patient.gender}
              onChange={e => update("patient.gender", e.target.value)}
            >
              <option value="">{t(language, "select")}</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h2>{language === "Hindi" ? "2. पहचान सत्यापन" : "2. Identity verification"}</h2>
        <p>{language === "Hindi" ? "इस प्रोटोटाइप में आधार सत्यापन सिमुलेटेड है।" : "For the prototype, Aadhaar verification is simulated."}</p>

        <label>
          {t(language, "aadhaar")}
          <input
            value={data.patient.verificationValue}
            onChange={e =>
              update(
                "patient.verificationValue",
                e.target.value.replace(/\D/g, "").slice(0, 12)
              )
            }
            placeholder="12-digit Aadhaar number"
            inputMode="numeric"
          />
        </label>

        <div className="verification-status">
          <span>Government identity verification</span>
          <strong>Demo mode</strong>
        </div>
      </div>

      <div className="card">
        <h2>{language === "Hindi" ? "3. अपना खाता सुरक्षित करें" : "3. Secure your account"}</h2>
        <p>{language === "Hindi" ? "अभी पासवर्ड का उपयोग करें। बायोमेट्रिक/अंगूठा प्रमाणीकरण बाद में जोड़ा जा सकता है।" : "Use a password for now. Biometric/thumb authentication can be added later."}</p>

        <label>
          {t(language, "createPassword")}
          <input
            type="password"
            value={data.patient.password || ""}
            onChange={e => update("patient.password", e.target.value)}
            placeholder={t(language, "passwordHint")}
          />
        </label>

        <button className="biometric-button" disabled>
          {t(language, "biometric")}
        </button>
      </div>

      <button className="primary large" onClick={onRegister}>{t(language, "verifyCreate")}</button>
    </main>
  );
}

function ExistingPatientLogin({ data, update, onLogin, onDemoLogin, onBack }) {
  const method = data.patient.authMethod || "password";
  const language = data.patient.language || "English";

  return (
    <main className="single auth-screen">
      <button className="ghost" onClick={onBack}>{t(language, "back")}</button>
      <div className="portal-badge">{t(language, "existingBadge")}</div>
      <h1>{t(language, "loginTitle")}</h1>
      <p>{language === "Hindi" ? "अपने मौजूदा रोगी रिकॉर्ड तक पहुंचने के लिए लॉगिन करें।" : "Log in to access your existing patient record."}</p>

      <label>
        {t(language, "patientId")}
        <input
          value={data.patient.verificationValue}
          onChange={e => update("patient.verificationValue", e.target.value)}
          placeholder="Enter phone number or Patient ID"
        />
      </label>

      <div className="option-grid auth-methods">
        <button
          className={method === "password" ? "selected" : ""}
          onClick={() => update("patient.authMethod", "password")}
        >
          🔐 Password
        </button>
        <button
          className={method === "otp" ? "selected" : ""}
          onClick={() => update("patient.authMethod", "otp")}
        >
          📱 OTP
        </button>
      </div>

      {method === "password" ? (
        <label>
          Password
          <input
            type="password"
            value={data.patient.password || ""}
            onChange={e => update("patient.password", e.target.value)}
            placeholder="Enter your password"
          />
        </label>
      ) : (
        <div className="card demo-otp">
          <strong>OTP verification</strong>
          <p>For now the backend generates the demo OTP <strong>123456</strong>.</p>
          <label>
            {t(language, "enterOtp")}
            <input
              value={data.patient.otp || ""}
              onChange={e => update("patient.otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
            />
          </label>
        </div>
      )}

      <button className="primary large" onClick={onLogin}>
        {method === "otp" && !(data.patient.otp || "").trim()
          ? "Send Demo OTP →"
          : "Login & Continue →"}
      </button>

      <div className="card demo-login-card">
        <strong>Frontend demo</strong>
        <p>
          Backend authentication is not running yet. Use the demo login to preview the
          real patient workflow with dummy data.
        </p>
        <button className="secondary-demo" onClick={onDemoLogin}>
          Demo Login — View Patient Dashboard →
        </button>
      </div>

      <div className="card">
        <strong>Prototype note:</strong>
        <p>
          OTP and password authentication are simulated locally. No real credentials are sent
          anywhere in this MVP.
        </p>
      </div>
    </main>
  );
}

function DocumentsSection({ documents, addDocuments, removeDocument, setDocumentCategory, onContinue }) {
  const categories = ["Prescription", "Lab Report", "Discharge Summary", "Medical Record", "Photo", "Other"];

  return (
    <section>
      <h1>{t("English", "documents")}</h1>
      <p>
        Upload previous prescriptions, lab reports, discharge summaries, medical records or photos.
        Files are only selected in this frontend MVP; OCR and medical extraction will be integrated later.
      </p>

      <div className="upload-box">
        <input
          id="document-upload"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={e => {
            addDocuments(e.target.files);
            e.target.value = "";
          }}
        />
        <label htmlFor="document-upload" className="upload-button">
          + Choose Files
        </label>
        <span>Images, PDF, DOC/DOCX, TXT • Max 10 MB per file</span>
      </div>

      <p className="privacy-note">
        <span aria-hidden="true">🔒</span> Uploaded documents are used only for this consultation.
      </p>

      {documents.length === 0 ? (
        <div className="card">No documents uploaded yet.</div>
      ) : (
        <div className="document-list">
          {documents.map(doc => (
            <div className="document-card" key={doc.id}>
              {doc.preview ? (
                <img src={doc.preview} alt="" className="document-preview" />
              ) : (
                <div className="document-icon">FILE</div>
              )}

              <div className="document-info">
                <strong>{doc.name}</strong>
                <span>{formatBytes(doc.size)}</span>
                <label>
                  Document type
                  <select
                    value={doc.category}
                    onChange={e => setDocumentCategory(doc.id, e.target.value)}
                  >
                    {categories.map(category => <option key={category}>{category}</option>)}
                  </select>
                </label>
              </div>

              <button className="ghost ghost-danger" onClick={() => removeDocument(doc.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="navigation">
        <span />
        <button className="primary" onClick={onContinue}>
          Continue to Case Taking →
        </button>
      </div>
    </section>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Identification({ data, update, startCase }) {
  const language = data.patient.language || "English";
  return (
    <main className="single">
      <div className="section-topline">
        <div>
          <h1>{t(language, "identify")}</h1>
          <p>{t(language, "identificationDesc")}</p>
        </div>
        <label className="language-picker">
          {t(language, "language")}
          <select value={language} onChange={e => update("patient.language", e.target.value)}>
            <option>English</option>
            <option>Hindi</option>
          </select>
        </label>
      </div>
      <div className="grid">
        <label>
          Patient type
          <select value={data.patient.type} onChange={e => update("patient.type", e.target.value)}>
            <option value="new">New patient</option>
            <option value="existing">Existing patient</option>
          </select>
        </label>

        <label>
          ABHA ID
          <input value={data.patient.abhaId} onChange={e => update("patient.abhaId", e.target.value)} placeholder="Enter ABHA ID" />
        </label>

        <label>
          Name
          <input value={data.patient.name} onChange={e => update("patient.name", e.target.value)} placeholder="Patient name" />
        </label>

        <label>
          Age
          <input type="number" min="0" max="130" value={data.patient.age} onChange={e => update("patient.age", e.target.value)} />
        </label>

        <label>
          Gender
          <select value={data.patient.gender} onChange={e => update("patient.gender", e.target.value)}>
            <option value="">{t(language, "select")}</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </label>

        <label>
          Language
          <select value={data.patient.language} onChange={e => update("patient.language", e.target.value)}>
            <option>English</option>
            <option>Hindi</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          {t(language, "consultationMode")}
          <select value={data.mode} onChange={e => update("mode", e.target.value)}>
            <option>Allopathic</option>
            <option>AYUSH</option>
          </select>
        </label>
      </div>

      <section className="card">
        <h2>{t(language, "consent")}</h2>
        <p>
          Consent is required before clinical history collection. This MVP records the consent state locally.
          Production ABDM consent and secure backend integration will be added separately.
        </p>
        <label className="checkbox">
          <input type="checkbox" checked={data.consent} onChange={e => update("consent", e.target.checked)} />
          {t(language, "consentText")}
        </label>
      </section>

      <button className="primary large" onClick={startCase}>{t(language, "startHistory")}</button>
    </main>
  );
}


function AIInterviewSection({ data, update, setSection }) {
  const language = data.patient.language || "English";
  const languageCode = language === "Hindi" ? "hi-IN" : "en-IN";
  const age = Number(data.patient.age);
  const ageBand = Number.isFinite(age)
    ? age < 18 ? "under-18"
      : age < 30 ? "18-29"
      : age < 40 ? "30-40"
      : age < 60 ? "40-59"
      : "60+"
    : "unknown";

  const [messages, setMessages] = useState(data.aiInterview?.messages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(null);
  const [clinicalOnline, setClinicalOnline] = useState(null);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(data.aiInterview?.currentQuestion || null);
  const [clinicalHistory, setClinicalHistory] = useState(data.aiInterview?.questionHistory || []);
  const [triageLocked, setTriageLocked] = useState(
    Boolean(data.aiInterview?.triageLocked || data.aiInterview?.redflag?.is_red_flag)
  );

  const complaint = canonicalComplaint(data.chiefComplaint[0]);

  useEffect(() => {
    update("aiInterview.messages", messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    update("aiInterview.currentQuestion", currentQuestion);
    update("aiInterview.questionHistory", clinicalHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, clinicalHistory]);

  const userCount = messages.filter(m => m.role === "user").length;
  const lastAI = [...messages].reverse().find(m => m.role === "assistant");
  const redflag = data.aiInterview?.redflag;

  const speakWithBrowser = text => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    window.speechSynthesis.speak(utterance);
  };

  const speak = async text => {
    if (!text) return;

    try {
      const response = await fetch(AI_API.textToSpeech, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language_code: languageCode })
      });

      if (response.ok) {
        const result = await response.json();
        const audio64 =
          result.audio_base64 ||
          result.audio ||
          (Array.isArray(result.audios) ? result.audios[0] : null);

        if (audio64) {
          const audio = new Audio(`data:audio/wav;base64,${audio64}`);
          await audio.play().catch(() => {});
          return;
        }

        if (result.audio_url) {
          const audio = new Audio(result.audio_url);
          await audio.play().catch(() => {});
          return;
        }
      }
    } catch {}

    speakWithBrowser(text);
  };

  const addMessage = (role, content, extra = {}) => {
    if (!content) return;
    setMessages(prev => [...prev, { role, content, ...extra }]);
  };

  const parseClinicalResponse = result => {
    if (!result || typeof result !== "object") return null;

    const state = result.state || result.session || {};
    const question =
      result.question ||
      result.current_question ||
      result.next_question ||
      state.question ||
      state.current_question ||
      state.next_question ||
      null;

    return {
      question,
      redflag: normalizeClinicalRedFlag(
        result.red_flag ||
        result.redflag ||
        state.red_flag ||
        state.redflag
      ),
      outcome: result.outcome || state.outcome || null,
      finished: Boolean(
        result.finished ??
        result.completed ??
        state.finished ??
        state.completed
      ),
      answerHistory:
        result.answer_history ||
        result.question_history ||
        state.answer_history ||
        state.question_history ||
        null
    };
  };

  const normalizeQuestion = question => {
    if (!question) return null;
    if (typeof question === "string") {
      return {
        id: null,
        question,
        type: "free_text",
        options: []
      };
    }

    return {
      ...question,
      id: question.id || question.question_id || null,
      question:
        question.question ||
        question.text ||
        question.prompt ||
        question.label ||
        "",
      type: question.type || "free_text",
      options: Array.isArray(question.options)
        ? question.options
        : question.options && typeof question.options === "object"
          ? Object.entries(question.options).map(([value, label]) => ({ value, label }))
          : []
    };
  };

  /*
   * IMPORTANT:
   * The current Python Gemini backend accepts the original run_medikiosk_turn
   * contract: patient_language, care_system, patient_age_band and
   * conversation_history. It does NOT understand frontend-only "task" values
   * such as "next_question", "normalize_answer" or "phrase_clinical_question".
   *
   * So Gemini is used here as the conversational layer only:
   * - ClinicalEngine chooses the question.
   * - Gemini acknowledges the patient's answer naturally.
   * - The exact ClinicalEngine question is appended unchanged.
   * - Gemini never gets permission to invent or skip a clinical question.
   */
  const askGeminiToAcknowledge = async (patientAnswer, nextQuestion) => {
    try {
      const prior = messages
        .slice(-8)
        .map(message => ({
          role: message.role,
          content: message.content
        }));

      const instruction = language === "Hindi"
        ? `आप MediKiosk के patient-facing conversational assistant हैं।
रोगी के जवाब को एक छोटे, स्वाभाविक वाक्य में acknowledge करें।
कोई नया medical advice न दें और कोई सवाल न पूछें।
अगला clinical सवाल पहले ही Clinical Engine ने तय कर दिया है; उसे आप तय नहीं करेंगे।
रोगी का जवाब: "${patientAnswer}"
अगला तय clinical सवाल: "${nextQuestion.question}"
सिर्फ acknowledgement दें।`
        : `You are MediKiosk's patient-facing conversational assistant.
Acknowledge the patient's answer naturally in ONE short sentence.
Do not give medical advice and do not ask any question.
The Clinical Engine has already selected the next clinical question; you do not choose or change it.
Patient answer: "${patientAnswer}"
Next fixed clinical question: "${nextQuestion.question}"
Return only the short acknowledgement.`;

      const response = await fetch(AI_API.turn, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_language: languageCode,
          care_system: String(data.mode || "Allopathic").toLowerCase(),
          patient_age_band: ageBand,
          conversation_history: [
            ...prior,
            { role: "user", content: instruction }
          ]
        })
      });

      if (!response.ok) throw new Error("Gemini unavailable.");

      const result = await response.json();
      const acknowledgement = String(
        result.speak ||
        result.message ||
        result.response ||
        ""
      ).trim();

      // Reject an AI response that looks like it is trying to ask another
      // question. The fixed engine question will be shown instead.
      if (!acknowledgement || /[?؟]\s*$/.test(acknowledgement)) {
        return "";
      }

      setOnline(true);
      return acknowledgement;
    } catch {
      setOnline(false);
      return "";
    }
  };

  const showQuestion = async (question, acknowledgement = "") => {
    const normalized = normalizeQuestion(question);
    if (!normalized?.question) return;

    const questionId = normalized.id;

    // Never display a question whose canonical ID is already answered.
    if (
      questionId &&
      (
        data.answeredQuestions?.[questionId] ||
        clinicalHistory.some(item => item.question_id === questionId)
      )
    ) {
      return;
    }

    setCurrentQuestion(normalized);
    update("aiInterview.currentQuestion", normalized);

    const text = acknowledgement
      ? `${acknowledgement} ${normalized.question}`
      : normalized.question;

    addMessage("assistant", text, {
      question_id: questionId,
      options: normalized.options || []
    });

    await speak(text);
  };

  const startClinicalSession = async () => {
    if (!complaint) return;

    setLoading(true);

    try {
      const response = await fetch(CLINICAL_API.start, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint,
          patient_id: data.patient.abhaId || data.patient.phone || null,
          answered_facts: collectAnsweredFacts(data)
        })
      });

      if (!response.ok) throw new Error("Clinical engine unavailable.");

      const parsed = parseClinicalResponse(await response.json());
      const question = normalizeQuestion(parsed?.question);

      setClinicalOnline(true);

      if (parsed?.redflag?.is_red_flag) {
        setTriageLocked(true);
        update("aiInterview.redflag", parsed.redflag);
        update("aiInterview.triageLocked", true);
        update("aiInterview.completed", true);

        addMessage(
          "assistant",
          parsed.redflag.message || "This response requires immediate clinical attention.",
          { redflag: parsed.redflag }
        );
        await speak(parsed.redflag.message || "This response requires immediate clinical attention.");
        return;
      }

      if (!question?.question) {
        if (parsed?.finished) {
          update("aiInterview.completed", true);
          const done = language === "Hindi"
            ? "धन्यवाद। आवश्यक क्लिनिकल जानकारी दर्ज हो गई है।"
            : "Thank you. The required clinical information has been captured.";
          addMessage("assistant", done);
          await speak(done);
          setCurrentQuestion(null);
          return;
        }
        throw new Error("Clinical engine returned no question.");
      }

      if (!messages.length) {
        const intro = language === "Hindi"
          ? "ठीक है। मैं आपकी बात ध्यान से समझते हुए केवल ज़रूरी सवाल पूछूँगा।"
          : "Okay. I'll guide you through the relevant questions and keep track of what you've already told me.";
        addMessage("assistant", intro);
        await speak(intro);
      }

      await showQuestion(question);
    } catch {
      setClinicalOnline(false);

      const message = language === "Hindi"
        ? "क्लिनिकल प्रश्न सेवा अभी उपलब्ध नहीं है। कृपया बैकएंड शुरू करके फिर कोशिश करें।"
        : "The clinical question service is not connected yet. Please start the clinical backend and try again.";

      addMessage("assistant", message);
      await speak(message);
    } finally {
      setLoading(false);
    }
  };

  const normalizeFreeformAnswer = rawAnswer => {
    if (!currentQuestion) return String(rawAnswer || "").trim();

    const raw = String(rawAnswer || "").trim();
    if (!raw) return "";

    if (currentQuestion.type === "number") {
      const numberMatch = raw.match(/-?\d+(?:\.\d+)?/);
      return numberMatch ? numberMatch[0] : raw;
    }

    const options = Array.isArray(currentQuestion.options)
      ? currentQuestion.options
      : [];

    const lower = raw.toLowerCase();

    if (currentQuestion.type === "yes_no") {
      if (/^(yes|y|haan|han|हाँ|हां|हो|होय)\b/i.test(lower)) return "yes";
      if (/^(no|n|nahin|nahi|नहीं|नही)\b/i.test(lower)) return "no";
    }

    const exact = options.find(option => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : option.label;
      return (
        String(value || "").toLowerCase() === lower ||
        String(label || "").toLowerCase() === lower
      );
    });

    if (exact) {
      return typeof exact === "string" ? exact : exact.value;
    }

    // Free-text answers should reach the clinical engine unchanged.
    // No extra Gemini normalization request is made because the supplied
    // Python Gemini backend does not expose that task.
    return raw;
  };

  const handleClinicalAnswer = async answer => {
    if (!currentQuestion || triageLocked) return;

    const normalized = normalizeFreeformAnswer(answer);
    if (!normalized) return;

    const questionId = currentQuestion.id || `question_${clinicalHistory.length + 1}`;
    const historyEntry = {
      question_id: questionId,
      question: currentQuestion.question,
      answer: normalized,
      source: "conversation",
      recorded_at: new Date().toISOString()
    };

    if (
      data.answeredQuestions?.[questionId] ||
      clinicalHistory.some(item => item.question_id === questionId)
    ) {
      return;
    }

    setLoading(true);
    addMessage("user", String(answer), {
      question_id: questionId,
      normalized_answer: normalized
    });
    setInput("");
    update("aiInterview.transcript", String(answer), {
      questionId,
      question: currentQuestion.question,
      source: "conversation"
    });

    let nextQuestion = null;
    let outcome = null;

    try {
      const response = await fetch(CLINICAL_API.answer, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint,
          question_id: questionId,
          answer: normalized,
          patient_id: data.patient.abhaId || data.patient.phone || null,
          answered_facts: collectAnsweredFacts(data),
          answer_history: [...clinicalHistory, historyEntry]
        })
      });

      if (!response.ok) throw new Error("Clinical answer endpoint unavailable.");

      const parsed = parseClinicalResponse(await response.json());
      setClinicalOnline(true);

      const redFlagResult = parsed?.redflag;
      nextQuestion = normalizeQuestion(parsed?.question);
      outcome = parsed?.outcome || null;

      setClinicalHistory(prev => [...prev, historyEntry]);

      // Record the exact question as answered in the global no-repeat ledger.
      update("answeredQuestions", {
        ...(data.answeredQuestions || {}),
        [questionId]: {
          question_id: questionId,
          question: currentQuestion.question,
          answer: normalized,
          source: "conversation",
          fact_key: currentQuestion.fact_key || questionId,
          recorded_at: new Date().toISOString()
        }
      });

      if (redFlagResult?.is_red_flag) {
        setTriageLocked(true);
        update("aiInterview.redflag", redFlagResult);
        update("aiInterview.triageLocked", true);
        update("aiInterview.completed", true);

        const emergencyMessage =
          redFlagResult.message ||
          (language === "Hindi"
            ? "आपके जवाब में एक ऐसी जानकारी मिली है जिस पर तुरंत चिकित्सकीय ध्यान आवश्यक है।"
            : "Your response contains information that needs immediate clinical attention.");

        addMessage("assistant", emergencyMessage, { redflag: redFlagResult });
        await speak(emergencyMessage);
        return;
      }

      if (outcome) {
        update("aiInterview.clinicalOutcome", outcome);
      }

      if (parsed?.answerHistory) {
        setClinicalHistory(parsed.answerHistory);
      }

      if (parsed?.finished || !nextQuestion?.question) {
        update("aiInterview.completed", true);

        const done = outcome?.message ||
          (language === "Hindi"
            ? "धन्यवाद। आवश्यक क्लिनिकल जानकारी दर्ज हो गई है।"
            : "Thank you. The required clinical information has been captured.");

        addMessage("assistant", done);
        await speak(done);
        setCurrentQuestion(null);
        return;
      }

      // Gemini communicates; ClinicalEngine still controls the exact question.
      const acknowledgement = await askGeminiToAcknowledge(
        String(answer),
        nextQuestion
      );

      await showQuestion(nextQuestion, acknowledgement);
    } catch {
      setClinicalOnline(false);

      // Do NOT let Gemini invent a clinical question when the engine is down.
      // Preserve the last question and tell the user exactly what failed.
      const message = language === "Hindi"
        ? "आपका जवाब दर्ज नहीं हो पाया क्योंकि क्लिनिकल सेवा उपलब्ध नहीं है। कृपया फिर से कोशिश करें।"
        : "I couldn't record that answer because the clinical service is unavailable. Please try again.";

      addMessage("assistant", message);
      await speak(message);
    } finally {
      setLoading(false);
    }
  };

  const send = async preset => {
    const answer = String(preset ?? input).trim();
    if (!answer || loading || triageLocked) return;
    await handleClinicalAnswer(answer);
  };

  const startVoice = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceHint("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        setVoiceBusy(true);
        setVoiceHint("Converting your voice to text…");

        try {
          const blob = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm"
          });
          const file = new File([blob], "patient-voice.webm", {
            type: blob.type
          });

          const form = new FormData();
          form.append("file", file);
          form.append("language_code", languageCode);

          const response = await fetch(AI_API.speechToText, {
            method: "POST",
            body: form
          });

          if (!response.ok) throw new Error("STT unavailable.");

          const result = await response.json();
          const transcript = result.transcript || result.text || "";

          if (!transcript) throw new Error("No transcript returned.");

          setInput(transcript);
          setVoiceHint("Voice captured. Press Continue to submit the answer.");
        } catch {
          setVoiceHint("Voice service is unavailable. You can type your answer.");
        } finally {
          setVoiceBusy(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setVoiceHint("Listening… press Stop when finished.");
    } catch {
      setVoiceHint("Microphone permission was not granted.");
    }
  };

  const stopVoice = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  const browserVoice = () => {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceHint("Browser voice is not supported here.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = languageCode;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setRecording(true);
      setVoiceHint("Listening…");
    };

    recognition.onresult = e => {
      const transcript =
        e.results?.[0]?.[0]?.transcript || "";

      setInput(transcript);
      setVoiceHint("Voice captured. Press Continue to submit the answer.");
    };

    recognition.onerror = () => {
      setRecording(false);
      setVoiceHint("Browser voice failed. Try typing instead.");
    };

    recognition.onend = () => setRecording(false);
    recognition.start();
  };

  useEffect(() => {
    if (!complaint) return;
    if (data.aiInterview?.completed || triageLocked) return;
    if (currentQuestion) return;

    startClinicalSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint]);

  const options = Array.isArray(currentQuestion?.options)
    ? currentQuestion.options
    : [];

  const renderedOptions =
    currentQuestion?.type === "yes_no"
      ? [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" }
        ]
      : options;

  return (
    <section>
      <style>{`
        .ai-shell { max-width:1080px; margin:0 auto; }
        .ai-hero { display:flex; justify-content:space-between; gap:24px; margin-bottom:22px; }
        .ai-kicker { display:inline-flex; padding:6px 10px; border-radius:999px; background:#e9f6f4; color:#256e69; font-size:11px; font-weight:800; letter-spacing:.08em; }
        .ai-hero h1 { margin:10px 0 6px; font-size:34px; letter-spacing:-.03em; }
        .ai-hero p { margin:0; max-width:680px; color:#66737b; font-size:15px; }
        .ai-status { min-width:220px; padding:13px 15px; border:1px solid #e0e6e8; border-radius:14px; background:#fff; }
        .ai-status strong { display:block; font-size:13px; }
        .ai-status span { display:block; margin-top:4px; font-size:12px; color:#758087; }
        .ai-layout { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:18px; align-items:start; }
        .ai-main,.ai-side { background:#fff; border:1px solid #e0e6e8; border-radius:20px; box-shadow:0 12px 35px rgba(31,48,58,.06); }
        .ai-main { overflow:hidden; }
        .ai-topbar { display:flex; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #edf0f1; background:#fbfcfc; font-size:12px; color:#68757c; }
        .ai-question { padding:32px 30px 24px; background:linear-gradient(145deg,#f5fbfa,#fff); }
        .ai-label { color:#708087; font-size:11px; font-weight:800; letter-spacing:.09em; }
        .ai-question-text { margin-top:10px; font-size:27px; line-height:1.3; font-weight:700; color:#1f2b30; }
        .ai-options { display:flex; flex-wrap:wrap; gap:9px; margin-top:18px; }
        .ai-option { border:1px solid #b9d4d1 !important; background:#fff !important; color:#285e5a !important; border-radius:999px !important; padding:9px 14px !important; font-weight:650; }
        .ai-input-area { padding:20px 22px 22px; }
        .ai-input-row { display:flex; gap:9px; align-items:stretch; }
        .ai-input { flex:1; min-width:0; border:1px solid #cbd5d9; border-radius:13px; padding:14px 15px; font-size:15px; outline:none; }
        .ai-voice { border:1px solid #cbd8da !important; background:#fff !important; color:#3e6263 !important; border-radius:13px !important; padding:0 15px !important; font-weight:700; }
        .ai-voice.recording { background:#fff1f1 !important; border-color:#e4aaaa !important; color:#a54848 !important; }
        .ai-helper { margin-top:9px; font-size:12px; color:#758187; }
        .ai-side { padding:18px; }
        .ai-side-title { font-size:13px; font-weight:800; margin-bottom:14px; }
        .ai-stat { display:flex; justify-content:space-between; padding:11px 0; border-bottom:1px solid #edf0f1; font-size:13px; }
        .ai-stat:last-child { border-bottom:0; }
        .ai-stat span:last-child { font-weight:750; }
        .ai-redflag { margin-top:15px; padding:15px; border-radius:12px; border:1px solid #e7b2b2; background:#fff5f5; color:#813b3b; font-size:12px; line-height:1.5; }
        .ai-lock { margin-top:12px; padding:12px; border-radius:12px; background:#fff5f5; border:1px solid #efc2c2; color:#813b3b; font-size:12px; }
        .ai-transcript { margin-top:15px; border-top:1px solid #edf0f1; padding-top:14px; }
        .ai-turn { margin-top:10px; padding:8px 10px; border-radius:9px; background:#f7f9f9; font-size:11px; line-height:1.45; }
        .ai-nav { display:flex; justify-content:space-between; gap:10px; margin-top:18px; }
        @media(max-width:820px){ .ai-layout{grid-template-columns:1fr}.ai-hero{flex-direction:column}.ai-status{min-width:0}.ai-question-text{font-size:23px}.ai-input-row{flex-wrap:wrap}.ai-input{flex-basis:100%} }
      `}</style>

      <div className="ai-shell">
        <div className="ai-hero">
          <div>
            <span className="ai-kicker">✦ AI + CLINICAL ENGINE</span>
            <h1>Let's understand what’s wrong.</h1>
            <p>
              The clinical engine controls the question path and red flags.
              Gemini keeps the conversation natural without changing the clinical pathway.
              Previously captured information is never intentionally asked again.
            </p>
          </div>

          <div className="ai-status">
            <strong>
              Clinical engine: {clinicalOnline === true ? "connected" : clinicalOnline === false ? "unavailable" : "connecting…"}
            </strong>
            <span>
              Gemini: {online === true ? "connected" : online === false ? "offline" : "ready"} · {language}
            </span>
            <span>Complaint: {data.chiefComplaint.join(", ") || "not selected"}</span>
          </div>
        </div>

        {!complaint && (
          <div className="card">
            <strong>Select the main complaint first.</strong>
            <p>The clinical question pathway cannot start until a complaint is selected.</p>
            <button className="primary" onClick={() => setSection("complaint")}>Choose complaint →</button>
          </div>
        )}

        {complaint && (
          <div className="ai-layout">
            <div className="ai-main">
              <div className="ai-topbar">
                <span><strong>Patient interview</strong></span>
                <span>{clinicalHistory.length} clinical answer{clinicalHistory.length === 1 ? "" : "s"} captured</span>
              </div>

              <div className="ai-question">
                <div className="ai-label">
                  {triageLocked ? "CLINICAL PRIORITY" : "MEDIKIOSK AI"}
                </div>

                <div className="ai-question-text">
                  {loading && !currentQuestion
                    ? "I'm preparing the next relevant question…"
                    : redflag?.message
                      ? redflag.message
                      : lastAI?.content || currentQuestion?.question || "Starting your clinical interview…"}
                </div>

                {!triageLocked && renderedOptions.length > 0 && (
                  <div className="ai-options">
                    {renderedOptions.map(option => {
                      const value = typeof option === "string" ? option : option.value;
                      const label = typeof option === "string" ? option : option.label;

                      return (
                        <button
                          key={value}
                          type="button"
                          className="ai-option"
                          onClick={() => send(value)}
                          disabled={loading}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!triageLocked && (
                <div className="ai-input-area">
                  <div className="ai-label" style={{ marginBottom:7 }}>YOUR ANSWER</div>

                  <div className="ai-input-row">
                    <input
                      className="ai-input"
                      type={currentQuestion?.type === "number" ? "number" : "text"}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") send();
                      }}
                      placeholder={
                        currentQuestion?.type === "number"
                          ? "Enter a number…"
                          : language === "Hindi"
                            ? "अपना जवाब अपने शब्दों में बताएं…"
                            : "Answer naturally in your own words…"
                      }
                      disabled={loading || voiceBusy}
                    />

                    <button
                      type="button"
                      className={`ai-voice ${recording ? "recording" : ""}`}
                      onClick={recording ? stopVoice : startVoice}
                      disabled={loading || voiceBusy}
                    >
                      {recording ? "⏹ Stop" : "🎙 Voice"}
                    </button>

                    <button
                      type="button"
                      className="primary"
                      onClick={() => send()}
                      disabled={loading || !input.trim()}
                    >
                      Continue →
                    </button>
                  </div>

                  <div className="ai-helper">
                    {voiceHint ||
                      "Type, choose an option, or answer by voice. Gemini handles the conversation; the clinical engine controls the medical questions."}
                  </div>
                </div>
              )}
            </div>

            <aside className="ai-side">
              <div className="ai-side-title">Interview status</div>

              <div className="ai-stat">
                <span>Questions answered</span>
                <span>{clinicalHistory.length}</span>
              </div>
              <div className="ai-stat">
                <span>Known facts</span>
                <span>{Object.keys(collectAnsweredFacts(data)).length}</span>
              </div>
              <div className="ai-stat">
                <span>Mode</span>
                <span>{data.mode}</span>
              </div>
              <div className="ai-stat">
                <span>Status</span>
                <span>{triageLocked ? "STOPPED" : data.aiInterview?.completed ? "Captured" : "In progress"}</span>
              </div>

              {redflag && (
                <div className="ai-redflag" role="alert">
                  <strong>🚨 Immediate clinical attention</strong>
                  <div style={{marginTop:6}}>{redflag.message}</div>
                  <div style={{marginTop:6}}>
                    <strong>Action:</strong> {redflag.recommended_action}
                  </div>
                </div>
              )}

              {triageLocked && (
                <div className="ai-lock">
                  <strong>No further questions will be asked.</strong>
                  <div style={{marginTop:4}}>
                    The interview is locked so the priority response is not delayed.
                  </div>
                </div>
              )}

              {data.aiInterview?.clinicalOutcome && !redflag && (
                <div className="card" style={{marginTop:14}}>
                  <strong>Clinical pathway outcome</strong>
                  <p>{data.aiInterview.clinicalOutcome.message}</p>
                </div>
              )}

              <div className="ai-transcript">
                <details>
                  <summary>View interview transcript</summary>

                  {messages.map((m, i) => (
                    <div className="ai-turn" key={`${m.role}-${i}`}>
                      <strong>{m.role === "user" ? "Patient" : "MediKiosk AI"}</strong>
                      <div>{m.content}</div>
                    </div>
                  ))}
                </details>
              </div>
            </aside>
          </div>
        )}

        <div className="ai-nav">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setInput("");
              setMessages([]);
              setClinicalHistory([]);
              setCurrentQuestion(null);
              setTriageLocked(false);
              setOnline(null);
              setClinicalOnline(null);
              update("aiInterview", {
                ...data.aiInterview,
                messages: [],
                transcript: "",
                completed: false,
                redflag: null,
                summary: null,
                clinicalOutcome: null,
                currentQuestion: null,
                questionHistory: [],
                triageLocked: false
              });
            }}
          >
            ↻ Restart interview
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => {
              update("aiInterview.completed", true);
              setSection("hpi");
            }}
            disabled={clinicalHistory.length === 0 || triageLocked}
          >
            Continue to detailed history →
          </button>
        </div>
      </div>
    </section>
  );
}

function ComplaintSection({ data, toggle, update, setSection }) {
  const selected = data.chiefComplaint || [];
  const hasChestPain = selected.includes("Chest pain");
  const hasBreathlessness = selected.includes("Breathlessness");
  const immediateConcern = hasChestPain && hasBreathlessness;

  return (
    <section>
      <h1>{t(data.patient.language, "chiefComplaint")}</h1>
      <p>
        Select the main complaint(s). This is the only place where the presenting
        complaint is chosen. The AI/clinical engine will use this selection and will
        not ask you to repeat it.
      </p>

      <QuestionCard title="What is the main problem bringing you here today?">
        <ChoiceButtons
          value={selected}
          multi
          options={symptomOptions}
          onChange={next => update("chiefComplaint", next, {
            factKey: "presenting.complaints",
            label: "Chief complaint",
            source: "frontend"
          })}
        />
      </QuestionCard>

      {immediateConcern && (
        <div className="alert alert-critical" role="alert">
          <strong>🚨 Priority alert</strong>
          <span>
            Chest pain and breathlessness have both been selected. Please alert triage staff immediately.
            The AI interview will still stop automatically if the clinical engine detects any further red flag.
          </span>
        </div>
      )}

      <div className="card">
        <strong>Selected complaints:</strong>{" "}
        {selected.length ? selected.join(", ") : "None selected"}
      </div>

      <div className="navigation">
        <span />
        <button
          className="primary"
          disabled={!selected.length}
          onClick={() => setSection("aiInterview")}
        >
          Start controlled AI interview →
        </button>
      </div>
    </section>
  );
}

function HPISection({ data, update }) {
  const clinicalAnswers = data.aiInterview?.questionHistory || [];
  const redflag = data.aiInterview?.redflag;

  return (
    <section>
      <h1>History of Present Illness</h1>
      <p>
        This page is a review/edit layer. It does not re-ask the clinical questions
        already covered by the AI + ClinicalEngine.
      </p>

      {redflag && (
        <div className="alert alert-critical" role="alert">
          <strong>Priority response captured</strong>
          <span>{redflag.message}</span>
        </div>
      )}

      <div className="card">
        <h2>Clinical-engine answers</h2>
        {clinicalAnswers.length === 0 ? (
          <p>No complaint-specific answers have been captured yet.</p>
        ) : (
          clinicalAnswers.map((item, index) => (
            <div className="summary-row" key={`${item.question_id}-${index}`}>
              <strong>{item.question}</strong>
              <span>{String(item.answer)}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Additional HPI details</h2>
        <p className="progress-note">
          These are editable fields only. They are not repeated as interview questions.
        </p>

        <div className="grid">
          <label>
            Location
            <input
              value={data.hpi.location}
              onChange={e => update("hpi.location", e.target.value)}
              placeholder="e.g. chest, abdomen, head"
            />
          </label>

          <label>
            Severity
            <select
              value={data.hpi.severity}
              onChange={e => update("hpi.severity", e.target.value, {
                factKey: "symptom.severity",
                label: "Symptom severity"
              })}
            >
              <option value="">Not recorded</option>
              <option>Mild</option>
              <option>Moderate</option>
              <option>Severe</option>
            </select>
          </label>

          <label>
            Character
            <input
              value={data.hpi.character}
              onChange={e => update("hpi.character", e.target.value)}
              placeholder="e.g. pressure, sharp, burning"
            />
          </label>

          <label>
            Radiation
            <input
              value={data.hpi.radiation}
              onChange={e => update("hpi.radiation", e.target.value)}
              placeholder="If applicable"
            />
          </label>

          <label>
            Measured temperature (°C)
            <input
              type="number"
              value={data.hpi.temperature}
              onChange={e => update("hpi.temperature", e.target.value, {
                factKey: "fever.temperature",
                label: "Measured temperature"
              })}
              placeholder="If available"
            />
          </label>
        </div>

        <label>
          Additional associated details
          <textarea
            value={data.hpi.narrative}
            onChange={e => update("hpi.narrative", e.target.value)}
            placeholder="Anything important that was not already captured?"
          />
        </label>
      </div>
    </section>
  );
}

function ChoiceButtons({ value, options, onChange, multi = false }) {
  const selected = multi ? (value || []) : value;
  return (
    <div className="option-grid">
      {options.map(option => {
        const isSelected = multi
          ? selected.includes(option)
          : selected === option;

        return (
          <button
            type="button"
            key={option}
            className={isSelected ? "selected" : ""}
            onClick={() => {
              if (multi) {
                const current = Array.isArray(selected) ? selected : [];
                const next = current.includes(option)
                  ? current.filter(item => item !== option)
                  : [...current.filter(item => item !== "None"), option];
                onChange(next);
              } else {
                onChange(option);
              }
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function QuestionCard({ title, children }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function PastMedicalSection({ data, update }) {
  return (
    <section>
      <h1>Past Medical History</h1>
      <p>Just the key medical history relevant to your care.</p>

      <QuestionCard title="Have you ever been diagnosed with any major health condition?">
        <ChoiceButtons
          value={data.conditions?.[0] || ""}
          options={["Diabetes", "High BP", "Heart disease", "Asthma or lung disease", "Kidney disease", "Thyroid condition", "Other", "None"]}
          onChange={value => update("pastMedicalHistory.conditions", value === "None" ? ["None"] : [value])}
        />
      </QuestionCard>

      {data.conditions?.[0] && data.conditions[0] !== "None" && (
        <label>
          Any other important diagnosed conditions?
          <input
            value={data.conditions.filter(item => item !== "None").slice(1).join(", ")}
            onChange={e => {
              const base = data.conditions[0];
              const extra = e.target.value ? e.target.value.split(",").map(x => x.trim()).filter(Boolean) : [];
              update("pastMedicalHistory.conditions", [base, ...extra]);
            }}
            placeholder="Optional"
          />
        </label>
      )}

      <QuestionCard title="Have you ever been admitted to a hospital for an illness?">
        <ChoiceButtons
          value={data.hospitalization}
          options={["Yes", "No"]}
          onChange={value => update("pastMedicalHistory.hospitalization", value)}
        />
        {data.hospitalization === "Yes" && (
          <input
            value={data.hospitalizationDetails || ""}
            onChange={e => update("pastMedicalHistory.hospitalizationDetails", e.target.value)}
            placeholder="What was it for?"
          />
        )}
      </QuestionCard>

      <QuestionCard title="Are you currently being treated for any health condition?">
        <ChoiceButtons
          value={data.currentTreatment}
          options={["Yes", "No"]}
          onChange={value => update("pastMedicalHistory.currentTreatment", value)}
        />
        {data.currentTreatment === "Yes" && (
          <input
            value={data.currentTreatmentDetails || ""}
            onChange={e => update("pastMedicalHistory.currentTreatmentDetails", e.target.value)}
            placeholder="What condition?"
          />
        )}
      </QuestionCard>
    </section>
  );
}

function PastSurgicalSection({ data, update, setSection }) {
  const nextSection = () => setSection("drugs");

  return (
    <section>
      <h1>Past Surgical History</h1>
      <p>Tell us only about previous surgeries or major procedures.</p>

      <QuestionCard title="Have you ever had surgery or a major procedure?">
        <ChoiceButtons
          value={data.hadSurgery}
          options={["Yes", "No"]}
          onChange={value => {
            update("pastSurgicalHistory.hadSurgery", value);
            if (value === "No") nextSection();
          }}
        />
      </QuestionCard>

      {data.hadSurgery === "Yes" && (
        <>
          <label>
            What surgery or procedure did you have?
            <input
              value={data.surgeryDetails}
              onChange={e => update("pastSurgicalHistory.surgeryDetails", e.target.value)}
              placeholder="e.g. appendectomy"
            />
          </label>

          <QuestionCard title="Approximately when was it done?">
            <ChoiceButtons
              value={data.surgeryWhen}
              options={["Less than 1 year ago", "1–5 years ago", "More than 5 years ago", "Not sure"]}
              onChange={value => update("pastSurgicalHistory.surgeryWhen", value)}
            />
          </QuestionCard>
        </>
      )}
    </section>
  );
}

function DrugHistorySection({ data, update, setSection }) {
  return (
    <section>
      <h1>Drug History</h1>
      <p>We only ask the follow-up questions if you are currently taking medicines.</p>

      <QuestionCard title="Are you currently taking any medicines?">
        <ChoiceButtons
          value={data.taking}
          options={["Yes", "No"]}
          onChange={value => {
            update("drugs.taking", value);
            if (value === "No") setSection("allergies");
          }}
        />
      </QuestionCard>

      {data.taking === "Yes" && (
        <>
          <label>
            What medicines are you currently taking?
            <textarea
              value={data.medicines}
              onChange={e => update("drugs.medicines", e.target.value)}
              placeholder="Medicine names, if known..."
            />
          </label>

          <QuestionCard title="How regularly do you take them?">
            <ChoiceButtons
              value={data.regularity}
              options={["Every day", "Sometimes", "Only when needed", "Not regularly"]}
              onChange={value => update("drugs.regularity", value)}
            />
          </QuestionCard>

          <QuestionCard title="Are you taking any supplements, herbal medicines, or traditional medicines?">
            <ChoiceButtons
              value={data.supplements}
              options={["Yes", "No"]}
              onChange={value => update("drugs.supplements", value)}
            />
            {data.supplements === "Yes" && (
              <input
                value={data.supplementDetails || ""}
                onChange={e => update("drugs.supplementDetails", e.target.value)}
                placeholder="What are you taking?"
              />
            )}
          </QuestionCard>
        </>
      )}
    </section>
  );
}

function AllergyHistorySection({ data, update, setSection }) {
  return (
    <section>
      <h1>Allergy History</h1>
      <p>Knowing about allergies helps keep your treatment safe.</p>

      <QuestionCard title="Do you have any known allergies?">
        <ChoiceButtons
          value={data.hasAllergy}
          options={["Yes", "No", "Not sure"]}
          onChange={value => {
            update("allergies.hasAllergy", value);
            if (value === "No") setSection("family");
          }}
        />
      </QuestionCard>

      {data.hasAllergy === "Yes" && (
        <>
          <QuestionCard title="What are you allergic to?">
            <ChoiceButtons
              value={data.allergyTypes}
              multi
              options={["Medicines", "Foods", "Dust or pollen", "Other"]}
              onChange={value => update("allergies.allergyTypes", value)}
            />
          </QuestionCard>

          <label>
            What happens when you are exposed to it?
            <input
              value={data.reaction}
              onChange={e => update("allergies.reaction", e.target.value)}
              placeholder="e.g. rash, swelling, breathing difficulty"
            />
          </label>
        </>
      )}
    </section>
  );
}

function FamilyHistorySection({ data, update }) {
  return (
    <section>
      <h1>Family History</h1>
      <p>We are only looking for important conditions in your immediate family.</p>

      <QuestionCard title="Does anyone in your immediate family have an important health condition?">
        <ChoiceButtons
          value={data.importantCondition}
          options={["Yes", "No", "Not sure"]}
          onChange={value => update("familyHistory.importantCondition", value)}
        />
      </QuestionCard>

      {data.importantCondition === "Yes" && (
        <>
          <QuestionCard title="Which conditions occur in your family?">
            <ChoiceButtons
              value={data.conditions}
              multi
              options={["Diabetes", "High BP", "Heart disease", "Cancer", "Asthma or lung disease", "Mental health condition", "Other"]}
              onChange={value => update("familyHistory.conditions", value)}
            />
          </QuestionCard>

          <QuestionCard title="Who in your family has it?">
            <ChoiceButtons
              value={data.relation}
              options={["Parent", "Sibling", "Grandparent", "Other"]}
              onChange={value => update("familyHistory.relation", value)}
            />
          </QuestionCard>
        </>
      )}
    </section>
  );
}

function PersonalHistorySection({ data, update }) {
  return (
    <section>
      <h1>Personal History</h1>
      <p>A few quick questions about your usual routine and lifestyle.</p>

      <QuestionCard title="How would you describe your usual diet?">
        <ChoiceButtons
          value={data.diet}
          options={["Vegetarian", "Non-vegetarian", "Mixed", "Other"]}
          onChange={value => update("personalHistory.diet", value)}
        />
      </QuestionCard>

      <QuestionCard title="How is your usual sleep?">
        <ChoiceButtons
          value={data.sleep}
          options={["Good", "Sometimes disturbed", "Frequently disturbed"]}
          onChange={value => update("personalHistory.sleep", value)}
        />
      </QuestionCard>

      <QuestionCard title="How physically active are you on a normal day?">
        <ChoiceButtons
          value={data.activity}
          options={["Mostly sedentary", "Lightly active", "Moderately active", "Very active"]}
          onChange={value => update("personalHistory.activity", value)}
        />
      </QuestionCard>

      <label>
        Are there any regular habits or lifestyle factors that are important for your health?
        <textarea
          value={data.lifestyle}
          onChange={e => update("personalHistory.lifestyle", e.target.value)}
          placeholder="Optional..."
        />
      </label>
    </section>
  );
}

function ROSSection({ data, update }) {
  const complaintSet = new Set((data.chiefComplaint || []).map(x => x.toLowerCase()));

  const symptomMap = {
    general: ["Fever", "Fatigue", "Weight change", "Loss of appetite"],
    respiratory: ["Cough", "Breathlessness", "Wheezing", "Chest discomfort"],
    gastrointestinal: ["Nausea", "Vomiting", "Abdominal pain", "Change in bowel habits"],
    neurological: ["Headache", "Dizziness", "Weakness", "Numbness"]
  };

  const aliases = {
    "fever": ["fever"],
    "cough": ["cough"],
    "breathlessness": ["breathlessness"],
    "chest discomfort": ["chest pain"],
    "nausea": ["nausea"],
    "vomiting": ["vomiting"],
    "abdominal pain": ["abdominal pain"],
    "headache": ["headache"],
    "weakness": ["weakness"]
  };

  const alreadyCovered = symptom => {
    const keys = aliases[symptom.toLowerCase()] || [symptom.toLowerCase()];
    return keys.some(key => complaintSet.has(key));
  };

  const toggle = (group, symptom) => {
    const current = data[group] || [];
    const next = current.includes(symptom)
      ? current.filter(x => x !== symptom)
      : [...current.filter(x => x !== "None"), symptom];
    update(`ros.${group}`, next, {
      factKey: `ros.${group}`,
      label: `${group} review`
    });
  };

  const renderGroup = (group, title, symptoms) => {
    const visibleSymptoms = symptoms.filter(symptom => !alreadyCovered(symptom));

    return (
      <div className="card" key={group}>
        <h3>{title}</h3>

        {visibleSymptoms.length === 0 ? (
          <p className="progress-note">All symptoms in this group are already covered by the presenting complaint/clinical interview.</p>
        ) : (
          <div className="option-grid">
            {[...visibleSymptoms, "None"].map(symptom => (
              <button
                type="button"
                key={symptom}
                className={(data[group] || []).includes(symptom) ? "selected" : ""}
                onClick={() => {
                  if (symptom === "None") {
                    update(`ros.${group}`, ["None"], {
                      factKey: `ros.${group}`,
                      label: `${group} review`
                    });
                  } else {
                    toggle(group, symptom);
                  }
                }}
              >
                {symptom}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section>
      <h1>Review of Systems</h1>
      <p>
        Only symptoms not already selected as the chief complaint are shown.
        This prevents the ROS from re-asking the same presenting symptom.
      </p>

      {renderGroup("general", "General symptoms", symptomMap.general)}
      {renderGroup("respiratory", "Breathing / chest symptoms", symptomMap.respiratory)}
      {renderGroup("gastrointestinal", "Stomach / bowel symptoms", symptomMap.gastrointestinal)}
      {renderGroup("neurological", "Neurological symptoms", symptomMap.neurological)}
    </section>
  );
}

function AYUSHSection({ data, update }) {
  const Question = ({ label, path, options, type = "select", placeholder = "" }) => {
    const value = path.split(".").reduce((obj, key) => obj?.[key], data) || "";

    if (type === "textarea") {
      return (
        <label>
          {label}
          <textarea
            value={value}
            onChange={e => update(`ayush.${path}`, e.target.value)}
            placeholder={placeholder}
          />
        </label>
      );
    }

    if (type === "number") {
      return (
        <label>
          {label}
          <input
            type="number"
            value={value}
            onChange={e => update(`ayush.${path}`, e.target.value)}
            placeholder={placeholder}
          />
        </label>
      );
    }

    return (
      <label>
        {label}
        <select
          value={value}
          onChange={e => update(`ayush.${path}`, e.target.value)}
        >
          <option value="">Select</option>
          {options.map(option => <option key={option}>{option}</option>)}
        </select>
      </label>
    );
  };

  const Category = ({ number, title, focus, children }) => (
    <div className="card">
      <h2>{number}. {title}</h2>
      <p><strong>Information focus:</strong> {focus}</p>
      {children}
    </div>
  );

  return (
    <section>
      <h1>AYUSH History — Dashavidha Pariksha</h1>
      <p>
        A focused patient-friendly assessment. Basic patient details such as age,
        gender and language are already captured above and are not repeated here.
      </p>

      <Category number="1" title="Prakriti" focus="Usual body characteristics and baseline tendencies">
        <Question
          label="How would you describe your usual body build?"
          path="prakriti.bodyBuild"
          options={["Lean", "Medium", "Broad or solid", "Not sure"]}
        />
        <Question
          label="When your routine and diet are fairly normal, does your weight usually stay stable, tend to be low, or tend to increase easily?"
          path="prakriti.weightTendency"
          options={["Low", "Stable", "Increases easily", "Unsure"]}
        />
        <Question
          label="How would you describe your usual appetite when you are well?"
          path="prakriti.appetiteTendency"
          options={["Irregular", "Strong", "Moderate-steady", "Variable"]}
        />
        <Question
          label="When you are generally well, how does your digestion usually feel after meals?"
          path="prakriti.digestionTendency"
          options={["Often irregular", "Often fast or strong", "Usually slow or heavy", "Usually comfortable", "Unsure"]}
        />
        <Question
          label="When you are well, how is your usual sleep?"
          path="prakriti.sleepPattern"
          options={["Light/easily disturbed", "Moderate", "Deep/long", "Variable"]}
        />
        <Question
          label="Do you usually feel more comfortable in cool conditions, warm conditions, or neither?"
          path="prakriti.temperaturePreference"
          options={["Prefer warmth", "Prefer coolness", "Neither"]}
        />
      </Category>

      <Category number="2" title="Vikriti" focus="Current changes from your normal state">
        <Question
          label="What has changed from your usual health or routine?"
          path="vikriti.changeFromNormal"
          type="textarea"
          placeholder="Describe any important changes..."
        />
        <Question
          label="Compared with your usual appetite, how is your appetite now?"
          path="vikriti.currentAppetite"
          options={["Lower", "Higher", "About the same", "Variable"]}
        />
        <Question
          label="How has your digestion been recently?"
          path="vikriti.currentDigestion"
          options={["Normal", "Indigestion", "Bloating/gas", "Burning/acidity", "Heavy/slow", "Other"]}
        />
        <Question
          label="Have your bowel movements changed recently?"
          path="vikriti.bowelHabit"
          options={["No", "Constipation", "Loose stools", "More frequent", "Less frequent", "Other"]}
        />
        <Question
          label="Has your sleep changed recently?"
          path="vikriti.sleepChange"
          options={["No", "Difficulty falling asleep", "Frequent waking", "Sleeping more", "Other"]}
        />
        <Question
          label="How has your energy been recently compared with normal?"
          path="vikriti.energyChange"
          options={["Lower", "Higher/restless", "About the same", "Variable"]}
        />
      </Category>

      <Category number="3" title="Sara" focus="General physical health and recovery">
        <Question
          label="How would you describe your overall physical strength and health when you are well?"
          path="sara.overallPhysicalHealth"
          options={["Poor", "Fair", "Good", "Very good"]}
        />
        <Question
          label="After illness, injury or significant exertion, how well do you usually recover?"
          path="sara.recovery"
          options={["Slowly", "Moderately", "Quickly", "Unsure"]}
        />
        <Question
          label="How would you rate your usual overall vitality?"
          path="sara.generalVitality"
          options={["Low", "Moderate", "High", "Very high"]}
        />
      </Category>

      <Category number="4" title="Samhanana" focus="Body frame and musculoskeletal build">
        <Question
          label="How would you describe your natural body frame?"
          path="samhanana.bodyFrame"
          options={["Small", "Medium", "Large"]}
        />
        <Question
          label="How would you describe your bones and joints?"
          path="samhanana.boneJointBuild"
          options={["Fine/small", "Medium", "Large/strong", "Unsure"]}
        />
        <Question
          label="Do your joints generally feel stable and strong?"
          path="samhanana.jointStability"
          options={["Yes", "Sometimes", "No", "Unsure"]}
        />
      </Category>

      <Category number="5" title="Pramana" focus="Objective body measurements">
        <div className="grid">
          <Question label="What is your height? (cm)" path="pramana.height" type="number" />
          <Question label="What is your current weight? (kg)" path="pramana.weight" type="number" />
        </div>
        <Question
          label="If available, what is your waist circumference? (cm)"
          path="pramana.waistCircumference"
          type="number"
          placeholder="Leave empty if not available"
        />
      </Category>

      <Category number="6" title="Satmya" focus="What you are accustomed to and tolerate well">
        <Question
          label="Are there foods that you regularly eat without discomfort or problems?"
          path="satmya.foodTolerance"
          type="textarea"
          placeholder="List foods if applicable..."
        />
        <Question
          label="Are there foods that commonly cause discomfort, bloating, loose stools, acidity, rash, or another reaction?"
          path="satmya.foodIntolerance"
          type="textarea"
          placeholder="List foods and reactions if applicable..."
        />
        <Question
          label="Which environment do you generally tolerate better?"
          path="satmya.climateTolerance"
          options={["Hot", "Cold", "Both similarly", "Unsure"]}
        />
      </Category>

      <Category number="7" title="Satva" focus="Mental resilience and coping">
        <Question
          label="When you face a stressful situation, how do you usually respond?"
          path="sattva.stressResponse"
          options={["Become easily overwhelmed", "Usually cope", "Remain calm and focused", "Variable"]}
        />
        <Question
          label="How well do you usually manage difficult situations?"
          path="sattva.copingAbility"
          options={["With difficulty", "Moderately well", "Very well"]}
        />
        <Question
          label="How well can you usually stay focused on a task?"
          path="sattva.concentration"
          options={["Poor", "Fair", "Good", "Very good"]}
        />
        <Question
          label="When you are under stress, do you usually have someone you can rely on?"
          path="sattva.support"
          options={["Yes", "Sometimes", "No", "Prefer not to say"]}
        />
      </Category>

      <Category number="8" title="Ahara Shakti" focus="Appetite, meal capacity and meal tolerance">
        <Question
          label="How often do you usually feel hungry during the day?"
          path="aharaShakti.usualHunger"
          options={["Rarely", "1–2 times", "3 times", "Frequently"]}
        />
        <Question
          label="How much food can you usually eat comfortably at one meal?"
          path="aharaShakti.mealCapacity"
          options={["Small amount", "Moderate amount", "Large amount", "Variable"]}
        />
        <Question
          label="After a normal meal, how do you usually feel?"
          path="aharaShakti.mealTolerance"
          options={["Comfortable", "Heavy or sleepy", "Burning/acidity", "Bloating/gas", "Other"]}
        />
      </Category>

      <Category number="9" title="Vyayama Shakti" focus="Physical activity capacity and endurance">
        <Question
          label="How physically active are you on a normal day?"
          path="vyayamaShakti.usualActivity"
          options={["Mostly sedentary", "Lightly active", "Moderately active", "Very active"]}
        />
        <Question
          label="How much continuous physical activity can you usually do comfortably?"
          path="vyayamaShakti.exerciseTolerance"
          options={["Less than 10 min", "10–30 min", "30–60 min", "More than 60 min"]}
        />
        <Question
          label="During usual activity, do you become unusually tired or short of breath?"
          path="vyayamaShakti.breathlessnessFatigue"
          options={["No", "Sometimes", "Often", "Depends on activity"]}
        />
        <Question
          label="After exercise, how quickly do you usually return to your normal energy level?"
          path="vyayamaShakti.recovery"
          options={["Slowly", "Moderately", "Quickly"]}
        />
        <Question
          label="What types of exercise or physical activity do you normally do?"
          path="vyayamaShakti.usualExercise"
          type="textarea"
          placeholder="Describe usual exercise or physical activity..."
        />
      </Category>

      <Category number="10" title="Vaya" focus="Age and life stage">
        <div className="card">
          <strong>Age is already captured in Patient Identification.</strong>
          <p>
            No duplicate age or date-of-birth question is shown here.
            If a practitioner needs additional life-stage context, it can be entered below.
          </p>
        </div>
        <Question
          label="Are there any age-related life-stage factors that are important for today's assessment?"
          path="vaya.lifeStageContext"
          type="textarea"
          placeholder="Optional..."
        />
      </Category>
    </section>
  );
}

function Review({ data, redFlag, onSubmit }) {
  const value = (v) => v && (Array.isArray(v) ? v.length ? v.join(", ") : "" : v) ? v : "Not provided";
  return (
    <section>
      <h1>Review & Submit</h1>
      <p>Review the structured history before submission.</p>

      {redFlag && (
        <div className="alert alert-critical" role="alert">
          <strong>Priority alert:</strong>
          <span>Chest pain with breathlessness has been selected. This should be routed to triage staff.</span>
        </div>
      )}

      <Summary title="Patient" rows={[
        ["Name", value(data.patient.name)],
        ["Age", value(data.patient.age)],
        ["Gender", value(data.patient.gender)],
        ["ABHA ID", value(data.patient.abhaId)],
        ["Language", value(data.patient.language)],
        ["Mode", value(data.mode)]
      ]} />

      <Summary title="AI Case-Taking" rows={[
        ["Interview", data.aiInterview?.messages?.length
          ? data.aiInterview.messages.map(m => `${m.role === "user" ? "Patient" : "AI"}: ${m.content}`).join(" | ")
          : "No AI interview recorded"]
      ]} />

      <Summary title="Chief Complaint" rows={[
        ["Complaints", value(data.chiefComplaint)],
        ["Other", value(data.otherComplaint)]
      ]} />

      <Summary title="History of Present Illness" rows={[
        ["Location", value(data.hpi.location)],
        ["Severity", value(data.hpi.severity)],
        ["Started", value(data.hpi.onset)],
        ["Started suddenly/gradually", value(data.hpi.course)],
        ["Course", value(data.hpi.duration)],
        ["Character", value(data.hpi.character)],
        ["Radiation", value(data.hpi.radiation)],
        ["Better/worse factors", value(data.hpi.narrative)]
      ]} />

      <Summary title="Past Medical History" rows={[
        ["Conditions", value(data.pastMedicalHistory.conditions)],
        ["Hospitalization", value(data.pastMedicalHistory.hospitalization)],
        ["Current treatment", value(data.pastMedicalHistory.currentTreatment)]
      ]} />

      <Summary title="Past Surgical History" rows={[
        ["Surgery", value(data.pastSurgicalHistory.hadSurgery)],
        ["Procedure", value(data.pastSurgicalHistory.surgeryDetails)],
        ["When", value(data.pastSurgicalHistory.surgeryWhen)]
      ]} />

      <Summary title="Drug History" rows={[
        ["Currently taking medicines", value(data.drugs.taking)],
        ["Medicines", value(data.drugs.medicines)],
        ["Regularity", value(data.drugs.regularity)],
        ["Supplements / herbal / traditional medicines", value(data.drugs.supplements)]
      ]} />

      <Summary title="Allergy History" rows={[
        ["Known allergy", value(data.allergies.hasAllergy)],
        ["Allergy type", value(data.allergies.allergyTypes)],
        ["Reaction", value(data.allergies.reaction)]
      ]} />

      <Summary title="Family History" rows={[
        ["Important family condition", value(data.familyHistory.importantCondition)],
        ["Conditions", value(data.familyHistory.conditions)],
        ["Relation", value(data.familyHistory.relation)]
      ]} />

      <Summary title="Personal History" rows={[
        ["Diet", value(data.personalHistory.diet)],
        ["Sleep", value(data.personalHistory.sleep)],
        ["Activity", value(data.personalHistory.activity)],
        ["Lifestyle", value(data.personalHistory.lifestyle)]
      ]} />

      <Summary title="Review of Systems" rows={Object.entries(data.ros).map(([k, v]) => [k, value(v)])} />

      <Summary title="Uploaded Documents" rows={[
        ["Files", data.documents.length ? data.documents.map(d => `${d.name} (${d.category})`).join(", ") : "No documents uploaded"]
      ]} />

      {data.mode === "AYUSH" && (
        <Summary title="AYUSH — Dashavidha Pariksha" rows={Object.entries(data.ayush).map(([k, v]) => [k, value(v)])} />
      )}

      <button className="primary large" onClick={onSubmit}>Confirm & Submit Case</button>
    </section>
  );
}

function Summary({ title, rows }) {
  return (
    <div className="summary">
      <h2>{title}</h2>
      {rows.map(([k, v], i) => <div className="summary-row" key={i}><strong>{k}</strong><span>{v}</span></div>)}
    </div>
  );
}

function Submitted({ data, onNew }) {
  return (
    <main className="single">
      <h1>Case Submitted</h1>
      <p>The case has been stored locally for this MVP and is ready for the next integration layer.</p>
      <Summary title="Submission" rows={[
        ["Patient", data.patient.name || "Unnamed"],
        ["Status", "Submitted"],
        ["Submitted at", new Date(data.submittedAt).toLocaleString()],
        ["Red flag", data.chiefComplaint.includes("Chest pain") && data.chiefComplaint.includes("Breathlessness") ? "Priority triage required" : "None detected by current demo rule"]
      ]} />
      <button className="primary large" onClick={onNew}>Start New Case</button>
    </main>
  );
}

export default App;
