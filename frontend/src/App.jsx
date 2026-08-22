import React, { useEffect, useMemo, useState } from "react";

const EMPTY_CASE = {
  patient: {
    type: "new",
    abhaId: "",
    name: "",
    age: "",
    gender: "",
    language: "English"
  },
  consent: false,
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

function App() {
  const [caseData, setCaseData] = useState(() => {
    const saved = localStorage.getItem("medikiosk-case");
    return saved ? JSON.parse(saved) : cloneEmptyCase();
  });
  const [screen, setScreen] = useState("identify");
  const [section, setSection] = useState("complaint");
  const [alert, setAlert] = useState(null);
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
    if (redFlag) setAlert("Potential emergency symptoms detected. Please alert triage staff immediately.");
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

  const startCase = () => {
    if (!caseData.patient.name && !caseData.patient.abhaId) {
      setAlert("Enter at least the patient's name or ABHA ID.");
      return;
    }
    if (!caseData.consent) {
      setAlert("Consent is required before clinical history collection.");
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

  const submitCase = () => {
    const finalized = { ...caseData, status: "submitted", submittedAt: new Date().toISOString() };
    setCaseData(finalized);
    setSaved(true);
    setScreen("submitted");
    localStorage.setItem("medikiosk-case", JSON.stringify(finalized));
  };

  const newCase = () => {
    localStorage.removeItem("medikiosk-case");
    setCaseData(cloneEmptyCase());
    setScreen("identify");
    setSection("complaint");
    setSaved(false);
    setAlert(null);
  };

  return (
    <div className="app">
      <header>
        <strong>MediKiosk</strong>
        <span>Clinical History Intake MVP</span>
        {caseData.status === "submitted" && <button onClick={newCase}>New Case</button>}
      </header>

      {alert && (
        <div className="alert" role="alert">
          <strong>Priority Alert</strong>
          <span>{alert}</span>
          <button onClick={() => setAlert(null)}>Dismiss</button>
        </div>
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
            <h3>Case Progress</h3>
            {sections.map(([id, label]) => (
              <button
                key={id}
                className={section === id ? "active" : ""}
                onClick={() => setSection(id)}
              >
                {label}
              </button>
            ))}
          </aside>

          <main>
            <div className="patient-bar">
              <span><strong>{caseData.patient.name || "Unnamed patient"}</strong></span>
              <span>{caseData.patient.age ? `${caseData.patient.age} yrs` : ""}</span>
              <span>{caseData.patient.gender}</span>
              <span>{caseData.patient.language}</span>
              <span>Mode: {caseData.mode}</span>
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
            {section === "review" && (
              <Review data={caseData} redFlag={redFlag} onSubmit={submitCase} />
            )}

            {section !== "review" && (
              <div className="navigation">
                <button onClick={previous}>← Previous</button>
                <button onClick={next}>Save & Continue →</button>
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

function Identification({ data, update, startCase }) {
  return (
    <main className="single">
      <h1>Patient Identification</h1>
      <p>Enter the patient's basic information before starting the clinical history.</p>

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
            <option value="">Select</option>
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
          Consultation mode
          <select value={data.mode} onChange={e => update("mode", e.target.value)}>
            <option>Allopathic</option>
            <option>AYUSH</option>
          </select>
        </label>
      </div>

      <section className="card">
        <h2>Consent</h2>
        <p>
          Consent is required before clinical history collection. This MVP records the consent state locally.
          Production ABDM consent and secure backend integration will be added separately.
        </p>
        <label className="checkbox">
          <input type="checkbox" checked={data.consent} onChange={e => update("consent", e.target.checked)} />
          I consent to the collection and processing of my clinical history for this consultation.
        </label>
      </section>

      <button className="primary large" onClick={startCase}>Start Clinical History →</button>
    </main>
  );
}

function ComplaintSection({ data, toggle, update, setSection }) {
  return (
    <section>
      <h1>Chief Complaint</h1>
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
          placeholder="Describe what has been happening in your own words..." />
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
        <div className="alert">
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
