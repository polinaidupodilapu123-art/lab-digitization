import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Search, Save, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const CollegeRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [suggestedMarks, setSuggestedMarks] = useState({});

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/principal/records`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(res.data);
      
      const marksMap = {};
      res.data.forEach(r => {
        if (r.suggestedMarks !== undefined) {
          marksMap[r._id] = r.suggestedMarks;
        }
      });
      setSuggestedMarks(marksMap);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestMarksChange = (id, val) => {
    setSuggestedMarks(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleSaveMarks = async (id) => {
    const val = suggestedMarks[id];
    if (val === undefined || val === '') return;

    try {
      setSavingId(id);
      setSuccessMsg('');
      setError('');
      await axios.put(`${API_BASE_URL}/api/principal/records/${id}/suggest-marks`, {
        suggestedMarks: Number(val)
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccessMsg('Suggested marks saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSavingId(null);
    }
  };

  const filteredRecords = records.filter(r => 
    r.studentId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.studentId?.regdNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.subjectId?.subName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 bg-slate-50 w-full animate-fade-in">
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-600" />
            Submitted Student Records
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review submitted lab records from your college students and provide suggested marks for the external evaluators.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md mb-4 flex items-center gap-2 text-sm font-medium border border-emerald-200">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by student or subject..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="w-full relative">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-teal-700 text-white font-semibold">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Regd No.</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center w-48">Suggested Marks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">Loading records...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No submitted records found.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{record.studentId?.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{record.studentId?.regdNo}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-medium">{record.groupSubjectName || record.subjectId?.subName}</p>
                      <p className="text-xs text-slate-500">Max Marks: {record.subjectId?.maxMarks || record.maxMarks || 100}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                        record.status === 'Evaluated' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const maxMarks = record.subjectId?.maxMarks || record.maxMarks || 100;
                        const val = suggestedMarks[record._id] !== undefined ? suggestedMarks[record._id] : '';
                        const hasError = val !== '' && Number(val) > maxMarks;
                        
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="number" 
                                min="0"
                                value={val}
                                onChange={(e) => handleSuggestMarksChange(record._id, e.target.value)}
                                placeholder="e.g. 18"
                                className={`w-20 px-2 py-1.5 border rounded text-center text-sm focus:outline-none focus:ring-1 ${
                                  hasError 
                                    ? 'border-red-300 focus:ring-red-500 bg-red-50 text-red-700' 
                                    : 'border-slate-300 focus:ring-teal-500'
                                }`}
                                disabled={record.status === 'Evaluated'}
                              />
                              <button
                                onClick={() => handleSaveMarks(record._id)}
                                disabled={savingId === record._id || record.status === 'Evaluated' || hasError}
                                className="p-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                                title="Save Suggested Marks"
                              >
                                {savingId === record._id ? (
                                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {hasError && (
                              <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">
                                Max marks: {maxMarks}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollegeRecords;
