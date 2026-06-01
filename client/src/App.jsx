import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import AdminDashboard from './pages/Admin/Dashboard';
import StudentDashboard from './pages/Student/Dashboard';
import EvaluatorDashboard from './pages/Evaluator/Dashboard';
import PrincipalDashboard from './pages/Principal/Dashboard';
import Header from './components/Header';
import axios from 'axios';

// Global Axios Interceptor for Single Concurrent Login Enforcement
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (error.response.data?.message?.includes('another device')) {
        alert('Your session has expired because your account was logged in from another device.');
      }
      // If we get a 401, clear tokens and kick them out (unless already on login page)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const NO_HEADER_ROUTES = ['/login', '/register'];

function AppContent() {
  const location = useLocation();
  const isAuthRoute = NO_HEADER_ROUTES.includes(location.pathname) || location.pathname === '/';

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 font-sans relative flex flex-col md:overflow-hidden">
      <Header />
      <div className="flex-1 flex md:overflow-hidden w-full relative flex-col md:flex-row min-h-0 min-w-0">
        <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 relative">
          <Routes>
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/student/*" element={<StudentDashboard />} />
            <Route path="/evaluator/*" element={<EvaluatorDashboard />} />
            <Route path="/principal/*" element={<PrincipalDashboard />} />
          </Routes>
        </div>
      </div>
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
