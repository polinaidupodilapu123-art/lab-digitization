import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const StudentSetup = () => {
  const [regdNo, setRegdNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.regdNo) {
      setRegdNo(location.state.regdNo);
    }
  }, [location]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/student-setup', {
        regdNo,
        password
      });

      setSuccess(true);
      
      // Auto login after 2 seconds
      setTimeout(() => {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify({
          _id: res.data._id,
          regdNo: res.data.regdNo,
          fullName: res.data.fullName,
          role: res.data.role
        }));
        navigate('/student');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Setup failed. Please check your registration number.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-800 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        {success ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
            <p className="text-slate-500 mb-6">Your password has been successfully created.</p>
            <p className="text-sm text-teal-600 animate-pulse">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-teal-700 mb-2">First Time Setup</h1>
              <p className="text-slate-500">Create a password using your Registration Number</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSetup} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regdNo}
                    onChange={(e) => setRegdNo(e.target.value)}
                    className="pl-10 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    placeholder="e.g. 255019201001"
                  />
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Create Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-9 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-9 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
              >
                <span>Complete Setup</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-500">Already have a password? </span>
              <Link to="/login" className="text-teal-600 hover:text-teal-700 font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSetup;
