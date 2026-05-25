import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, User } from 'lucide-react';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { regdNo: identifier, password };

      const res = await axios.post('http://localhost:5000/api/auth/login', payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));

      if (res.data.role === 'ADMIN') navigate('/admin');
      else if (res.data.role === 'EVALUATOR') navigate('/evaluator');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-800 p-4">
      <div className="flex items-center justify-center gap-6 w-full max-w-5xl">
        
        {/* Login Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex-shrink-0">
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Lab Digitization Portal</h1>
            <p className="text-slate-500 text-sm mt-1.5">
              Sign in using your Registration Number or Email Address.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-5 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Registration Number or Email
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
                  className="pl-11 w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 font-medium"
                  placeholder="e.g. 255019201001 or admin@aknu.edu"
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-slate-100 pt-4">
            <span className="text-slate-500">First time student? </span>
            <Link
              to="/student-setup"
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
