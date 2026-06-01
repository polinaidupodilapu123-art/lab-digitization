import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, Eye, EyeOff, FileText, Calendar, Bell, X, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import Header from '../../components/Header';
import FaceScanner from '../../components/FaceScanner';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [notifications, setNotifications] = useState([]);
  
  // Face Auth States
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
    
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/notifications`);
        const sorted = (res.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        setNotifications(sorted);
      } catch (err) {
        console.error('Failed to fetch circulars:', err);
      }
    };
    fetchNotifications();
  }, [location]);

  const handleLogin = async (e, faceDescriptor = null) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload = { regdNo: identifier, password };
      if (faceDescriptor) {
        payload.faceDescriptor = faceDescriptor;
      }
      
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);
      
      if (res.data.status === 'FACE_REQUIRED') {
        // Stop loading and show face scanner modal
        setLoading(false);
        setShowFaceAuth(true);
        return;
      }
      
      // If we reach here, login is fully successful
      setShowFaceAuth(false);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));

      if (res.data.role === 'ADMIN' || res.data.role === 'SYSTEM_ADMIN') navigate('/admin');
      else if (res.data.role === 'EVALUATOR') navigate('/evaluator');
      else if (res.data.role === 'PRINCIPAL') navigate('/principal');
      else navigate('/student');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed';
      setError(errorMsg);
      // Only hide face auth if it's NOT a face mismatch, otherwise keep it open to show error in modal
      if (!faceDescriptor) {
        setShowFaceAuth(false);
      }
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCaptured = async (descriptor) => {
    await handleLogin(null, descriptor);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header />

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex justify-center mt-2 md:mt-4">
        <div className="w-full flex flex-col lg:flex-row gap-8 items-stretch justify-center h-fit">
          {/* Left Column: Official Notifications Board */}
          <div className="w-full lg:w-7/12 bg-white rounded-md border border-slate-200 p-6 md:p-8 flex flex-col shadow-xl relative overflow-hidden text-slate-800">
          {/* Subtle glowing background decorations */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-5 flex-shrink-0 border-b border-slate-100 pb-4">
            <span className="p-2.5 bg-teal-50 text-teal-700 rounded-md border border-teal-100 shadow-sm">
              <Bell className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                University Circulars
              </h2>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">
                Official Notifications
              </p>
            </div>
          </div>

          {/* Notifications List */}
          <div className="relative z-10 flex-1 overflow-hidden flex flex-col min-h-0">
            {notifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50 rounded-md border border-slate-200">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">
                  No official circulars have been published at this time.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[350px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {notifications.map((notification, idx) => (
                  <div
                    key={notification._id || idx}
                    className="flex items-start px-4 py-3 bg-white border border-slate-200 rounded-md hover:border-teal-300 hover:bg-teal-50/40 transition-all group"
                  >
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-start gap-2 w-full">
                        {notification.pdfPath ? (
                          <a
                            href={`${API_BASE_URL}${notification.pdfPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-teal-700 transition-colors break-words hover:underline decoration-teal-300 underline-offset-2"
                            title="Open PDF Document"
                          >
                            {notification.title}
                          </a>
                        ) : (
                          <p className="font-semibold text-slate-800 text-sm leading-snug transition-colors break-words">
                            {notification.title}
                          </p>
                        )}
                        {new Date().getTime() - new Date(notification.date).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                          <span className="shrink-0 animate-pulse bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider mt-0.5">
                            New
                          </span>
                        )}
                      </div>
                      
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mt-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(notification.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="w-full lg:w-5/12 bg-white rounded-md border border-slate-200 shadow-xl p-8 flex flex-col justify-center relative">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Lab Digitization Portal</h2>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">
              Sign in to access your dashboard.
            </p>
          </div>

          {successMsg && (
            <div className="bg-teal-50 border border-teal-200 text-teal-700 p-3 rounded-md mb-4 text-sm font-semibold flex items-center justify-center gap-2 text-center animate-fadeIn">
              <ShieldCheck className="h-5 w-5" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2 rounded-md mb-4 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}

          {!showFaceAuth ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Registration No / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-11 w-full border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 font-medium"
                    placeholder="Enter your ID or Email"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-10 w-full border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-semibold py-3 rounded-md transition-all shadow-md active:scale-[0.98] cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="animate-fadeIn border border-slate-200 rounded-md p-6 bg-slate-50 flex flex-col items-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Face Verification</h3>
              <p className="text-xs text-slate-500 text-center mb-4">
                Please look at the camera to verify your identity.
              </p>
              
              <FaceScanner onCapture={handleFaceCaptured} mode="verify" />
              
              <button
                onClick={() => {
                  setShowFaceAuth(false);
                  setError('');
                }}
                className="mt-6 text-sm text-slate-500 hover:text-slate-700 font-medium underline underline-offset-2"
              >
                Cancel and go back
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm border-t border-slate-100 pt-4">
            <span className="text-slate-500 font-medium">New student or evaluator? </span>
            <Link
              to="/register"
              className="text-teal-700 hover:text-teal-800 font-bold transition-colors ml-1"
            >
              Register here
            </Link>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
