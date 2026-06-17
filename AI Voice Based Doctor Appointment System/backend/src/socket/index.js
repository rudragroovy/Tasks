const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handshake will happen on connect (JWT verified middleware later, or just simple user identification)
    // For now, client sends 'identify'
    socket.on('identify', (user) => {
      socket.join(`user:${user.id}`);
      if (user.role === 'DOCTOR') {
        socket.join('doctors');
      }
    });

    socket.on('doctor:online', async (data) => {
      const { doctorId, isOnline } = data;
      try {
        await prisma.doctor.update({
          where: { userId: doctorId },
          data: { isOnline }
        });
        io.emit('doctors:updated');
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('join_appointment', (appointmentId) => {
      socket.join(`appt:${appointmentId}`);
    });

    socket.on('call:initiate', (data) => {
      const { appointmentId, patientId, doctorName } = data;
      // Send the call to the patient
      io.to(`user:${patientId}`).emit('call:incoming', { appointmentId, doctorName });
    });

    socket.on('call:response', (data) => {
      const { appointmentId, doctorId, accepted } = data;
      // Let the doctor know the patient's response
      if (doctorId) {
        io.to(`user:${doctorId}`).emit('call:answered', { appointmentId, accepted });
      }
    });

    // ── Call Completion Confirmation Flow ──
    socket.on('call:request_complete', (data) => {
      const { appointmentId } = data;
      // Tell everyone in the room except the sender (which is the patient)
      socket.to(`appt:${appointmentId}`).emit('call:request_complete', data);
    });

    socket.on('call:accept_complete', (data) => {
      const { appointmentId } = data;
      socket.to(`appt:${appointmentId}`).emit('call:accept_complete', data);
    });

    socket.on('call:decline_complete', (data) => {
      const { appointmentId } = data;
      socket.to(`appt:${appointmentId}`).emit('call:decline_complete', data);
    });

    socket.on('chat:send', async (data) => {
      const { appointmentId, senderId, senderRole, senderName, text } = data;
      try {
        const msg = await prisma.message.create({
          data: { appointmentId, senderId, senderRole, text }
        });
        // Attach senderName dynamically so the frontend can display it
        const msgWithMeta = { ...msg, senderName };
        io.to(`appt:${appointmentId}`).emit('chat:message', msgWithMeta);
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // In a real app we'd track the user ID mapping and set them offline
    });
  });
};
