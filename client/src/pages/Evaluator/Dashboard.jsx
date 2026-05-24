import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileCheck, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [submissions, setSubmissions] = useState([]);
  const [marks, setMarks] = useState({});

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/evaluator/records', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSubmissions(res.data);
      } catch (err) {
        console.error('Failed to load records', err);
      }
    };
    fetchRecords();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMarkChange = (id, field, value) => {
    setMarks(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: value } 
    }));
  };

  const handleSubmitMarks = async (id) => {
    const data = marks[id];
    if (!data || !data.score) return;
    
    try {
      await axios.post(`http://localhost:5000/api/evaluator/records/${id}/grade`, {
        score: Number(data.score),
        feedback: data.remarks || ''
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSubmissions(prev => prev.map(sub => 
        sub._id === id ? { ...sub, status: 'Evaluated', score: Number(data.score), feedback: data.remarks } : sub
      ));
      alert('Marks saved successfully!');
    } catch (err) {
      alert('Failed to save marks');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-emerald-600 text-white p-2 rounded-lg mr-3">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Evaluator Portal</h1>
                <p className="text-sm text-slate-500 font-medium">{user.fullName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-slate-500 hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assigned Records</h2>
            <p className="text-slate-500 mt-1">Review student lab records and submit marks.</p>
          </div>
          <div className="flex space-x-4 text-sm font-medium">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              <span className="text-slate-500 mr-2">Pending:</span>
              <span className="text-orange-600">{submissions.filter(s => s.status === 'Submitted').length}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              <span className="text-slate-500 mr-2">Evaluated:</span>
              <span className="text-emerald-600">{submissions.filter(s => s.status === 'Evaluated').length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Student name</th>
                  <th className="px-6 py-4">Roll no.</th>
                  <th className="px-6 py-4">Academic year</th>
                  <th className="min-w-[10rem] px-6 py-4">Document</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="w-[4.5rem] px-6 py-4 tabular-nums">Score</th>
                  <th className="min-w-[6rem] px-6 py-4">Remarks</th>
                  <th className="w-[1%] pr-4 text-right px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map(sub => (
                  <tr key={sub._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{sub.studentId?.fullName}</td>
                    <td className="px-6 py-4 text-slate-500">{sub.studentId?.regdNo}</td>
                    <td className="px-6 py-4 text-slate-500">{sub.academicYear || '—'}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{sub.groupSubjectName || sub.subjectId?.subName}</p>
                      <a href={sub.filePath} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline text-xs mt-1 block">
                        View Submission PDF
                      </a>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {sub.status === 'Evaluated' ? (
                        <div className="font-bold text-slate-900">{sub.score} / {sub.maxMarks}</div>
                      ) : (
                        <input 
                          type="number" 
                          min="0" 
                          max={sub.maxMarks}
                          value={marks[sub._id]?.score || ''}
                          onChange={(e) => handleMarkChange(sub._id, 'score', e.target.value)}
                          className="w-16 border border-slate-300 rounded p-1 text-center"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {sub.status === 'Evaluated' ? (
                        <span className="text-slate-600 text-sm">{sub.feedback || '—'}</span>
                      ) : (
                        <input 
                          type="text" 
                          value={marks[sub._id]?.remarks || ''}
                          onChange={(e) => handleMarkChange(sub._id, 'remarks', e.target.value)}
                          className="w-full border border-slate-300 rounded p-1 text-sm"
                          placeholder="Optional remarks"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sub.status !== 'Evaluated' && (
                        <button 
                          onClick={() => handleSubmitMarks(sub._id)}
                          disabled={!marks[sub._id]?.score}
                          className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-lg font-medium transition-colors"
                        >
                          Submit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
