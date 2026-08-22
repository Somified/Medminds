# MediKiosk Frontend MVP

This is the Person 2 patient-facing clinical history intake frontend for the SIH 2026 project.

## Current scope

- Patient identification
- ABHA ID entry
- Language selection
- Consent gate
- Allopathic / AYUSH mode
- Chief complaint selection
- Adaptive HPI questions
- Standard clinical history sections
- Review of Systems
- AYUSH Dashavidha Pariksha fields
- Red-flag demo state for chest pain + breathlessness
- Structured review screen
- Local persistence with localStorage
- Case submission state
- Responsive layout

## Current interaction scope

The MVP uses typing, buttons, dropdowns and checkboxes.

Voice, OCR/document AI, touch/sensory-specific interaction, ABDM/FHIR and HIS integration are intentionally left for later integration.

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Current Work Status

## ✅ Completed
New / existing patient portal flow
Patient registration & login frontend
Aadhaar / ABHA / phone verification frontend (demo)
Password & mock OTP login
Patient identification & consent
Clinical history intake and adaptive HPI
AYUSH history
Red-flag interface
Structured case summary & submission
Medical document/photo upload UI

## 🔄 Pending Integration
Real Aadhaar / ABHA / OTP verification
Secure authentication & backend patient accounts
OCR & medical document extraction
AI / voice / summarization
ABDM / FHIR / HIS integration
Biometric / thumb authentication

### 🔮 Future
- Touch/sensory interaction
- Audio-guided interaction
