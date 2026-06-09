// Navbar.jsx — Navigation with Dashboard + Students + Add Student
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Users, UserPlus, BookOpen } from 'lucide-react';
import './Navbar.css';

function Navbar() {
  const location = useLocation();
  const is = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <GraduationCap className="nav-icon" size={26} strokeWidth={1.8} />
          <span className="nav-title">StudentHub</span>
        </Link>
      </div>

      <div className="nav-links">
        <Link to="/dashboard" className={`nav-link ${is('/dashboard') ? 'active' : ''}`}>
          <LayoutDashboard size={15} strokeWidth={2} />
          Dashboard
        </Link>

        <Link to="/courses" className={`nav-link ${is('/courses') ? 'active' : ''}`}>
          <BookOpen size={15} strokeWidth={2} />
          Courses
        </Link>

        <Link to="/" className={`nav-link ${is('/') ? 'active' : ''}`}>
          <Users size={15} strokeWidth={2} />
          Students
        </Link>

        <Link to="/add" className="btn-add">
          <UserPlus size={15} strokeWidth={2.2} />
          <span className="btn-add-text">Add Student</span>
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
