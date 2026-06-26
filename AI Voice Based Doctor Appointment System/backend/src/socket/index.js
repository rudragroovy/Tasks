const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { formatDoctorName } = require('../utils/doctorName');
const { addDoctorSocket, removeDoctorSocket } = require('./doctorPresenceStore');

module.exports = function(io) {
  const socketUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handshake will happen on connect (JWT verified middleware later, or just simple user identification)
    // For now, client sends 'identify'
    socket.on('identify', async (user) => {
      const previousUser = socketUsers.get(socket.id);
      if (previousUser?.role === 'DOCTOR' && previousUser?.id) {
        removeDoctorSocket(previousUser.id, socket.id);
      }

      socketUsers.set(socket.id, user);
      socket.join(`user:${user.id}`);
      if (user.role === 'DOCTOR') {
        socket.join('doctors');
        addDoctorSocket(user.id, socket.id);
        try {
          const doctor = await prisma.doctor.findUnique({
            where: { userId: user.id },
            select: { showOnlineOnLogin: true, isOnline: true },
          });

          if (!doctor) return;

          const nextOnlineState = Boolean(doctor.showOnlineOnLogin);
          if (doctor.isOnline !== nextOnlineState) {
            await prisma.doctor.update({
              where: { userId: user.id },
              data: { isOnline: nextOnlineState },
            });
            io.emit('doctors:updated');
          }
        } catch (error) {
          console.error('Failed to sync doctor online state on identify:', error);
        }
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
      const { appointmentId, patientId, doctorName, invitedDoctorIds } = data;
      // Send the call to the patient
      io.to(`user:${patientId}`).emit('call:incoming', { appointmentId, doctorName });
      // Send to all invited doctors
      if (invitedDoctorIds && Array.isArray(invitedDoctorIds)) {
        invitedDoctorIds.forEach(id => {
          io.to(`user:${id}`).emit('call:incoming', { appointmentId, doctorName });
        });
      }
    });

    socket.on('call:response', (data) => {
      const { appointmentId, doctorId, accepted } = data;
      // Let the doctor know the patient's response
      if (doctorId) {
        io.to(`user:${doctorId}`).emit('call:answered', { appointmentId, accepted });
      }
    });

    socket.on('call:tentative_join', async (data) => {
      const { appointmentId, doctorName, delayMinutes } = data;
      const displayDoctorName = formatDoctorName(doctorName, doctorName || 'Doctor');
      const text = `${displayDoctorName} will join the meeting in ${delayMinutes} minutes.`;
      
      try {
        const msg = await prisma.message.create({
          data: { 
            appointmentId, 
            senderId: 'SYSTEM', 
            senderRole: 'ADMIN', 
            text 
          }
        });
        const msgWithMeta = { ...msg, senderName: 'System' };
        io.to(`appt:${appointmentId}`).emit('chat:message', msgWithMeta);
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('agora:join', (data) => {
      // Forward the user's Agora UID and name to others in the room
      socket.to(`appt:${data.appointmentId}`).emit('agora:user_joined', data);
    });

    socket.on('agora:name_reply', (data) => {
      // Forward the name reply to others in the room
      socket.to(`appt:${data.appointmentId}`).emit('agora:user_joined', data);
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

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      const disconnectedUser = socketUsers.get(socket.id);
      socketUsers.delete(socket.id);

      if (disconnectedUser?.role !== 'DOCTOR' || !disconnectedUser?.id) {
        return;
      }

      const presence = removeDoctorSocket(disconnectedUser.id, socket.id);
      if (presence.isConnected) {
        return;
      }

      try {
        const updateResult = await prisma.doctor.updateMany({
          where: {
            userId: disconnectedUser.id,
            isOnline: true,
          },
          data: { isOnline: false },
        });

        if (updateResult.count > 0) {
          io.emit('doctors:updated');
        }
      } catch (e) {
        console.error(e);
      }
    });
  });
};
