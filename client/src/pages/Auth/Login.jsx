import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, Eye, EyeOff, FileText, Download, Calendar, Bell } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
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
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { regdNo: identifier, password };
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));

      if (res.data.role === 'ADMIN') navigate('/admin');
      else if (res.data.role === 'EVALUATOR') navigate('/evaluator');
      else if (res.data.role === 'PRINCIPAL') navigate('/principal');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-teal-900 via-slate-900 to-teal-950 p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* Left Column: Official Notifications Board */}
        <div className="lg:col-span-7 bg-white rounded-md border border-slate-200 p-6 md:p-8 flex flex-col shadow-xl relative overflow-hidden text-slate-800 min-h-[500px] lg:min-h-0">
          {/* Subtle glowing background decorations */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-5 flex-shrink-0">
            <span className="p-2.5 bg-teal-50 text-teal-700 rounded-md border border-teal-100 shadow-sm">
              <Bell className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                AKNU Digitization Portal
              </h2>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">
                Official Notifications & Circulars
              </p>
            </div>
          </div>

          {/* Notifications List — linear scrollable card rows */}
          <div className="relative z-10 flex-1 overflow-hidden flex flex-col min-h-0">
            {notifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50 rounded-md border border-slate-200">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">
                  No official circulars have been published at this time.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-2" style={{ maxHeight: '370px' }}>
                {notifications.map((notification, idx) => (
                  <div
                    key={notification._id || idx}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-md hover:border-teal-300 hover:bg-teal-50/40 transition-all group"
                  >
                    {/* Title */}
                    <p className="flex-1 font-semibold text-slate-800 text-sm leading-snug group-hover:text-teal-800 transition-colors truncate">
                      {notification.title}
                    </p>

                    {/* Date badge */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 group-hover:bg-teal-100 group-hover:text-teal-700 px-2.5 py-1 rounded-md border border-slate-200 group-hover:border-teal-200 transition-all whitespace-nowrap shrink-0">
                      <Calendar className="h-3 w-3" />
                      {new Date(notification.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>

                    {/* Download icon */}
                    {notification.pdfPath ? (
                      <a
                        href={`${API_BASE_URL}${notification.pdfPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 p-2 bg-teal-50 hover:bg-teal-600 text-teal-600 hover:text-white rounded-md transition-all border border-teal-100 hover:border-teal-600"
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="shrink-0 p-2 text-slate-300 cursor-default" title="No attachment">
                        <Download className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4 mt-5 flex-shrink-0 z-10 relative">
            Adikavi Nannaya University Portal · Official circulars & B.Ed practical updates
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="lg:col-span-5 bg-white rounded-md border border-slate-200 shadow-xl p-8 flex flex-col justify-center relative">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Lab Digitization Portal</h1>
            <p className="text-slate-500 text-sm mt-1.5">
              Sign in using your Registration Number or Email Address.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-5 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                User Identifier
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
                  placeholder="Enter Reg No or Email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
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
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-md transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-slate-100 pt-4">
            <span className="text-slate-500">First time user? </span>
            <Link
              to="/register"
              className="text-teal-700 hover:text-teal-800 font-semibold hover:underline"
            >
              Set up your password
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
