// App.jsx — Root component with all routes
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar            from './components/Navbar';
import HomePage          from './pages/HomePage';
import DashboardPage     from './pages/DashboardPage';
import AddStudentPage    from './pages/AddStudentPage';
import EditStudentPage   from './pages/EditStudentPage';
import StudentDetailPage from './pages/StudentDetailPage';
import CourseManagementPage from './pages/CourseManagementPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"               element={<HomePage />} />
            <Route path="/dashboard"      element={<DashboardPage />} />
            <Route path="/courses"        element={<CourseManagementPage />} />
            <Route path="/add"            element={<AddStudentPage />} />
            <Route path="/edit/:id"       element={<EditStudentPage />} />
            <Route path="/students/:id"   element={<StudentDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
