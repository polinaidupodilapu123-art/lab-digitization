import { useState, useEffect } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import axios from 'axios';

const Evaluators = () => {
  const [evaluators, setEvaluators] = useState([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Mocking evaluators fetch
    setEvaluators([
      { _id: 'e1', fullName: 'Dr. John Doe', regdNo: 'john@aknu.edu', role: 'EVALUATOR' }
    ]);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('Evaluator created successfully (mock)');
    // In real app, call endpoint to create evaluator
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Manage Evaluators</h1>
        <p className="text-slate-500 mt-2">Create evaluator accounts and assign them to specific subjects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center mb-6">
              <UserPlus className="h-5 w-5 mr-2 text-teal-600" />
              New Evaluator
            </h2>
            
            {message && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                {message}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" required
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (used for login)</label>
                <input 
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition-colors mt-2"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>

        {/* List of Evaluators */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-teal-600" />
                Active Evaluators
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluators.map(evaluator => (
                    <tr key={evaluator._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{evaluator.fullName}</td>
                      <td className="px-6 py-4 text-slate-600">{evaluator.regdNo}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-teal-600 hover:underline">Assign Subjects</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Evaluators;
