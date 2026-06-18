# Multi-Doctor Consultation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable primary doctors to invite additional specialists to an ongoing or scheduled consultation, collect independent notes/prescriptions from each, and generate a unified PDF upon patient confirmation.

**Architecture:** We are adopting a relational schema approach. `InvitedDoctor` and `DoctorNote` tables will be added to track which doctors are involved and their specific contributions. The meeting completion logic will check that all invited doctors (plus the primary doctor) have submitted notes before prompting the patient to end the consultation.

**Tech Stack:** React, Node.js, Express, Prisma, Socket.io.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add new models and relations**

Add `InvitedDoctor` and `DoctorNote` to `schema.prisma`. Also update the `Appointment` model to include relations to these new models.

```prisma
model InvitedDoctor {
  id            String      @id @default(uuid())
  appointmentId String
  doctorId      String
  status        String      @default("PENDING") // PENDING, JOINED, COMPLETED
  createdAt     DateTime    @default(now())

  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  doctor        User        @relation("InvitedDoctor", fields: [doctorId], references: [id])
}

model DoctorNote {
  id            String      @id @default(uuid())
  appointmentId String
  doctorId      String
  notes         String?
  prescription  Json?       // [{ name, dosage, frequency, duration }]
  createdAt     DateTime    @default(now())

  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  doctor        User        @relation("DoctorNote", fields: [doctorId], references: [id])
}
```

Add to `User` model:
```prisma
  invitedAppointments InvitedDoctor[] @relation("InvitedDoctor")
  doctorNotes         DoctorNote[]    @relation("DoctorNote")
```

Add to `Appointment` model:
```prisma
  invitedDoctors InvitedDoctor[]
  doctorNotes    DoctorNote[]
```

- [ ] **Step 2: Push database changes**

Run: `cd backend && npx prisma db push`
Expected: Database schema updated successfully.

---

### Task 2: Backend Controllers for Invite & Notes

**Files:**
- Modify: `backend/src/routes/appointments.js`
- Modify: `backend/src/controllers/appointmentController.js`

- [ ] **Step 1: Add routes**

In `backend/src/routes/appointments.js`:
```javascript
const { inviteDoctor, submitDoctorNote } = require('../controllers/appointmentController');
router.post('/:id/invite', authenticate, inviteDoctor);
router.post('/:id/notes', authenticate, submitDoctorNote);
```

- [ ] **Step 2: Implement `inviteDoctor` and `submitDoctorNote`**

In `backend/src/controllers/appointmentController.js`:
```javascript
exports.inviteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;
    
    const invite = await prisma.invitedDoctor.create({
      data: { appointmentId: id, doctorId, status: 'PENDING' },
      include: { doctor: { select: { name: true } } }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${doctorId}`).emit('notification:meeting_invite', { appointmentId: id, from: req.user.name });
    }
    
    res.json(invite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to invite doctor' });
  }
};

exports.submitDoctorNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, prescription } = req.body;
    const doctorId = req.user.id;

    const note = await prisma.doctorNote.create({
      data: { appointmentId: id, doctorId, notes, prescription }
    });

    // Update InvitedDoctor status if applicable
    await prisma.invitedDoctor.updateMany({
      where: { appointmentId: id, doctorId },
      data: { status: 'COMPLETED' }
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { invitedDoctors: true, doctorNotes: true }
    });

    // Check if all doctors have submitted
    const expectedNotesCount = 1 + appointment.invitedDoctors.length;
    if (appointment.doctorNotes.length >= expectedNotesCount) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${appointment.patientId}`).to(`user:${appointment.doctorId}`).emit('call:request_complete', { appointmentId: id });
      }
    } else {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${appointment.patientId}`).to(`user:${appointment.doctorId}`).emit('call:doctor_completed', { doctorId });
      }
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit notes' });
  }
};
```

- [ ] **Step 3: Update `getUserAppointments` include block**

In `appointmentController.js`, update `getUserAppointments` to `include: { invitedDoctors: true, doctorNotes: { include: { doctor: { select: { name: true } } } } }`.

---

### Task 3: Backend PDF Generation Update

**Files:**
- Modify: `backend/src/controllers/appointmentController.js`

- [ ] **Step 1: Update `updateStatus` to compile notes**

In `backend/src/controllers/appointmentController.js` inside `updateStatus`, when `status === 'COMPLETED'`:

```javascript
    if (status === 'COMPLETED') {
      const fullAppt = await prisma.appointment.findUnique({
        where: { id },
        include: { doctor: true, patient: true, doctorNotes: { include: { doctor: true } } }
      });

      // Pass all notes to the PDF service instead of req.body.notes
      const pdfUrl = await generatePrescriptionPDF(fullAppt, { allNotes: fullAppt.doctorNotes });

      dataToUpdate.consultation = {
        create: {
          notes: 'Compiled Notes',
          prescription: [],
          prescriptionUrl: pdfUrl
        }
      };
    }
```

---

### Task 4: Frontend Doctor Dashboard

**Files:**
- Modify: `frontend/src/pages/DoctorDashboard.jsx`

- [ ] **Step 1: Listen for `notification:meeting_invite`**

```javascript
  useEffect(() => {
    if (!socket) return;
    const handleInvite = (data) => {
      if (window.confirm(`Dr. ${data.from} has invited you to join a consultation. Join now?`)) {
        navigate(`/meeting/${data.appointmentId}`);
      }
    };
    socket.on('notification:meeting_invite', handleInvite);
    return () => socket.off('notification:meeting_invite', handleInvite);
  }, [socket, navigate]);
```

---

### Task 5: Frontend Meeting Room - UI & Invitations

**Files:**
- Modify: `frontend/src/pages/MeetingRoom.jsx`

- [ ] **Step 1: Add Invite Doctor UI**

Fetch available doctors via `/api/appointments/doctors` (already exists).
Create a simple modal or sidebar section to list doctors and send the invite via `axios.post('/api/appointments/${appointmentId}/invite', { doctorId })`.

- [ ] **Step 2: Update Video Grid**

Agora already handles remote users dynamically with `.map()`. Ensure CSS supports multi-grid (e.g. `grid-cols-2` or dynamic sizing for `remoteUsers.length > 1`).

---

### Task 6: Frontend Meeting Room - Completion Flow

**Files:**
- Modify: `frontend/src/pages/MeetingRoom.jsx`

- [ ] **Step 1: Change "Complete Consultation" behavior**

Instead of calling `completeConsultation` or emitting `call:request_complete` directly, the "Complete" button should submit the doctor's individual notes:

```javascript
  const submitDoctorNotes = async () => {
    try {
      await axios.post(`http://localhost:5000/api/appointments/${appointmentId}/notes`,
        { notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Notes submitted. Waiting for other doctors (if any) and patient confirmation.');
    } catch { alert('Failed to submit notes'); }
  };
```

Update the AI Triage / Notes tab "Complete" button to call `submitDoctorNotes()`.
The backend will automatically emit `call:request_complete` to the patient when all doctors have submitted. The patient's existing confirmation flow (`handleAcceptComplete`) will trigger the final `COMPLETED` status update.
