import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Book, FileText, Download, Upload } from 'lucide-react';
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
  const [assignments, setAssignments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('records');
  const [paperGrades, setPaperGrades] = useState([]);

  useEffect(() => {
    const fetchMyAssignments = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/student/assignments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Sort newly created assignments on top
        const sorted = res.data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAssignments(sorted);
      } catch (err) {
        console.error('Failed to load my assignments', err);
      }
    };
    const fetchPaperGrades = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/student/paper-grades', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPaperGrades(res.data);
      } catch (err) {
        console.error('Failed to load paper grades', err);
      }
    };
    fetchMyAssignments();
    fetchPaperGrades();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGenerateBarcodePDF = async (assignment) => {
    try {
      const JsBarcode = (await import('jsbarcode')).default;
      const { pdf } = await import('@react-pdf/renderer');
      const BarcodePDF = (await import('../../components/BarcodePDF')).default;

      // 1. Generate Barcode Base64 (Using student's registration number)
      const rollNumber = assignment.studentId?.regdNo || user?.regdNo || 'Student';
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, rollNumber, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 16,
        margin: 10,
        width: 2,
        height: 60
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      // 2. Generate PDF Blob
      const doc = <BarcodePDF assignment={assignment} barcodeDataUrl={barcodeDataUrl} user={user} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();

      // 3. Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Barcode_${assignment.subjectId?.subCode || 'Subject'}_${rollNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const PAGE_SIZE = 10;
  const pagedAssignments = assignments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-teal-600 text-white p-2 rounded-lg mr-3">
                <Book className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Student Portal</h1>
                <p className="text-sm text-slate-500 font-medium">{user.fullName} ({user.regdNo})</p>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {activeTab === 'records' ? 'My Subjects' : 'My Paper Grades'}
          </h2>
          <p className="text-slate-500 mt-1">
            {activeTab === 'records' 
              ? 'Download barcode sheets and upload your completed lab records.' 
              : 'Track aggregated marks across combined practical exam papers.'}
          </p>
        </div>

        {/* Tabs styled exactly like Master Data */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => { setActiveTab('records'); setCurrentPage(1); }}
            className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
              activeTab === 'records'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Practical Records
          </button>
          <button
            onClick={() => { setActiveTab('grades'); }}
            className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
              activeTab === 'grades'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Paper Grades
          </button>
        </div>

        {activeTab === 'records' ? (
          <div className="bg-white border border-slate-200 rounded-b-2xl rounded-tr-2xl border-t-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="min-w-[10rem] pl-4 sm:pl-6 py-4 font-semibold">Document</th>
                    <th className="hidden sm:table-cell px-6 py-4 font-semibold">Submitted</th>
                    <th className="min-w-[8rem] pr-4 sm:pr-6 sm:text-left py-4 font-semibold">Evaluation</th>
                    <th className="w-[1%] whitespace-nowrap pr-4 text-right sm:pr-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAssignments.map(assignment => (
                    <tr key={assignment._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      
                      <td className="pl-4 sm:pl-6 py-4">
                        <p className="font-semibold text-slate-900">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500 mt-1">{assignment.subjectId?.subCode} • {assignment.subjectId?.semester}</p>
                        <div className="mt-2 flex items-center text-xs text-slate-500">
                          <FileText className="h-3 w-3 mr-1" />
                          Requires {assignment.pagesRequired} pages
                        </div>
                      </td>
                      
                      <td className="hidden sm:table-cell px-6 py-4">
                        {assignment.submittedAt ? (
                          <span className="text-slate-700 font-medium">{new Date(assignment.submittedAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not submitted</span>
                        )}
                      </td>
                      
                      <td className="pr-4 sm:pr-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            assignment.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 
                            assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {assignment.status}
                          </span>
                          {assignment.status === 'Evaluated' && (
                            <span className="text-sm font-semibold text-slate-900">
                              Score: {assignment.score} {assignment.maxMarks ? `/ ${assignment.maxMarks}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="w-[1%] whitespace-nowrap pr-4 text-right sm:pr-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-2 justify-end">
                          <button 
                            onClick={() => handleGenerateBarcodePDF(assignment)}
                            className="flex items-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Download className="h-3 w-3 mr-1.5" />
                            Barcode PDF
                          </button>
                          
                          <button 
                            className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                              assignment.status !== 'Pending' 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-teal-600 hover:bg-teal-700 text-white'
                            }`}
                            disabled={assignment.status !== 'Pending'}
                          >
                            <Upload className="h-3 w-3 mr-1.5" />
                            {assignment.status !== 'Pending' ? 'Uploaded' : 'Upload Record'}
                          </button>
                        </div>
                      </td>
                      
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-slate-500">
                        You have no assigned lab records at the moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={assignments.length} page={currentPage} onPage={setCurrentPage} />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paperGrades.map((paper) => {
              const isEvaluated = paper.status === 'Evaluated';
              const isPartially = paper.status === 'Partially Evaluated';
              const isPassed = paper.obtainedScore >= paper.passMarks;
              
              return (
                <div key={paper.paperCode} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {paper.paperCode}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isEvaluated ? 'bg-green-100 text-green-800' :
                        isPartially ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {paper.status}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 min-h-[3.5rem]">
                      {paper.paperName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{paper.semester}</p>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject Breakdown</h4>
                      <div className="space-y-2">
                        {paper.subjects.map(sub => (
                          <div key={sub.subCode} className="flex justify-between items-center text-xs text-slate-600">
                            <span className="truncate max-w-[180px]">{sub.subName}</span>
                            <span className="font-semibold text-slate-900">
                              {sub.score !== null ? `${sub.score} / ${sub.maxMarks}` : sub.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Aggregated Score</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        {paper.obtainedScore !== null ? (
                          <>
                            <span className={isPassed ? "text-emerald-600" : "text-red-600"}>
                              {paper.obtainedScore}
                            </span>
                            <span className="text-slate-400 text-sm font-normal"> / {paper.maxMarks}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-bold text-base italic">Pending</span>
                        )}
                      </p>
                    </div>

                    {paper.obtainedScore !== null && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isPassed ? 'PASS' : 'FAIL'} (Min: {paper.passMarks})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {paperGrades.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-2xl">
                No paper mappings found for your current course semester.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
