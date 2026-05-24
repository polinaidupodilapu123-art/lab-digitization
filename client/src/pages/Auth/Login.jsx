import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, User } from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = role === 'STUDENT'
        ? { regdNo: identifier, password }
        : { email: identifier, password };

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

      {/* Three-column layout: image | card | image */}
      <div className="flex items-center justify-center gap-6 w-full max-w-5xl">

        {/* Left decorative image */}
        {/* <div className="hidden lg:flex flex-1 justify-end">
          <img
            src="/login_left.png"
            alt="Lab illustration"
            className="w-64 xl:w-72 object-contain drop-shadow-2xl"
          />
        </div> */}

        {/* Login Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex-shrink-0">

          {/* Role Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            {['STUDENT', 'EVALUATOR', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  role === r
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-teal-700'
                }`}
              >
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <p className="text-slate-500 text-sm text-center mb-6">
            Welcome back! Sign in to your {role.charAt(0) + role.slice(1).toLowerCase()} account.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-5 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {role === 'STUDENT' ? 'Registration Number' : 'Email / ID'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder={role === 'STUDENT' ? 'e.g. 255019201001' : 'admin@university.edu'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-md"
            >
              Sign In
            </button>
          </form>

          {role === 'STUDENT' && (
            <div className="mt-5 text-center text-sm">
              <span className="text-slate-500">First time? </span>
              <Link
                to="/student-setup"
                className="text-teal-700 hover:text-teal-800 font-medium hover:underline"
              >
                Set up your password
              </Link>
            </div>
          )}
        </div>

        {/* Right decorative image */}
        {/* <div className="hidden lg:flex flex-1 justify-start">
          <img
            src="/login_right.png"
            alt="Students illustration"
            className="w-64 xl:w-72 object-contain drop-shadow-2xl"
          />
        </div> */}

      </div>
    </div>
  );
};

export default Login;
