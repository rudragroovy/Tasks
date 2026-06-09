// validateStudent.js — Express middleware for server-side input validation
// Runs before the controller; stops invalid data from reaching the database
const validateStudent = (req, res, next) => {
  const { first_name, last_name, email, date_of_birth, course, gpa } = req.body;
  const errors = [];

  // Required field checks
  if (!first_name || first_name.trim() === '')
    errors.push('First name is required');

  if (!last_name || last_name.trim() === '')
    errors.push('Last name is required');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('A valid email address is required');

  if (!date_of_birth)
    errors.push('Date of birth is required');

  if (!course || course.trim() === '')
    errors.push('Course is required');

  // Optional GPA range check
  if (gpa !== undefined && gpa !== '' && gpa !== null) {
    const parsed = parseFloat(gpa);
    if (isNaN(parsed) || parsed < 0 || parsed > 4.0)
      errors.push('GPA must be a number between 0.00 and 4.00');
  }

  // If there are any validation errors, respond with 400 and the list
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // All checks passed — continue to the controller
  next();
};

module.exports = validateStudent;
