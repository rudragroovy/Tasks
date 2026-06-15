# AI Voice Doctor Appointment — Patient Happy-Path Vertical Slice

**Date:** 2026-06-15
**Status:** Approved design, pre-implementation
**Repo:** `AI Voice Based Doctor Appointment System/`

## 1. Goal & Scope

Finish the patient happy-path vertical slice end-to-end in the existing repo so the full flow runs in a live demo:

```
Patient registers → AI voice triage (Gemini, voice+text) → specialization suggested
  → live online doctors (socket) → book → doctor gets live request → accept (socket)
  → both join Agora room → doctor adds notes + chat + prescription (all persisted live)
  → doctor marks completed → patient views summary + chat + prescription + downloads PDF
```

### In scope
- Wire the unwired AI route; mount the AI assistant; add real browser voice (STT/TTS) with typed input first-class.
- Real-time online-doctor availability, live appointment requests, accept→auto-join via Socket.io.
- Live consultation: persisted chat, autosaved doctor notes, structured prescription builder.
- Mark-completed flow; patient appointment summary with chat history + prescription + PDF download.
- Server-side PDF (`pdfkit`).

### Out of scope (later sub-projects)
- Admin role + dashboard.
- Payment / Stripe (drop the `Book & Pay` payment step; book → waiting room directly).
- Real server-side audio transcription (browser Web Speech API instead).
- Full authorization hardening beyond basic owner checks.

## 2. Tech Stack (locked, already in repo)
- **Backend:** Node + Express 5, Prisma + PostgreSQL (`localhost:5432/VBDA`), Socket.io, JWT, `@google/generative-ai`, **`pdfkit` (to add)**.
- **Frontend:** React 19 + Vite + Tailwind 4, react-router 7, `agora-rtc-sdk-ng`, `socket.io-client`, Web Speech API.
- **AI:** Gemini `gemini-2.5-flash` — key verified working (transient 503 observed once; add retry).

### Layering
Thin controllers → service modules (`ai`, `appointment`, `consultation`, `pdf`) → Prisma. Socket logic isolated in `backend/src/socket/`. Frontend: one `SocketContext`, existing `AuthContext`, pages stay presentational.

## 3. Data Model Changes

Keep `User / Specialization / Doctor / Appointment / Consultation`. Changes:

- **Appointment:** keep `aiSummary Json?`. Status enum `PENDING → ACCEPTED → COMPLETED / REJECTED` (keep `PAID` unused to avoid migration churn). Add back-relations `messages Message[]`, `consultation Consultation?`.
- **Consultation (extend):**
  ```prisma
  model Consultation {
    id              String   @id @default(uuid())
    appointmentId   String   @unique
    appointment     Appointment @relation(fields:[appointmentId], references:[id])
    notes           String?            // doctor live notes, autosaved
    prescription    Json?              // { medicines:[{name,dose,frequency,duration}], advice }
    prescriptionUrl String?            // pdfkit output, set on generate
    updatedAt       DateTime @updatedAt
  }
  ```
- **New Message:**
  ```prisma
  model Message {
    id            String   @id @default(uuid())
    appointmentId String
    appointment   Appointment @relation(fields:[appointmentId], references:[id])
    senderId      String
    senderRole    Role
    text          String
    createdAt     DateTime @default(now())
  }
  ```
- **Doctor.isOnline:** live-availability source, flipped via socket + persisted.

Migration: one `prisma migrate dev`. Seed extends: 1 patient, 2-3 specializations, 2 online doctors.

## 4. Backend — REST + Socket

### REST (JWT-protected except register/login)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | extend: doctor specialization *name* → id |
| POST | `/api/auth/login`, GET `/api/auth/me` | exist |
| POST | `/api/ai/symptoms` | **wire missing route** → Gemini triage |
| GET | `/api/appointments/doctors?specializationName=` | online doctors by spec |
| POST | `/api/appointments` | create PENDING |
| GET | `/api/appointments`, `/api/appointments/:id` | list + single (consultation, messages, doctor, patient) |
| PUT | `/api/appointments/:id/status` | accept/reject/complete — emits socket |
| PUT | `/api/consultations/:appointmentId/notes` | autosave notes |
| PUT | `/api/consultations/:appointmentId/prescription` | save structured JSON |
| POST | `/api/consultations/:appointmentId/prescription/pdf` | pdfkit → file → set `prescriptionUrl` |
| GET | `/api/consultations/:appointmentId/prescription/pdf` | download stream |
| PUT | `/api/doctors/me/online` | toggle isOnline + emit |

### Socket.io (`backend/src/socket/index.js`, JWT handshake)
- On connect: join personal room `user:<id>`.
- `doctor:online {isOnline}` → persist + broadcast `doctors:updated`.
- Appointment created → emit `appointment:new` to `user:<doctorId>`.
- Status change → emit `appointment:updated` to patient & doctor rooms; on ACCEPT patient auto-routes to `/room/:id`.
- In call: join `appt:<id>`; `chat:send` → persist `Message` → emit `chat:message` to room.
- On `disconnect`: flip doctor offline.

Notes/prescription saves go via REST (autosave); socket used for chat + signaling only.

### New files
`routes/ai.js`, `routes/consultations.js`, `routes/doctors.js`, `controllers/consultationController.js`, `services/pdfService.js`, `socket/index.js`.

## 5. Frontend — pages & fixes

### Fixes to stubs
- **Register.jsx:** `// TODO` → wire `register()`; doctor sends specialization name + fee.
- **Dashboard.jsx:** re-mount `AIVoiceAssistant` for patients (entry point).
- **AIVoiceAssistant.jsx:** add Web Speech API — mic→STT fills input, AI reply via SpeechSynthesis. Typed input stays first-class. Hits wired `/api/ai/symptoms`.
- **DoctorDashboard.jsx:** replace mock table with live data; subscribe `appointment:new`; Accept/Reject → `PUT status` + socket; online toggle → `PUT /doctors/me/online` persisted.
- **PatientWaitingRoom.jsx:** real appointment; listen `appointment:updated`; on ACCEPTED auto-nav to `/room/:id`.
- **Booking.jsx:** subscribe `doctors:updated`; after book → waiting room. Remove payment language.

### MeetingRoom.jsx (major upgrade)
- Keep working Agora video. Add doctor-only right panel: autosaved **Notes** textarea (debounced REST), **Prescription builder** (medicine rows → save JSON), **Complete** button (→ COMPLETED + generate PDF).
- Wire **Chat** ("RTM pending" placeholder) to Socket.io `appt:<id>` — persisted send/receive, both roles.
- Patient: read-only symptom summary + chat. Doctor: everything editable.

### New
- **AppointmentSummary.jsx** (`/summary/:id`): AI summary, doctor notes, full chat history, prescription details, **Download PDF**. Linked from completed appointments.
- **SocketContext.jsx:** single JWT socket shared across pages.

## 6. Error Handling
- **Gemini:** 1 retry on failure; on hard fail return `{status:'error', message}` → assistant shows "try again". JSON parse guarded.
- **Agora:** keep existing `VITE_AGORA_APP_ID` alert; token=null testing mode — App ID must allow no-token.
- **Socket:** JWT handshake, reject unauth; auto-reconnect; offline-on-disconnect.
- **PDF:** generate only if prescription exists; download 404s cleanly if no `prescriptionUrl`.
- **Auth/ownership:** only appointment's doctor changes status/notes/prescription; only patient/doctor read it.

## 7. Testing
- Backend unit tests (light): AI JSON parse, prescription→PDF buffer non-empty, status transitions.
- Manual end-to-end: seed → full flow in two browser windows (patient + doctor) = acceptance test.
- No heavy E2E framework (YAGNI for the slice).

## 8. Risks
1. Web Speech API = Chrome/Edge only → typed fallback mandatory.
2. Agora no-token mode must be enabled on the App ID.
3. Postgres must be running + `DATABASE_URL` valid before migrate (verify first).
