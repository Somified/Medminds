import React, { useEffect, useMemo, useState } from "react";

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
    course: ""
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

const API_BASE = "http://localhost:8000";

async function sendChatToGemini({
  patientLanguage = "English",
  careSystem = "allopathic",
  patientAgeBand = "30-40",
  conversationHistory = []
}) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      patient_language: patientLanguage,
      care_system: careSystem,
      patient_age_band: patientAgeBand,
      conversation_history: conversationHistory
    })
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to contact the AI assistant.");
  }

  return result;
}

const sections = [
  ["complaint", "Chief Complaint"],
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
      return normalizeCase(JSON.parse(saved));
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

  const hasChestPain = caseData.chiefComplaint.includes("Chest pain");
  const hasBreathlessness = caseData.chiefComplaint.includes("Breathlessness");
  const redFlag = useMemo(() => {
    return hasChestPain && hasBreathlessness;
  }, [hasChestPain, hasBreathlessness]);

  useEffect(() => {
    if (redFlag) {
      setAlert({
        message: "Potential emergency symptoms detected. Please alert triage staff immediately.",
        severity: "critical"
      });
    }
  }, [redFlag]);

  const update = (path, value) => {
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
    setSection("documents");
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

            {section !== "review" && section !== "documents" && (
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

function ComplaintSection({ data, toggle, update, setSection }) {
  return (
    <section>
      <h1>{t(data.patient.language, "chiefComplaint")}</h1>
      <p>Tell us the main reason for today's visit.</p>

      <QuestionCard title="What is the main problem bringing you here today?">
        <ChoiceButtons
          value={data.chiefComplaint}
          multi
          options={symptomOptions}
          onChange={next => {
            // Keep the existing chiefComplaint array because the red-flag rule
            // depends on it.
            update("chiefComplaint", next);
          }}
        />
      </QuestionCard>

      <label>
        Where are you experiencing the problem?
        <input
          value={data.hpi.location}
          onChange={e => update("hpi.location", e.target.value)}
          placeholder="e.g. chest, stomach, head..."
        />
      </label>

      <QuestionCard title="How much is it bothering you right now?">
        <ChoiceButtons
          value={data.hpi.severity}
          options={["Mild", "Moderate", "Severe"]}
          onChange={value => update("hpi.severity", value)}
        />
      </QuestionCard>

      <div className="card">
        <strong>Selected complaints:</strong>{" "}
        {data.chiefComplaint.length ? data.chiefComplaint.join(", ") : "None selected"}
      </div>
    </section>
  );
}

function HPISection({ data, update }) {
  const chestPain = data.chiefComplaint.includes("Chest pain");

  const [conversation, setConversation] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [userMessage, setUserMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  const sendMessage = async (message) => {
    const text = message.trim();

    if (!text || loading) return;

    const newHistory = [
      ...conversation,
      {
        role: "user",
        content: text
      }
    ];

    setConversation(newHistory);
    setUserMessage("");
    setLoading(true);

    try {
      const result = await sendChatToGemini({
        patientLanguage: data.patient.language,
        careSystem: data.mode === "AYUSH" ? "ayush" : "allopathic",
        patientAgeBand: data.patient.age
          ? `${data.patient.age}`
          : "30-40",
        conversationHistory: newHistory
      });

      setAiResponse(result);

      setConversation([
        ...newHistory,
        {
          role: "assistant",
          content: result.speak || ""
        }
      ]);
    } catch (error) {
      setAiResponse({
        speak: `Sorry, I could not connect to the AI assistant. ${error.message}`,
        options: null,
        redflag: null
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1>History of Present Illness</h1>

      <p>
        Tell us how the current problem started and how it has changed.
      </p>

      {/* Gemini conversational intake */}
      <div className="card">
        <h2>AI Health History Assistant</h2>

        <p>
          You can describe your symptoms naturally. The AI assistant will ask
          follow-up questions to understand your problem better.
        </p>

        {!chatStarted && (
          <button
            type="button"
            className="primary"
            onClick={() => {
              setChatStarted(true);
              sendMessage(
                "Please begin the clinical history interview. Ask me about my main problem."
              );
            }}
          >
            Start AI Conversation
          </button>
        )}

        {chatStarted && (
          <>
            {conversation.length > 0 && (
              <div className="card">
                {conversation.map((turn, index) => (
                  <div key={index} style={{ marginBottom: "12px" }}>
                    <strong>
                      {turn.role === "user" ? "You" : "AI Assistant"}:
                    </strong>{" "}
                    {turn.content}
                  </div>
                ))}
              </div>
            )}

            {aiResponse?.speak && (
              <div className="card">
                <h3>AI Assistant</h3>
                <p>{aiResponse.speak}</p>
              </div>
            )}

            {aiResponse?.options &&
              Array.isArray(aiResponse.options) && (
                <div className="option-grid">
                  {aiResponse.options.map((option, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => sendMessage(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

            <div style={{ marginTop: "16px" }}>
              <textarea
                value={userMessage}
                onChange={e => setUserMessage(e.target.value)}
                placeholder="Describe how you are feeling..."
                rows={3}
              />

              <button
                type="button"
                className="primary"
                onClick={() => sendMessage(userMessage)}
                disabled={loading}
              >
                {loading ? "AI is thinking..." : "Send"}
              </button>
            </div>

            {aiResponse?.redflag?.triggered && (
              <div className="card">
                <h3>⚠️ Please seek medical attention</h3>
                <p>
                  {aiResponse.redflag.reason ||
                    "The AI detected a possible warning sign."}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Existing structured questionnaire */}
      <QuestionCard title="When did this problem start?">
        <ChoiceButtons
          value={data.hpi.onset}
          options={[
            "Today",
            "A few days ago",
            "1–4 weeks ago",
            "More than a month ago",
            "Not sure"
          ]}
          onChange={value => update("hpi.onset", value)}
        />
      </QuestionCard>

      <QuestionCard title="Did it start suddenly or gradually?">
        <ChoiceButtons
          value={data.hpi.course}
          options={["Suddenly", "Gradually", "Not sure"]}
          onChange={value => update("hpi.course", value)}
        />
      </QuestionCard>

      <QuestionCard title="Has it been getting better, worse, or staying the same?">
        <ChoiceButtons
          value={data.hpi.duration}
          options={[
            "Better",
            "Worse",
            "About the same",
            "Comes and goes"
          ]}
          onChange={value => update("hpi.duration", value)}
        />
      </QuestionCard>

      {chestPain && (
        <div className="card">
          <h3>Chest pain details</h3>

          <label>
            What does the pain feel like?

            <select
              value={data.hpi.character}
              onChange={e =>
                update("hpi.character", e.target.value)
              }
            >
              <option value="">Select</option>
              <option>Pressure</option>
              <option>Burning</option>
              <option>Sharp</option>
              <option>Dull</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Does it move anywhere?

            <input
              value={data.hpi.radiation}
              onChange={e =>
                update("hpi.radiation", e.target.value)
              }
              placeholder="Optional"
            />
          </label>
        </div>
      )}

      <label>
        Is there anything that makes it better or worse?

        <textarea
          value={data.hpi.narrative}
          onChange={e =>
            update("hpi.narrative", e.target.value)
          }
          placeholder="Optional..."
        />
      </label>
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
  const toggle = (group, symptom) => {
    const current = data[group] || [];
    const next = current.includes(symptom)
      ? current.filter(x => x !== symptom)
      : [...current.filter(x => x !== "None"), symptom];
    update(`ros.${group}`, next);
  };

  const renderGroup = (group, title, symptoms) => (
    <div className="card" key={group}>
      <h3>{title}</h3>
      <div className="option-grid">
        {[...symptoms, "None"].map(symptom => (
          <button
            type="button"
            key={symptom}
            className={(data[group] || []).includes(symptom) ? "selected" : ""}
            onClick={() => {
              if (symptom === "None") {
                update(`ros.${group}`, ["None"]);
              } else {
                toggle(group, symptom);
              }
            }}
          >
            {symptom}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section>
      <h1>Review of Systems</h1>
      <p>A quick symptom check across the main body systems.</p>

      {renderGroup("general", "General symptoms", ["Fever", "Fatigue", "Weight change", "Loss of appetite"])}
      {renderGroup("respiratory", "Breathing / chest symptoms", ["Cough", "Breathlessness", "Wheezing", "Chest discomfort"])}
      {renderGroup("gastrointestinal", "Stomach / bowel symptoms", ["Nausea", "Vomiting", "Abdominal pain", "Change in bowel habits"])}
      {renderGroup("neurological", "Neurological symptoms", ["Headache", "Dizziness", "Weakness", "Numbness"])}
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
