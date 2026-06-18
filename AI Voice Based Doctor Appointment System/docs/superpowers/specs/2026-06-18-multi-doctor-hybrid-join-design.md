# Multi-Doctor Consultation: Hybrid Join UX Design

## Goal
Improve the user experience for doctors who are invited to join an active multi-doctor consultation while they are already engaged in their own tasks or meetings. A full-screen ringing overlay is disruptive; instead, we will implement a non-disruptive, asynchronous "Tentative Join" negotiation flow.

## Architecture & Data Flow

### 1. Context-Aware Notifications (UI)
When a doctor receives the `call:incoming` socket event:
- **Check Context:** The `DoctorDashboard.jsx` will check if the doctor is already in an active meeting or if they are generally "busy" (e.g. they have an active tab that isn't the main queue).
- **Silent Toast Notification:** Instead of the full-screen ringing modal, they receive a small, non-intrusive toast notification in the bottom right corner.
- **Quick Actions:** The toast will have three buttons:
  - **Join Now:** Instantly joins the room.
  - **+5 Mins:** Declares a tentative join time, deferring the call.
  - **Decline:** Rejects the invitation.

### 2. Socket Event: `call:tentative_join`
When the invited doctor clicks "+5 Mins":
1. **Frontend Emission:** `socket.emit('call:tentative_join', { appointmentId, doctorName, delayMinutes: 5 })`
2. **Backend Broadcast:** The backend listens for `call:tentative_join` and broadcasts it to the specific room (`appointmentId`).
3. **Meeting Room UI:** The active `MeetingRoom.jsx` listens for `call:tentative_join` and appends a system message to the chat: *"Dr. [Name] will join in 5 minutes."*

### 3. Deferral Queue
When a doctor selects "+5 Mins":
- The notification toast disappears.
- The `DoctorDashboard.jsx` adds this appointment to a **"Next Up" / "Deferred Invites"** queue state.
- Once the doctor finishes their current task/meeting, they will see the deferred invite prominently displayed on their dashboard, prompting them to click "Join" when they are ready.

## Changes Required

### Frontend
- **DoctorDashboard.jsx:** 
  - Modify `incomingCall` handling. If the doctor has an active status or wants a non-intrusive notification, render a small Toast instead of the `fixed inset-0` full-screen modal.
  - Add logic for the "+5 Mins" button.
  - Create a "Deferred Invites" UI section or simple floating reminder for calls accepted tentatively.
- **MeetingRoom.jsx:**
  - Add socket listener `socket.on('call:tentative_join', ...)` to add a system message to the live chat array notifying the primary doctor and patient.

### Backend
- **socket/index.js:**
  - Add listener for `call:tentative_join`.
  - Emit message to the room: `io.to(appointmentId).emit('chat:message', { senderName: 'System', text: ... })` or pass the tentative event down for the frontend to render.
