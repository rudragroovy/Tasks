# Multi-Doctor Consultation: Hybrid Join Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement non-disruptive joining notifications for busy doctors, allowing them to defer a call and auto-notify the meeting room.

**Architecture:** Instead of a full-screen ringing modal, invited doctors receive a silent toast notification with options to "Join Now", "Decline", or "+5 Mins". Selecting "+5 Mins" stores the appointment in a deferred queue and broadcasts a system message to the meeting room.

**Tech Stack:** React, Socket.io, TailwindCSS

---

### Task 1: Backend Support for Tentative Join

**Files:**
- Modify: `backend/src/socket/index.js:50-55`

- [ ] **Step 1: Write the tentative join listener**

Add `call:tentative_join` listener.

```javascript
    socket.on('call:tentative_join', async (data) => {
      const { appointmentId, doctorName, delayMinutes } = data;
      const text = `Dr. ${doctorName} will join the meeting in ${delayMinutes} minutes.`;
      
      try {
        // Save it as a system message so late-joiners can also see it
        const msg = await prisma.message.create({
          data: { 
            appointmentId, 
            senderId: 'SYSTEM', 
            senderRole: 'SYSTEM', 
            text 
          }
        });
        const msgWithMeta = { ...msg, senderName: 'System' };
        io.to(`appt:${appointmentId}`).emit('chat:message', msgWithMeta);
      } catch (e) {
        console.error(e);
      }
    });
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/socket/index.js
git commit -m "feat: add socket event for tentative joins"
```

### Task 2: Doctor Dashboard UX Enhancements

**Files:**
- Modify: `frontend/src/pages/DoctorDashboard.jsx`

- [ ] **Step 1: Add Deferred Invites state**

At the top of the component state variables:
```javascript
  const [deferredInvites, setDeferredInvites] = useState([]);
```

- [ ] **Step 2: Replace full-screen modal with Toast notification**

Find the `incomingCall` full-screen modal (lines ~920-968) and replace it with a non-intrusive toast that offers three buttons.

```javascript
      {/* ── Call Incoming Toast ─────────────────────────────── */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-white p-6 rounded-3xl shadow-2xl border border-primary-100 max-w-sm w-full"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-health-100 flex items-center justify-center text-health-600 animate-pulse">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Meeting Started</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{incomingCall.doctorName} is waiting</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6 text-sm font-medium">You have been requested to join the consultation.</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    socket.emit('call:tentative_join', { 
                      appointmentId: incomingCall.appointmentId, 
                      doctorName: user.name, 
                      delayMinutes: 5 
                    });
                    setDeferredInvites(prev => [...prev, incomingCall]);
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-100 text-orange-600 font-bold text-sm hover:bg-orange-200 transition-colors"
                >
                  +5 Mins
                </button>
              </div>
              <button
                onClick={() => {
                  socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: true });
                  navigate(`/room/${incomingCall.appointmentId}`);
                }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-transform hover:scale-105 shadow-lg shadow-health-500/30 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
              >
                <Check className="w-4 h-4" /> Join Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
```

- [ ] **Step 3: Render Deferred Invites**

Find where the Top Navbar is rendered in `DoctorDashboard.jsx` (around the header with the date). Add a subtle indicator or section for deferred invites if the array has items. Just below the header, above the tabs.

```javascript
          {deferredInvites.length > 0 && (
            <div className="mb-8 p-4 rounded-2xl border border-orange-200 bg-orange-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900">Deferred Consultations</h3>
                  <p className="text-orange-700 text-sm">You told {deferredInvites.length} room(s) you would join shortly.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {deferredInvites.map((invite, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDeferredInvites(prev => prev.filter((_, idx) => idx !== i));
                      navigate(`/room/${invite.appointmentId}`);
                    }}
                    className="px-4 py-2 bg-white text-orange-700 font-bold text-sm rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm"
                  >
                    Join {invite.doctorName}'s Room
                  </button>
                ))}
              </div>
            </div>
          )}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DoctorDashboard.jsx
git commit -m "feat: implement deferred invite UI and socket emission"
```
