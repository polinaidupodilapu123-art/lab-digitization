import { useState, useEffect } from 'react';
import { ClipboardCheck, Search } from 'lucide-react';
import axios from 'axios';

const EvaluatedRecords = () => {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/assignments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Filter only evaluated records
        const evaluated = res.data.filter(a => a.status === 'Evaluated');
        setRecords(evaluated);
      } catch (err) {
        console.error('Failed to load assignments');
      }
    };
    fetchAssignments();
  }, []);

  const filteredRecords = records.filter(record => 
    record.studentId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.studentId?.regdNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.subjectId?.subName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evaluated Records</h1>
          <p className="text-slate-500 mt-1">Review all lab records that have been graded by evaluators.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search student or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
            Evaluated Submissions ({filteredRecords.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Roll No.</th>
                <th className="px-6 py-4 font-semibold min-w-[12rem]">Document / Subject</th>
                <th className="px-6 py-4 font-semibold">Date of Evaluation</th>
                <th className="px-6 py-4 font-semibold">Evaluated By</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Score</th>
                <th className="px-6 py-4 font-semibold min-w-[10rem]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{record.studentId?.fullName}</td>
                  <td className="px-6 py-4">{record.studentId?.regdNo}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                    <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                  </td>
                  <td className="px-6 py-4">
                    {/* updatedAt reflects the time the evaluator saved the score */}
                    {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{record.evaluatorId?.fullName}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-emerald-600 text-base">{record.score}</span>
                    <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 italic">
                    {record.feedback || 'None'}
                  </td>
                </tr>
              ))}
              
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    No evaluated records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EvaluatedRecords;
