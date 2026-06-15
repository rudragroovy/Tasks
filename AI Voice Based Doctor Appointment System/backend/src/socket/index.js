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
