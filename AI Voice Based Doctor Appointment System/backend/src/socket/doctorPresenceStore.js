const doctorSocketIds = new Map();

function addDoctorSocket(doctorId, socketId) {
  if (!doctorId || !socketId) return;
  if (!doctorSocketIds.has(doctorId)) {
    doctorSocketIds.set(doctorId, new Set());
  }
  doctorSocketIds.get(doctorId).add(socketId);
}

function removeDoctorSocket(doctorId, socketId) {
  if (!doctorId || !socketId) {
    return { isConnected: false, activeCount: 0 };
  }

  const activeSockets = doctorSocketIds.get(doctorId);
  if (!activeSockets) {
    return { isConnected: false, activeCount: 0 };
  }

  activeSockets.delete(socketId);
  const activeCount = activeSockets.size;
  if (activeCount === 0) {
    doctorSocketIds.delete(doctorId);
  }

  return {
    isConnected: activeCount > 0,
    activeCount,
  };
}

function getConnectedDoctorIds() {
  return Array.from(doctorSocketIds.keys());
}

function isDoctorConnected(doctorId) {
  return doctorSocketIds.has(doctorId);
}

module.exports = {
  addDoctorSocket,
  removeDoctorSocket,
  getConnectedDoctorIds,
  isDoctorConnected,
};
