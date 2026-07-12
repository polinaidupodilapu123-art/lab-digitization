import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Eye, RefreshCw, AlertCircle, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const StudentApprovals = () => {
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
  
  // Modal viewer state
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    type: '', // 'approve' or 'reject'
    targetId: null,
    targetName: '',
    noteText: ''
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes}(${ampm})`;
  };

  const filteredStudents = (pendingStudents || []).filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.approvalStatus === statusFilter;
  });

  const openNoteModal = (id, name, type) => {
    setError('');
    setNoteModal({
      isOpen: true,
      type,
      targetId: id,
      targetName: name,
      noteText: type === 'reject' ? 'Please register with your own face.' : ''
    });
  };

  const fetchPendingApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/principal/pending-approvals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPendingStudents(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load pending student approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleNoteSubmit = async () => {
    const { type, targetId, noteText } = noteModal;
    setError('');
    setSuccessMessage('');
    setNoteModal(prev => ({ ...prev, isOpen: false }));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/principal/${type}-student/${targetId}`, { note: noteText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage(res.data.message || `Student registration ${type}d successfully.`);
        fetchPendingApprovals();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || `Failed to ${type} student registration.`);
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 w-full animate-fadeIn min-h-full">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-teal-600 h-6 w-6" />
            Student Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review live photos of registered students and verify their identities before approving login access.
          </p>
        </div>
        {/* <button 
          onClick={fetchPendingApprovals}
          className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-sm font-semibold transition-colors shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sync List
        </button> */}
      </div>

      {/* Feedback Notifications Toast */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-lg flex items-center justify-between gap-3 shadow-2xl animate-fadeIn pointer-events-auto">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-semibold">{successMessage}</p>
            </div>
            <button 
              onClick={() => setSuccessMessage('')} 
              className="text-emerald-400 hover:text-emerald-700 cursor-pointer"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg flex items-center justify-between gap-3 shadow-2xl animate-fadeIn pointer-events-auto">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            <button 
              onClick={() => setError('')} 
              className="text-rose-400 hover:text-rose-700 cursor-pointer"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Listing */}
      {loading && pendingStudents.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-4" />
          <span className="font-semibold text-sm">Checking pending requests...</span>
        </div>
      ) : pendingStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-16 text-center shadow-sm max-w-2xl mx-auto mt-8">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-teal-50 text-teal-600 mb-4 border border-teal-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Clear Registration Queue</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            All registered students have been verified and processed. No registrations are currently pending.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          {/* Toolbar with status filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 gap-3">
            <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
              <span className="text-sm font-semibold text-slate-700">Student Registration Log</span>
              <span className="text-xs text-slate-400 font-semibold ml-1">({filteredStudents.length} shown)</span>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-bold text-slate-500">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer font-bold shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-800 text-white text-xs uppercase tracking-wider font-bold border-b border-teal-900">
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">HT Number</th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">Student Name</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">Semester</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">Academic Year</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">Registered Photo</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">Registration Date & Time</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400 italic">
                      No student registrations found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr 
                      key={student._id} 
                      className={`transition-colors hover:bg-teal-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {student.regdNo}
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {student.fullName}
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-center font-bold">
                        Sem {student.currentSemester || 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-center font-medium">
                        {student.academicYear || 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {student.profileImage ? (
                            <div className="relative group">
                              <img 
                                src={`${API_BASE_URL}${student.profileImage}`} 
                                alt={`${student.fullName} capture`} 
                                className="w-10 h-10 rounded-md object-cover border border-slate-200 shadow-sm cursor-pointer hover:border-teal-500 transition-colors"
                                onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${student.profileImage}`, name: student.fullName })}
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${student.profileImage}`, name: student.fullName })}
                                className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Zoom Photo"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No Photo Available</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-slate-600 font-medium whitespace-nowrap">
                        {formatDateTime(student.updatedAt || student.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        {student.approvalStatus === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => openNoteModal(student._id, student.fullName, 'approve')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
                              title="Approve Registration"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openNoteModal(student._id, student.fullName, 'reject')}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full border border-rose-200 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
                              title="Reject Registration"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : student.approvalStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Showing {filteredStudents.length} student registration approvals</span>
          </div>
        </div>
      )}

      {/* Profile Image Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm truncate flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-300" />
                {previewPhoto.name} Profile Verify
              </h3>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-100">
              <img 
                src={previewPhoto.src} 
                alt={previewPhoto.name} 
                className="max-h-[320px] rounded border border-slate-200 shadow-md object-contain w-full"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation with Optional Note Modal */}
      {noteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            <div className={`p-4 text-white flex items-center justify-between ${noteModal.type === 'approve' ? 'bg-teal-800' : 'bg-rose-800'}`}>
              <h3 className="font-bold text-sm truncate flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" />
                {noteModal.type === 'approve' ? 'Approve Student Registration' : 'Reject Student Registration'}
              </h3>
              <button 
                onClick={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600">
                Are you sure you want to <strong className={noteModal.type === 'approve' ? 'text-teal-800' : 'text-rose-800'}>{noteModal.type}</strong> student <strong className="text-slate-800">{noteModal.targetName}</strong>?
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Optional Note/Message for Email
                </label>
                <textarea
                  className="w-full h-24 p-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  placeholder={noteModal.type === 'approve' ? 'Add an optional note to include in the approval email...' : 'Describe the reason for rejection...'}
                  value={noteModal.noteText}
                  onChange={(e) => setNoteModal(prev => ({ ...prev, noteText: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400">
                  This note will be included in the automated email sent to the Student.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNoteSubmit}
                className={`px-4 py-1.5 text-white text-xs font-bold rounded cursor-pointer transition-colors shadow-sm ${noteModal.type === 'approve' ? 'bg-teal-800 hover:bg-teal-900' : 'bg-rose-800 hover:bg-rose-900'}`}
              >
                Confirm {noteModal.type === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentApprovals;
