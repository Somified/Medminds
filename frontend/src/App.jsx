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
    narrative: ""
  },
  pastMedicalHistory: "",
  pastSurgicalHistory: "",
  drugs: "",
  allergies: "",
  familyHistory: "",
  personalHistory: "",
  ros: {},
  ayush: {
    prakriti: "", vikriti: "", sara: "", samhanana: "", pramana: "",
    satmya: "", sattva: "", aharaShakti: "", vyayamaShakti: "", vaya: "",
    aharaVihara: ""
  },
  status: "draft"
};

const API_BASE = "http://localhost:4000";

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
    return saved ? JSON.parse(saved) : cloneEmptyCase();
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
      keys.slice(0, -1).forEach(k => obj = obj[k]);
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

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          phone: p.phone,
          password: p.password,
          aadhaar,
          age: p.age,
          gender: p.gender,
          language: p.language
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Registration failed.");

      localStorage.setItem("medikiosk-token", result.token);

      setCaseData(prev => ({
        ...prev,
        patient: {
          ...prev.patient,
          verified: true,
          abhaId: result.patient.abhaId || ""
        }
      }));
      setAlert(null);
      setScreen("identify");
    } catch (error) {
      setAlert({ message: error.message, severity: "warning" });
    }
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
    const finalized = { ...caseData, status: "submitted", submittedAt: new Date().toISOString() };
    setCaseData(finalized);
    setSaved(true);
    localStorage.setItem("medikiosk-case", JSON.stringify(finalized));

    const token = localStorage.getItem("medikiosk-token");

    if (token) {
      try {
        const response = await fetch(`${API_BASE}/api/cases`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(finalized)
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Backend case save failed.");
        }
      } catch (error) {
        setAlert({ message: `Saved locally, but backend save failed: ${error.message}`, severity: "warning" });
      }
    }

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
              <TextSection title="Past Medical History" value={caseData.pastMedicalHistory}
                onChange={v => update("pastMedicalHistory", v)}
                placeholder="Previous illnesses, diagnoses, hospitalizations, chronic conditions..." />
            )}
            {section === "pastSurgical" && (
              <TextSection title="Past Surgical History" value={caseData.pastSurgicalHistory}
                onChange={v => update("pastSurgicalHistory", v)}
                placeholder="Previous operations/procedures and approximate dates..." />
            )}
            {section === "drugs" && (
              <TextSection title="Drug History" value={caseData.drugs}
                onChange={v => update("drugs", v)}
                placeholder="Current or recent medicines, dosage if known..." />
            )}
            {section === "allergies" && (
              <TextSection title="Allergy History" value={caseData.allergies}
                onChange={v => update("allergies", v)}
                placeholder="Known drug, food or other allergies; reaction if known..." />
            )}
            {section === "family" && (
              <TextSection title="Family History" value={caseData.familyHistory}
                onChange={v => update("familyHistory", v)}
                placeholder="Relevant illnesses or conditions in family..." />
            )}
            {section === "personal" && (
              <TextSection title="Personal History" value={caseData.personalHistory}
                onChange={v => update("personalHistory", v)}
                placeholder="Diet, sleep, bowel/bladder habits, substance use, occupation and other relevant information..." />
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
      <p>Select the main reason for today's visit. Multiple complaints can be selected.</p>

      <div className="option-grid">
        {symptomOptions.map(item => (
          <button
            key={item}
            className={data.chiefComplaint.includes(item) ? "selected" : ""}
            onClick={() => toggle(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {data.chiefComplaint.includes("Other") && (
        <label>
          Other complaint
          <input value={data.otherComplaint} onChange={e => update("otherComplaint", e.target.value)} />
        </label>
      )}

      {data.chiefComplaint.length > 0 && (
        <div className="card">
          <strong>Selected complaints:</strong> {data.chiefComplaint.join(", ")}
        </div>
      )}

      <div className="card">
        <h3>Adaptive questioning</h3>
        <p>
          The next questions can branch based on the selected complaint. Chest pain, for example,
          enables onset, character, radiation and aggravating/relieving questions in the HPI section.
        </p>
        <button onClick={() => setSection("hpi")}>Continue to HPI →</button>
      </div>
    </section>
  );
}

function HPISection({ data, update }) {
  const chestPain = data.chiefComplaint.includes("Chest pain");
  return (
    <section>
      <h1>History of Present Illness</h1>
      <p>Capture the current illness in a structured form. Questions shown can depend on the chief complaint.</p>

      <div className="grid">
        <label>
          Onset
          <select value={data.hpi.onset} onChange={e => update("hpi.onset", e.target.value)}>
            <option value="">Select</option>
            <option>Sudden</option>
            <option>Gradual</option>
            <option>Not sure</option>
          </select>
        </label>

        <label>
          Duration
          <input value={data.hpi.duration} onChange={e => update("hpi.duration", e.target.value)} placeholder="e.g. 3 days" />
        </label>

        {chestPain && (
          <>
            <label>
              Character
              <select value={data.hpi.character} onChange={e => update("hpi.character", e.target.value)}>
                <option value="">Select</option>
                <option>Pressure</option>
                <option>Burning</option>
                <option>Sharp</option>
                <option>Dull</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Radiation
              <input value={data.hpi.radiation} onChange={e => update("hpi.radiation", e.target.value)} placeholder="Does it move anywhere?" />
            </label>

            <label>
              Aggravating factors
              <input value={data.hpi.aggravating} onChange={e => update("hpi.aggravating", e.target.value)} />
            </label>

            <label>
              Relieving factors
              <input value={data.hpi.relieving} onChange={e => update("hpi.relieving", e.target.value)} />
            </label>
          </>
        )}
      </div>

      <label>
        Associated symptoms
        <textarea value={data.hpi.associatedSymptoms} onChange={e => update("hpi.associatedSymptoms", e.target.value)}
          placeholder="Describe other symptoms you have noticed..." />
      </label>

      <label>
        Patient's description
        <textarea value={data.hpi.narrative} onChange={e => update("hpi.narrative", e.target.value)}
          placeholder={t(data.patient.language, "patientDescription")} />
      </label>
    </section>
  );
}

function TextSection({ title, value, onChange, placeholder }) {
  return (
    <section>
      <h1>{title}</h1>
      <textarea className="big-text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <div className="card">
        If the patient has no information to provide, leave this section empty. The final summary will mark it as "Not provided".
      </div>
    </section>
  );
}

function ROSSection({ data, update }) {
  const toggle = (group, symptom) => {
    const current = data[group] || [];
    const next = current.includes(symptom) ? current.filter(x => x !== symptom) : [...current, symptom];
    update(`ros.${group}`, next);
  };
  return (
    <section>
      <h1>Review of Systems</h1>
      {Object.entries(rosGroups).map(([group, symptoms]) => (
        <div className="card" key={group}>
          <h3>{group}</h3>
          <div className="option-grid">
            {symptoms.map(s => (
              <button key={s} className={(data[group] || []).includes(s) ? "selected" : ""} onClick={() => toggle(group, s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function AYUSHSection({ data, update }) {
  const fields = [
    ["prakriti", "Prakriti"],
    ["vikriti", "Vikriti"],
    ["sara", "Sara"],
    ["samhanana", "Samhanana"],
    ["pramana", "Pramana"],
    ["satmya", "Satmya"],
    ["sattva", "Sattva"],
    ["aharaShakti", "Ahara Shakti"],
    ["vyayamaShakti", "Vyayama Shakti"],
    ["vaya", "Vaya"]
  ];
  return (
    <section>
      <h1>AYUSH History — Dashavidha Pariksha</h1>
      <p>Structured fields for the AYUSH consultation mode specified in the PS.</p>
      <div className="grid">
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input value={data[key]} onChange={e => update(`ayush.${key}`, e.target.value)} />
          </label>
        ))}
      </div>
      <label>
        Ahara-Vihara assessment
        <textarea value={data.aharaVihara} onChange={e => update("ayush.aharaVihara", e.target.value)} />
      </label>
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
        ["Onset", value(data.hpi.onset)],
        ["Duration", value(data.hpi.duration)],
        ["Character", value(data.hpi.character)],
        ["Radiation", value(data.hpi.radiation)],
        ["Aggravating factors", value(data.hpi.aggravating)],
        ["Relieving factors", value(data.hpi.relieving)],
        ["Associated symptoms", value(data.hpi.associatedSymptoms)],
        ["Patient description", value(data.hpi.narrative)]
      ]} />

      <Summary title="Past Medical History" rows={[["History", value(data.pastMedicalHistory)]]} />
      <Summary title="Past Surgical History" rows={[["History", value(data.pastSurgicalHistory)]]} />
      <Summary title="Drug History" rows={[["Medicines", value(data.drugs)]]} />
      <Summary title="Allergy History" rows={[["Allergies", value(data.allergies)]]} />
      <Summary title="Family History" rows={[["History", value(data.familyHistory)]]} />
      <Summary title="Personal History" rows={[["History", value(data.personalHistory)]]} />

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
