import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, Eye, EyeOff, FileText, Calendar, Bell, X, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import Header from '../../components/Header';
import FaceScanner from '../../components/FaceScanner';

const getCoordinates = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        let msg = 'Failed to retrieve location.';
        if (error.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser settings.';
        } else if (error.code === 2) {
          msg = 'Location position is unavailable. Please check your system/OS location settings.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

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
  const [userRole, setUserRole] = useState(null);

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

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP and New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotOtpTimer, setForgotOtpTimer] = useState(0);
  const [forgotIsOtpExpired, setForgotIsOtpExpired] = useState(false);
  const [forgotDevOtp, setForgotDevOtp] = useState('');

  useEffect(() => {
    let interval;
    if (showForgotPassword && forgotPasswordStep === 2 && forgotOtpTimer > 0) {
      interval = setInterval(() => {
        setForgotOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (forgotOtpTimer === 0 && showForgotPassword && forgotPasswordStep === 2) {
      setForgotIsOtpExpired(true);
    }
    return () => clearInterval(interval);
  }, [showForgotPassword, forgotPasswordStep, forgotOtpTimer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setLoading(false);
      return setError('Please enter a valid email address.');
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password/send-otp`, {
        email: forgotEmail
      });

      if (res.data.otp) {
        setForgotDevOtp(res.data.otp);
      }
      
      setForgotPasswordStep(2);
      setForgotOtpTimer(300); // 5 minutes
      setForgotIsOtpExpired(false);
      setSuccessMsg(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (forgotNewPassword !== forgotConfirmPassword) {
      setLoading(false);
      return setError('Passwords do not match.');
    }

    if (forgotNewPassword.length < 6) {
      setLoading(false);
      return setError('Password must be at least 6 characters.');
    }

    if (!forgotOtp) {
      setLoading(false);
      return setError('Please enter the verification OTP.');
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
        email: forgotEmail,
        otp: forgotOtp,
        password: forgotNewPassword
      });

      setSuccessMsg(res.data.message || 'Password reset successful!');
      
      // Clear password reset input fields
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotDevOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e, faceDescriptor = null) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    if (!faceDescriptor) {
      setUserRole(null);
    }
    
    try {
      const payload = { regdNo: identifier, password };
      if (faceDescriptor) {
        payload.faceDescriptor = faceDescriptor;
        
        // Fetch GPS coordinates for geofence check (primarily for Principals)
        if (userRole === 'PRINCIPAL') {
          try {
            const coords = await getCoordinates();
            payload.latitude = coords.latitude;
            payload.longitude = coords.longitude;
            payload.accuracy = coords.accuracy;
          } catch (locErr) {
            setError(locErr.message || 'GPS Location access is required to log in.');
            setLoading(false);
            return;
          }
        }
      }
      
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);
      
      if (res.data.status === 'FACE_REQUIRED') {
        // Stop loading and show face scanner modal
        setLoading(false);
        setShowFaceAuth(true);
        setUserRole(res.data.role);
        return;
      }
      
      // If we reach here, login is fully successful
      setShowFaceAuth(false);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      localStorage.setItem('loginTime', new Date().toISOString());

      if (res.data.role === 'ADMIN' || res.data.role === 'SYSTEM_ADMIN') navigate('/admin');
      else if (res.data.role === 'EVALUATOR') navigate('/evaluator');
      else if (res.data.role === 'PRINCIPAL') navigate('/principal');
      else if (res.data.role === 'BOS') navigate('/bos');
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

          {successMsg && !showForgotPassword && (
            <div className="bg-teal-50 border border-teal-200 text-teal-700 p-3 rounded-md mb-4 text-sm font-semibold flex items-center justify-center gap-2 text-center animate-fadeIn">
              <ShieldCheck className="h-5 w-5" />
              {successMsg}
            </div>
          )}

          {error && !showForgotPassword && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2 rounded-md mb-4 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}

          {showForgotPassword ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
                <p className="text-xs text-slate-500">
                  {forgotPasswordStep === 1 
                    ? "Enter your registered email address to receive an OTP code." 
                    : "Enter the OTP code sent to your email and create a new password."}
                </p>
              </div>

              {successMsg && (
                <div className="bg-teal-50 border border-teal-200 text-teal-700 p-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2 text-center animate-fadeIn">
                  <ShieldCheck className="h-5 w-5 text-teal-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2 rounded-md text-sm font-semibold flex items-center gap-2 animate-fadeIn">
                  <X className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {forgotPasswordStep === 1 ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-11 w-full border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 font-medium"
                        placeholder="your-email@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-semibold py-3 rounded-md transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                  </button>
                  
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError('');
                        setSuccessMsg('');
                      }}
                      className="text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Verification OTP</label>
                      {forgotIsOtpExpired ? (
                        <button
                          type="button"
                          onClick={handleSendForgotOtp}
                          disabled={loading}
                          className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                        >
                          {loading ? 'Sending...' : 'Resend OTP'}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">
                          Expires in: <span className="text-teal-600">{formatTime(forgotOtpTimer)}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength="6"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        disabled={forgotIsOtpExpired}
                        className="pl-11 w-full border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 font-medium text-center tracking-widest disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder={forgotIsOtpExpired ? "OTP Expired" : "Enter 6-digit OTP"}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Create New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
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

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordStep(1);
                        setError('');
                        setSuccessMsg('');
                      }}
                      className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold py-3 rounded-md transition-all cursor-pointer text-center text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || forgotIsOtpExpired}
                      className="flex-[2] bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-semibold py-3 rounded-md transition-all shadow-md cursor-pointer text-center text-sm"
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : !showFaceAuth ? (
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
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotPasswordStep(1);
                      setForgotEmail('');
                      setForgotOtp('');
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                      setForgotDevOtp('');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
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
                  setUserRole(null);
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
