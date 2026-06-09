// StudentForm.jsx — Reusable form for both Add and Edit student operations
// Accepts `initialData` to pre-fill the form when editing
import { useState, useEffect } from 'react';
import { fetchCourses } from '../services/courseService';
import './StudentForm.css';

function StudentForm({ onSubmit, initialData = {}, buttonLabel = 'Save Student', loading = false }) {
  // Initialize form state — use initialData values or empty strings
  const [formData, setFormData] = useState({
    first_name:      initialData.first_name      || '',
    last_name:       initialData.last_name       || '',
    email:           initialData.email           || '',
    date_of_birth:   initialData.date_of_birth   || '',
    course:          initialData.course          || '',
    enrollment_date: initialData.enrollment_date || '',
    gpa:             initialData.gpa !== undefined && initialData.gpa !== null ? initialData.gpa : '',
  });

  const [errors, setErrors]   = useState({}); // field-level error map
  const [touched, setTouched] = useState({}); // which fields the user has interacted with
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchCourses().then(setCourses).catch(console.error);
  }, []);

  // Update one field at a time when user types
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field as user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Mark a field as touched when the user leaves it (for inline validation)
  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  // Validate all fields and return an error map
  const validate = () => {
    const errs = {};
    if (!formData.first_name.trim())  errs.first_name = 'First name is required';
    if (!formData.last_name.trim())   errs.last_name  = 'Last name is required';
    if (!formData.email.trim())       errs.email      = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
                                      errs.email      = 'Enter a valid email';
    if (!formData.date_of_birth)      errs.date_of_birth = 'Date of birth is required';
    if (!formData.course)             errs.course     = 'Please select a course';
    if (formData.gpa !== '' && formData.gpa !== null) {
      const g = parseFloat(formData.gpa);
      if (isNaN(g) || g < 0 || g > 5) errs.gpa = 'GPA must be between 0.00 and 5.00';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    // Mark all fields as touched to show all errors
    setTouched({ first_name: true, last_name: true, email: true, date_of_birth: true, course: true });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await onSubmit(formData); // delegate to parent page handler
  };

  const Field = ({ name, label, type = 'text', placeholder, required }) => (
    <div className="form-group">
      <label htmlFor={name}>
        {label} {required && <span className="required">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={touched[name] && errors[name] ? 'input-error' : ''}
      />
      {touched[name] && errors[name] && (
        <span className="field-error">{errors[name]}</span>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="student-form" noValidate>
      <div className="form-grid">
        <Field name="first_name" label="First Name" placeholder="e.g. Alice" required />
        <Field name="last_name"  label="Last Name"  placeholder="e.g. Johnson" required />
        <Field name="email"      label="Email"      type="email" placeholder="alice@example.com" required />
        <Field name="date_of_birth" label="Date of Birth" type="date" required />

        {/* Course dropdown */}
        <div className="form-group">
          <label htmlFor="course">
            Course <span className="required">*</span>
          </label>
          <select
            id="course"
            name="course"
            value={formData.course}
            onChange={handleChange}
            onBlur={handleBlur}
            className={touched.course && errors.course ? 'input-error' : ''}
          >
            <option value="">-- Select a course --</option>
            {courses.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          {touched.course && errors.course && (
            <span className="field-error">{errors.course}</span>
          )}
        </div>

        <Field name="enrollment_date" label="Enrollment Date" type="date" />
        <Field
          name="gpa"
          label="GPA (0.00 – 5.00)"
          type="number"
          placeholder="e.g. 4.75"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Saving...' : buttonLabel}
        </button>
      </div>
    </form>
  );
}

export default StudentForm;
