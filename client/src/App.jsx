import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Auth/Login';
import StudentSetup from './pages/Auth/StudentSetup';
import AdminDashboard from './pages/Admin/Dashboard';
import StudentDashboard from './pages/Student/Dashboard';
import EvaluatorDashboard from './pages/Evaluator/Dashboard';
import Header from './components/Header';

const NO_HEADER_ROUTES = ['/login', '/student-setup'];

function AppContent() {
  const location = useLocation();
  const showHeader = !NO_HEADER_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student-setup" element={<StudentSetup />} />

        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/student/*" element={<StudentDashboard />} />
        <Route path="/evaluator/*" element={<EvaluatorDashboard />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
