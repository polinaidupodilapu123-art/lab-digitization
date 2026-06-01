import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Book, FileText, Download, Upload, X, RefreshCw, CheckCircle, User as UserIcon, ChevronRight, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import JsBarcode from 'jsbarcode';
import { pdf } from '@react-pdf/renderer';
import BarcodePDF from '../../components/BarcodePDF';
import CertificatePDF from '../../components/CertificatePDF';
import SessionTimer from '../../components/SessionTimer';
import ActivityFeed from '../../components/ActivityFeed';

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
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const AssignmentTable = ({ title, data, currentPage, setCurrentPage, handleGenerateBarcodePDF, setUploadTarget }) => {
  const pageSize = 10;
  const pagedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="mb-10">
      <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4">
        <CheckCircle className="h-5 w-5 mr-2 text-teal-600" />
        {title} ({data.length})
      </h3>
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-700 text-white text-sm font-semibold">
                <th className="min-w-[10rem] px-4 py-3 text-left whitespace-nowrap">Subject</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left whitespace-nowrap">Mode</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left whitespace-nowrap">Status</th>
                <th className="hidden md:table-cell px-4 py-3 text-left whitespace-nowrap">Submission Deadline</th>
                <th className="w-[1%] px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((assignment, idx) => (
                <tr key={assignment._id} className={`border-b border-slate-100 transition-colors hover:bg-teal-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="pl-4 sm:pl-6 py-4">
                    <p className="font-semibold text-slate-900">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
                    <p className="text-xs text-slate-500 mt-1">{assignment.subjectId?.subCode} • {assignment.subjectId?.semester}</p>
                    <div className="mt-2 flex items-center text-xs text-slate-500">
                      <FileText className="h-3 w-3 mr-1" />
                      {assignment.pagesRequired} Pages Required
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${assignment.mode === 'Supply' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}
                    `}>
                      {assignment.mode || 'Regular'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4">
                    {assignment.status === 'Evaluated' ? (
                      <span className="inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Evaluated
                      </span>
                    ) : assignment.status === 'Submitted' ? (
                      <div className="flex flex-col space-y-1">
                        <span className="inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Submitted (Pending Evaluation)
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        {assignment.status || 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4">
                    {assignment.deadline ? (
                      (() => {
                        const deadlineDate = new Date(assignment.deadline);
                        const today = new Date();
                        const diffTime = deadlineDate - today;
                        const diffHours = diffTime / (1000 * 60 * 60);

                        let borderClass = 'border-slate-200 bg-slate-50 text-slate-700';
                        if (assignment.status === 'Pending') {
                          if (diffHours < 0) {
                            borderClass = 'border-red-200 bg-red-50 text-red-700 font-bold';
                          } else if (diffHours <= 48) {
                            borderClass = 'border-orange-200 bg-orange-50 text-orange-700 font-bold animate-pulse';
                          }
                        }

                        return (
                          <span className={`inline-flex px-2.5 py-1 border rounded-md text-xs font-semibold ${borderClass}`}>
                            {deadlineDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-300 italic">—</span>
                    )}
                  </td>
                  <td className="w-[1%] whitespace-nowrap pr-4 text-right sm:pr-6 py-4">
                    {(() => {
                      let isPastDeadline = false;
                      if (assignment.deadline) {
                        const deadlineDate = new Date(assignment.deadline);
                        // Extend deadline to the very end of the selected day (23:59:59)
                        deadlineDate.setHours(23, 59, 59, 999);
                        isPastDeadline = new Date() > deadlineDate;
                      }
                      const isLocked = assignment.status === 'Evaluated' || isPastDeadline;
                      
                      return (
                        <div className="flex flex-col sm:flex-row gap-2 justify-end items-center">
                          {assignment.filePath && (
                            <a
                              href={`${API_BASE_URL}${assignment.filePath}`}
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
                            Download Record
                          </button>
                          <button
                            onClick={() => setUploadTarget(assignment)}
                            className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              isLocked 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 border border-slate-200' 
                                : assignment.status === 'Submitted'
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 cursor-pointer shadow-sm'
                                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm cursor-pointer'
                            }`}
                            disabled={isLocked}
                            title={isPastDeadline && assignment.status !== 'Evaluated' ? "Deadline has passed" : ""}
                          >
                            <Upload className="h-3 w-3 mr-1.5" />
                            {isLocked 
                              ? 'Locked' 
                              : assignment.status === 'Submitted' 
                                ? 'Update' 
                                : 'Upload PDF'}
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500 font-medium">
                    No assignments found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4">
        <Pagination total={data.length} page={currentPage} onPage={setCurrentPage} />
      </div>
    </div>
  );
};

/* ── Upload Record Modal ── */
const UploadRecordModal = ({ assignment, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    
    // Check if it's a PDF
    if (selected.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      setFile(null);
      return;
    }
    
    const isGroupSubject = !!assignment.groupSubjectName;
    const semester = String(assignment.subjectId?.semester);
    const isEligibleFor5MB = isGroupSubject && (semester === '3' || semester === '4');
    
    const MAX_SIZE = isEligibleFor5MB ? 5 * 1024 * 1024 : 1 * 1024 * 1024;
    
    if (selected.size > MAX_SIZE) {
      setError(`File size exceeds the limit. ${isEligibleFor5MB ? 'Max 5MB allowed.' : 'Max 1MB allowed.'}`);
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
    if (note.trim()) {
      formData.append('note', note.trim());
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/student/assignments/${assignment._id}/submit`,
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
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
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
            <h4 className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</h4>
            <p className="text-base font-semibold text-teal-800">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{assignment.subjectId?.subCode} • {assignment.subjectId?.semester}</p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Select Completed Lab Record (PDF)
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-teal-500 transition-colors bg-slate-50/50 cursor-pointer relative">
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
                {(() => {
                  const isGroupSubject = !!assignment.groupSubjectName;
                  const semester = String(assignment.subjectId?.semester);
                  const isEligibleFor5MB = isGroupSubject && (semester === '3' || semester === '4');
                  return (
                    <p className="text-xs text-slate-400">PDF up to {isEligibleFor5MB ? '5MB' : '1MB'}</p>
                  );
                })()}
              </div>
            </div>
          </div>

          {file && (
            <div className="bg-teal-50 border border-teal-200 rounded-md p-3 flex items-center justify-between">
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
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200">
              ✕ {error}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <label htmlFor="studentNote" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Add a Note <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="studentNote"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional information about this record..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm resize-none"
            />
          </div>

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
  const [uploadTarget, setUploadTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setProfileData(res.data);
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };
    fetchProfile();
  }, []);

  const fetchMyAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
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

  useEffect(() => {
    fetchMyAssignments();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGenerateBarcodePDF = async (assignment) => {
    try {
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

      const doc = <BarcodePDF assignment={assignment} barcodeDataUrl={barcodeDataUrl} user={user} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();

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

  const regularAssignments = assignments.filter(a => a.mode !== 'Supply');
  const supplyAssignments = assignments.filter(a => a.mode === 'Supply');
  const [regularPage, setRegularPage] = useState(1);
  const [supplyPage, setSupplyPage] = useState(1);

  const allSubmitted = assignments.length > 0 && assignments.every(a => a.status === 'Submitted' || a.status === 'Evaluated');
  
  let latestCompletionDate = '';
  if (allSubmitted) {
    const dates = assignments.map(a => {
      const dateStr = a.updatedAt || a.submittedAt || a.createdAt;
      return dateStr ? new Date(dateStr) : new Date(0);
    });
    const latestDate = new Date(Math.max(...dates));
    const dd = String(latestDate.getDate()).padStart(2, '0');
    const mm = String(latestDate.getMonth() + 1).padStart(2, '0');
    const yyyy = latestDate.getFullYear();
    latestCompletionDate = `${dd}/${mm}/${yyyy}`;
  }

  const handleGenerateCertificate = async () => {
    try {
      const blob = await pdf(<CertificatePDF user={profileData || user} completionDate={latestCompletionDate} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${user.regdNo}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating Certificate PDF', err);
      alert('Failed to generate Certificate. Please try again.');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col md:h-full md:overflow-y-auto bg-slate-50 animate-fade-in w-full">
      {showActivity && (
        <ActivityFeed 
          actionTypes={['UPLOAD_RECORD', 'DOWNLOAD_RECORD']} 
          onClose={() => setShowActivity(false)} 
          refreshTrigger={refreshTrigger} 
        />
      )}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full max-w-[96%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-teal-600 text-white p-2 rounded-md mr-3">
                <Book className="h-5 w-5 animate-pulse-subtle" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Student Portal</h1>
                <p className="text-sm text-slate-500 font-medium">{user.fullName} ({user.regdNo})</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowActivity(true)}
                className="hidden sm:flex items-center text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border border-teal-200 cursor-pointer shadow-sm"
              >
                <Activity className="h-4 w-4 mr-1.5" />
                Activity History
              </button>
              <SessionTimer />
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-600 transition-colors cursor-pointer border border-slate-200"
                  title="My Profile"
                >
                  <UserIcon className="h-4 w-4" />
                </button>
                
                {showProfile && profileData && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-slate-200 p-4 z-50 animate-fade-in">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-slate-800">Student Profile</h4>
                      <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-800 block">{profileData.fullName}</span></p>
                      <p><span className="text-slate-500">Reg No:</span> <span className="font-medium text-slate-800 block">{profileData.regdNo}</span></p>
                      <p><span className="text-slate-500">College:</span> <span className="font-medium text-slate-800 block">{profileData.collegeId?.collegeName || 'N/A'}</span></p>
                      <p><span className="text-slate-500">Course:</span> <span className="font-medium text-slate-800 block">{profileData.courseId?.courseName || 'N/A'}</span></p>
                      <p><span className="text-slate-500">Semester:</span> <span className="font-medium text-slate-800 block">{profileData.currentSemester || 'N/A'}</span></p>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center text-slate-500 hover:text-red-600 font-medium px-3 py-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[96%] mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-slide-in">
        {message && (
          <div className="mb-6 p-4 bg-green-50 rounded-md flex items-center space-x-3 text-green-700 border border-green-200">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{message}</span>
            <button onClick={() => setMessage('')} className="ml-auto text-green-400 hover:text-green-600 cursor-pointer rounded-md">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              My Practical Records
            </h2>
            <p className="text-slate-500 mt-1">
              Download barcode sheets, upload completed records, and monitor submission deadlines.
            </p>
          </div>
          {allSubmitted && (
            <button
              onClick={handleGenerateCertificate}
              className="flex items-center cursor-pointer justify-center px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-md shadow-md text-sm font-semibold transition-all transform hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </button>
          )}
        </div>

        {/* Tables */}
        <AssignmentTable 
          title="Regular Assignments" 
          data={regularAssignments} 
          currentPage={regularPage} 
          setCurrentPage={setRegularPage} 
          handleGenerateBarcodePDF={handleGenerateBarcodePDF}
          setUploadTarget={setUploadTarget}
        />

        {supplyAssignments.length > 0 && (
          <AssignmentTable 
            title="Supply (Backlog) Assignments" 
            data={supplyAssignments} 
            currentPage={supplyPage} 
            setCurrentPage={setSupplyPage} 
            handleGenerateBarcodePDF={handleGenerateBarcodePDF}
            setUploadTarget={setUploadTarget}
          />
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
            setTimeout(() => setMessage(''), 4000);
            setRefreshTrigger(prev => prev + 1);
            fetchMyAssignments();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
