import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileCheck, BookOpen, AlertCircle } from 'lucide-react';
import axios from 'axios';

/* ── Pagination component ── */
const Pagination = ({ total, page, onPage, pageSize = 10 }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-wrap gap-3">
      <span className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of <span className="font-semibold text-slate-700">{total}</span> records
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  p === page
                    ? 'bg-teal-700 text-white border border-teal-700'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          )
        }

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          Next
        </button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState(''); // Active Subject ObjectID
  const [submissions, setSubmissions] = useState([]);
  const [marks, setMarks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Fetch Assigned Subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/evaluator/subjects', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSubjects(res.data || []);
        if (res.data && res.data.length > 0) {
          setActiveTab(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch Submissions
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/evaluator/records', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Sort newly submitted/created records on top
        const sorted = res.data.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
        setSubmissions(sorted);
      } catch (err) {
        console.error('Failed to load records', err);
      } finally {
        setLoadingRecords(false);
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
      alert(err.response?.data?.message || 'Failed to save marks');
    }
  };

  // Filter submissions by selected subject tab
  const filteredSubmissions = submissions.filter(sub => 
    sub.subjectId && sub.subjectId._id.toString() === activeTab.toString()
  );

  const PAGE_SIZE = 10;
  const pagedSubmissions = filteredSubmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
              className="flex items-center text-slate-500 hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assigned Records</h2>
            <p className="text-slate-500 mt-1">Review student lab records and submit marks for your assigned subjects.</p>
          </div>
          <div className="flex space-x-4 text-sm font-medium">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              <span className="text-slate-500 mr-2">Pending (This Subject):</span>
              <span className="text-orange-600 font-semibold">{filteredSubmissions.filter(s => s.status === 'Submitted').length}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              <span className="text-slate-500 mr-2">Evaluated (This Subject):</span>
              <span className="text-emerald-600 font-semibold">{filteredSubmissions.filter(s => s.status === 'Evaluated').length}</span>
            </div>
          </div>
        </div>

        {/* Assigned Subjects Tabs */}
        {loadingSubjects ? (
          <div className="h-10 bg-white border border-slate-200 rounded-lg animate-pulse mb-6"></div>
        ) : subjects.length > 0 ? (
          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto bg-white px-4 pt-3 rounded-2xl shadow-sm border">
            {subjects.map((sub) => (
              <button
                key={sub._id}
                onClick={() => { setActiveTab(sub._id); setCurrentPage(1); }}
                className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md whitespace-nowrap ${
                  activeTab === sub._id
                    ? 'border-teal-600 text-teal-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {sub.subCode} — {sub.subName}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3.5 rounded-2xl mb-6 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <span className="font-medium">No subjects assigned yet. Please contact your system administrator to assign subjects to your account.</span>
          </div>
        )}

        {/* Submissions Table Card */}
        {subjects.length > 0 && (
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
                  {loadingRecords ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                        Loading student submissions…
                      </td>
                    </tr>
                  ) : pagedSubmissions.length > 0 ? (
                    pagedSubmissions.map(sub => (
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
                              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-lg font-medium transition-colors cursor-pointer"
                            >
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                        <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <span className="text-sm font-medium">No student submissions found for this subject.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={filteredSubmissions.length} page={currentPage} onPage={setCurrentPage} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
