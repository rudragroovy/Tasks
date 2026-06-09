// Navbar.jsx — Navigation with Dashboard + Students + Add Student
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Users, UserPlus, BookOpen } from 'lucide-react';

function Navbar() {
  const location = useLocation();
  const is = (path) => location.pathname === path;

  const baseNavLink = "flex flex-col md:flex-row items-center md:justify-start gap-1 md:gap-3 text-text-secondary font-semibold transition-all duration-200 border border-transparent rounded-md md:rounded-xl px-3 py-1.5 md:px-4 md:py-3 text-[0.7rem] md:text-[0.95rem] hover:text-text-primary hover:bg-white/5 hover:border-white/10";
  const activeNavLink = "text-white bg-white/10 border-white/20 shadow-neu-in";

  return (
    <nav className="fixed z-[100] bg-[#0a0a0a]/90 backdrop-blur-[20px] bottom-0 left-0 right-0 h-[72px] flex flex-row items-center justify-center border-t border-white/5 shadow-[0_-4px_28px_rgba(0,0,0,0.8)] md:h-screen md:top-0 md:bottom-auto md:w-[260px] md:flex-col md:items-start md:justify-start md:p-6 md:border-r md:border-t-0 md:shadow-[4px_0_28px_rgba(0,0,0,0.7)]">
      <div className="hidden md:flex md:w-full md:px-4 md:mb-10 md:mt-2">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <GraduationCap className="text-white" size={26} strokeWidth={1.8} />
          <span className="text-[1.4rem] font-black bg-gradient-to-br from-white to-[#9a9a9a] bg-clip-text text-transparent tracking-tight">StudentHub</span>
        </Link>
      </div>

      <div className="flex flex-row w-full justify-around items-center px-2 md:flex-col md:h-full md:gap-2.5 md:items-stretch md:px-0">
        <Link to="/dashboard" className={`${baseNavLink} ${is('/dashboard') ? activeNavLink : ''}`}>
          <LayoutDashboard size={16} strokeWidth={2} />
          <span>Dashboard</span>
        </Link>

        <Link to="/courses" className={`${baseNavLink} ${is('/courses') ? activeNavLink : ''}`}>
          <BookOpen size={16} strokeWidth={2} />
          <span>Courses</span>
        </Link>

        <Link to="/" className={`${baseNavLink} ${is('/') ? activeNavLink : ''}`}>
          <Users size={16} strokeWidth={2} />
          <span>Students</span>
        </Link>

        <Link to="/add" className="flex items-center justify-center gap-2 font-extrabold text-black bg-gradient-to-br from-white to-[#c8c8c8] shadow-neu-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-neu-lg hover:from-white hover:to-[#e0e0e0] px-4 py-2.5 md:py-3.5 md:px-4 text-[0.85rem] md:text-[0.95rem] rounded-full md:rounded-xl md:mt-auto">
          <UserPlus size={16} strokeWidth={2.2} />
          <span className="hidden md:inline">Add Student</span>
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
