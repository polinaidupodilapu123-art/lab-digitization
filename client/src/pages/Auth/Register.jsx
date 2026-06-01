import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Mail, MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Search, ChevronDown, Check } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import Header from '../../components/Header';
import FaceScanner from '../../components/FaceScanner';

const Register = () => {
  const [step, setStep] = useState(1); // 1 = Registration & Email, 2 = OTP & Password
  const [regdNo, setRegdNo] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('STUDENT');
  const [colleges, setColleges] = useState([]);
  const [collegeId, setCollegeId] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [otpTimer, setOtpTimer] = useState(0);
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // For testing ease
  const [devOtp, setDevOtp] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.regdNo) {
      setRegdNo(location.state.regdNo);
    }
    
    // Fetch colleges for Principal registration
    const fetchColleges = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/colleges`);
        setColleges(res.data);
      } catch (err) {
        console.error('Error fetching colleges:', err);
      }
    };
    fetchColleges();
  }, [location]);

  useEffect(() => {
    let interval;
    if (step === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0 && step === 2) {
      setIsOtpExpired(true);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (role === 'PRINCIPAL') {
      if (!collegeId) {
        setLoading(false);
        return setError('Please select your college.');
      }
    } else {
      if (!regdNo) {
        setLoading(false);
        return setError('Registration number is required.');
      }
    }

    if (!email || !email.includes('@')) {
      setLoading(false);
      return setError('Please enter a valid email address.');
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/send-otp`, {
        regdNo: role === 'PRINCIPAL' ? email : regdNo,
        email,
        role,
        collegeId: role === 'PRINCIPAL' ? collegeId : undefined
      });

      // Save OTP to devOtp state for testing help if it's returned
      if (res.data.otp) {
        setDevOtp(res.data.otp);
      }
      
      setStep(2);
      setOtpTimer(300); // 5 minutes
      setIsOtpExpired(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check your registration details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete Setup with Email Verification
  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setLoading(false);
      return setError('Passwords do not match.');
    }

    if (password.length < 6) {
      setLoading(false);
      return setError('Password must be at least 6 characters.');
    }

    if (!otp) {
      setLoading(false);
      return setError('Please enter the OTP sent to your email.');
    }

    if (role === 'STUDENT' && !faceDescriptor) {
      setLoading(false);
      return setError('Face capture is required.');
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/setup`, {
        regdNo: role === 'PRINCIPAL' ? email : regdNo,
        email,
        otp,
        password,
        role,
        collegeId: role === 'PRINCIPAL' ? collegeId : undefined,
        faceDescriptor
      });

      setSuccess(true);
      
      // Navigate to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { state: { message: 'Setup complete! Please log in to continue.' } });
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Verification or Setup failed. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-md border border-slate-200 shadow-xl p-8 relative my-auto">
        
        {/* Step Indicator top border decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 flex overflow-hidden rounded-t-sm">
          <div className={`h-full flex-1 transition-all duration-300 ${step >= 1 ? 'bg-teal-500' : 'bg-slate-100'}`}></div>
          <div className={`h-full flex-1 transition-all duration-300 ${step >= 2 ? 'bg-teal-500' : 'bg-slate-100'}`}></div>
          <div className={`h-full flex-1 transition-all duration-300 ${success ? 'bg-green-500' : 'bg-slate-100'}`}></div>
        </div>

        {success ? (
          <div className="text-center py-8 animate-fadeIn">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
            <p className="text-slate-500 mb-6 text-sm">Your password has been successfully created and verified.</p>
            <p className="text-xs font-semibold text-teal-600 animate-pulse bg-teal-50 py-2 rounded-md">
              Redirecting to your dashboard...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Account Registration</h1>
              <p className="text-slate-500 text-sm mt-1">Verify your identity to set up your account</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md mb-6 text-xs text-center font-medium animate-fadeIn">
                {error}
              </div>
            )}

            {/* --- STEP 1 FORM --- */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4 animate-fadeIn">
                
                {/* Role Selection Tabs */}
                <div className="flex rounded-md p-1 bg-slate-100 mb-6">
                  <button
                    type="button"
                    onClick={() => { setRole('STUDENT'); setError(''); }}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${role === 'STUDENT' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRole('PRINCIPAL'); setError(''); }}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${role === 'PRINCIPAL' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Principal
                  </button>
                </div>

                {role === 'STUDENT' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Registration Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={regdNo}
                        onChange={(e) => setRegdNo(e.target.value.trim())}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors bg-slate-50"
                        placeholder="e.g. 255019201001"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Select Your College
                    </label>
                    <div className="relative">
                      <div 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center justify-between w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-md focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 sm:text-sm transition-colors bg-slate-50 cursor-pointer"
                      >
                        <span className={`block truncate ${!collegeId ? 'text-slate-400' : 'text-slate-900'}`}>
                          {collegeId 
                            ? (() => {
                                const c = colleges.find(c => c._id === collegeId);
                                return c ? `${c.collegeCode} - ${c.collegeName}` : 'Select College';
                              })()
                            : '-- Choose College --'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </div>
                      
                      {isDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="Search by name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="py-1">
                            {colleges
                              .filter(c => 
                                c.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                c.collegeCode.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .map(c => (
                                <div
                                  key={c._id}
                                  onClick={() => {
                                    setCollegeId(c._id);
                                    setIsDropdownOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 cursor-pointer flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-medium">{c.collegeCode} - {c.collegeName}</span>
                                  </div>
                                  {collegeId === c._id && <Check className="h-4 w-4 text-teal-600" />}
                                </div>
                              ))
                            }
                            {colleges.filter(c => 
                              c.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              c.collegeCode.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-4 text-sm text-center text-slate-500">
                                No colleges found.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-all"
                      placeholder="Enter active email address"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md transition-colors mt-6 cursor-pointer text-sm shadow-sm"
                >
                  {loading ? (
                    <span className="text-xs">Sending OTP...</span>
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* --- STEP 2 FORM --- */}
            {step === 2 && (
              <form onSubmit={handleSetup} className="space-y-4 animate-fadeIn">
                
                {/* OTP Info Display */}
                <div className="bg-teal-50 border border-teal-200 p-3 rounded-md text-teal-800 text-xs text-center font-medium mb-2">
                  <p>Verification OTP sent to: <span className="font-semibold">{email}</span></p>
                  {devOtp && (
                    <p className="mt-1 font-bold text-teal-900 bg-teal-100/80 py-1 rounded inline-block px-3">
                      Development Mode OTP: <span className="underline select-all">{devOtp}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Verification OTP</label>
                    {isOtpExpired ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        {loading ? 'Sending...' : 'Resend OTP'}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        Expires in: <span className="text-teal-600">{formatTime(otpTimer)}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MessageSquare className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      disabled={isOtpExpired}
                      className="pl-10 w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-all text-center tracking-widest font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                      placeholder={isOtpExpired ? "OTP Expired" : "Enter 6-digit OTP"}
                    />
                  </div>
                  {isOtpExpired && (
                    <p className="text-xs text-red-500 font-medium mt-1">OTP has expired. Please request a new one.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Create Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-9 w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-9 w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {role === 'STUDENT' && (
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider text-center">Face Enrollment</label>
                    <p className="text-[11px] text-slate-500 text-center mb-3">Please capture your face to secure your account. You will need this to log in.</p>
                    <FaceScanner onCapture={(descriptor) => {
                      setFaceDescriptor(descriptor);
                      setError('');
                    }} mode="enroll" />
                    {!faceDescriptor && <p className="text-xs text-red-500 font-medium text-center mt-2">Face capture is required to complete setup.</p>}
                  </div>
                )}

                <div className="flex gap-3 pt-2 mt-4">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="flex-1 flex items-center justify-center space-x-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-md transition-colors cursor-pointer text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading || isOtpExpired || (role === 'STUDENT' && !faceDescriptor)}
                    className="flex-[2] flex items-center justify-center space-x-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md transition-colors cursor-pointer text-sm shadow-sm"
                  >
                    {loading ? (
                      <span className="text-xs">Verifying...</span>
                    ) : (
                      <>
                        <span>Verify & Complete</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-xs border-t border-slate-100 pt-4">
              <span className="text-slate-500">Already registered? </span>
              <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Register;
