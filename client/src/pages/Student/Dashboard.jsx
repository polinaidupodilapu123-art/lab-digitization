import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Book, FileText, Download, Upload, X, RefreshCw, CheckCircle } from 'lucide-react';
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

/* ── Upload Record Modal ── */
const UploadRecordModal = ({ assignment, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    
    // Check if it's a PDF
    if (selected.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      setFile(null);
      return;
    }
    
    // Check file size (10MB limit)
    if (selected.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      setFile(null);
      return;
    }

    setFile(selected);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/student/assignments/${assignment._id}/submit`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );
      onSuccess('Lab record uploaded successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload lab record. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 text-white">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Upload Completed Record</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer rounded-md p-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Subject</h4>
            <p className="text-base font-semibold text-teal-800">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{assignment.subjectId?.subCode} • {assignment.subjectId?.semester}</p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Select Completed Lab Record (PDF)
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-teal-500 transition-colors bg-slate-50/50 cursor-pointer relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-1 text-center pointer-events-none">
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <span className="relative rounded-md font-semibold text-teal-700 hover:text-teal-500 focus-within:outline-none">
                    Upload a file
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-400">PDF up to 10MB</p>
              </div>
            </div>
          </div>

          {file && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="h-5 w-5 text-teal-600 flex-shrink-0" />
                <span className="text-sm font-medium text-teal-800 truncate" title={file.name}>
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
              ✕ {error}
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Submit Record'}
            </button>
          </div>
        </form>

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
  const [uploadTarget, setUploadTarget] = useState(null);
  const [message, setMessage] = useState('');

  const fetchMyAssignments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/student/assignments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Sort in the same order as subjects table in master data page:
      // Regular subjects sorted by subject's createdAt desc on top, pedagogy group subjects at the bottom.
      const sorted = res.data.sort((a, b) => {
        const aSub = a.subjectId || {};
        const bSub = b.subjectId || {};
        
        const aIsGroup = !!(a.groupSubjectName || aSub.studentChoice === 'C' || aSub.studentChoice === 'c');
        const bIsGroup = !!(b.groupSubjectName || bSub.studentChoice === 'C' || bSub.studentChoice === 'c');
        
        if (aIsGroup && !bIsGroup) return 1;
        if (!aIsGroup && bIsGroup) return -1;
        if (!aIsGroup && !bIsGroup) {
          return new Date(bSub.createdAt || 0) - new Date(aSub.createdAt || 0);
        }
        const aName = a.groupSubjectName || aSub.subName || '';
        const bName = b.groupSubjectName || bSub.subName || '';
        return aName.localeCompare(bName);
      });
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

  useEffect(() => {
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
        {message && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center space-x-3 text-green-700 border border-green-200">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{message}</span>
            <button onClick={() => setMessage('')} className="ml-auto text-green-400 hover:text-green-600 cursor-pointer rounded-md">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
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
                    <th className="min-w-[10rem] pl-4 sm:pl-6 py-4 font-semibold">Subject</th>
                    <th className="hidden sm:table-cell px-6 py-4 font-semibold">Status</th>
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
                        {assignment.status !== 'Pending' ? (
                          <div className="flex flex-col space-y-1">
                            <span className="inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              Record Submitted
                            </span>
                            {assignment.submittedAt && (
                              <span className="text-xs text-slate-500 font-medium">
                                {new Date(assignment.submittedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            Not Submitted
                          </span>
                        )}
                      </td>
                      

                      
                      <td className="w-[1%] whitespace-nowrap pr-4 text-right sm:pr-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-2 justify-end items-center">
                          {assignment.filePath && (
                            <a 
                              href={`http://localhost:5000${assignment.filePath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center p-2 text-teal-600 hover:text-white hover:bg-teal-700 rounded-md transition-colors border border-teal-200 hover:border-teal-700 cursor-pointer shadow-sm"
                              title="View Uploaded Lab Record PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          
                          <button 
                            onClick={() => handleGenerateBarcodePDF(assignment)}
                            className="flex items-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Download className="h-3 w-3 mr-1.5" />
                            Barcode PDF
                          </button>
                          
                          <button 
                            onClick={() => setUploadTarget(assignment)}
                            className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                              assignment.status === 'Evaluated' 
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                                : assignment.status === 'Submitted'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-teal-600 hover:bg-teal-700 text-white'
                            }`}
                            disabled={assignment.status === 'Evaluated'}
                          >
                            <Upload className="h-3 w-3 mr-1.5" />
                            {assignment.status === 'Evaluated' 
                              ? 'Locked' 
                              : assignment.status === 'Submitted' 
                                ? 'Change Record' 
                                : 'Upload Record'}
                          </button>
                        </div>
                      </td>
                      
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-12 text-slate-500">
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

      {/* Modal */}
      {uploadTarget && (
        <UploadRecordModal
          assignment={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSuccess={(successMsg) => {
            setUploadTarget(null);
            setMessage(successMsg);
            fetchMyAssignments();
            fetchPaperGrades();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
