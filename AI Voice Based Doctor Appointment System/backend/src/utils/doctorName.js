function stripDoctorPrefix(value) {
  let name = String(value || '').trim();
  while (/^dr\.?\s*/i.test(name)) {
    name = name.replace(/^dr\.?\s*/i, '').trim();
  }
  return name;
}

function formatDoctorName(value, fallback = '') {
  const stripped = stripDoctorPrefix(value);
  if (!stripped) return fallback;
  return `Dr. ${stripped}`;
}

module.exports = {
  stripDoctorPrefix,
  formatDoctorName,
};
