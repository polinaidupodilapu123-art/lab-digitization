import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, X, Eye, RefreshCw, AlertCircle, ShieldCheck, LogOut, ChevronLeft, ChevronRight, BookOpen, Sparkles, ClipboardCheck, Search ,FileSpreadsheet} from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import SessionTimer from '../../components/SessionTimer';

const BOSDashboard = () => {
  const navigate = useNavigate();
  
  // Pending list state
  const [principals, setPrincipals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
  const [principalsSearch, setPrincipalsSearch] = useState('');

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

  // UI state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    type: '', // 'approve' or 'reject'
    targetId: null,
    targetName: '',
    noteText: ''
  });

  const openNoteModal = (id, name, type) => {
    setError('');
    setNoteModal({
      isOpen: true,
      type,
      targetId: id,
      targetName: name,
      noteText: type === 'reject' ? 'you are not person to register please principal should be register.' : ''
    });
  };

  // VIEW STATE
  const [activeView, setActiveView] = useState('principals');
  const [recordsData, setRecordsData] = useState({ regular: [], supply: [] });
  const [papersData, setPapersData] = useState({ regular: [], supply: [] });
  const [approvalsTab, setApprovalsTab] = useState('records'); // 'records' or 'papers'
  const [approvalsSearch, setApprovalsSearch] = useState('');

  const fetchPendingPrincipals = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/bos/pending-principals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPrincipals(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load pending principal registrations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalsData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const recordsRes = await axios.get(`${API_BASE_URL}/api/bos/evaluated-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (recordsRes.data.success) {
        setRecordsData(recordsRes.data.data);
      }
      
      const papersRes = await axios.get(`${API_BASE_URL}/api/bos/evaluated-papers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (papersRes.data.success) {
        setPapersData(papersRes.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load evaluation approvals data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'principals') {
      fetchPendingPrincipals();
    } else {
      fetchApprovalsData();
    }
    
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarExpanded(false);
      } else {
        setIsSidebarExpanded(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeView]);

  const handleNoteSubmit = async () => {
    const { type, targetId, noteText } = noteModal;
    setError('');
    setSuccessMessage('');
    setNoteModal(prev => ({ ...prev, isOpen: false }));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/bos/${type}-principal/${targetId}`, { note: noteText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage(res.data.message || `Principal registration ${type}d successfully.`);
        fetchPendingPrincipals();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || `Failed to ${type} principal.`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleApproveRecord = async (id, mode) => {
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/bos/approve-record/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage('Record approved successfully.');
        setRecordsData(prev => ({
          regular: mode === 'Regular' ? prev.regular.filter(r => r._id !== id) : prev.regular,
          supply: mode === 'Supply' ? prev.supply.filter(r => r._id !== id) : prev.supply
        }));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to approve record.');
    }
  };

  const handleApproveAllRecords = async (mode) => {
    if (!window.confirm(`Are you sure you want to approve all ${mode} records?`)) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/bos/approve-all-records`, { mode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage(`All ${mode} records approved successfully.`);
        setRecordsData(prev => ({
          regular: mode === 'Regular' ? [] : prev.regular,
          supply: mode === 'Supply' ? [] : prev.supply
        }));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to approve all records.');
    }
  };

  const handleApprovePaper = async (studentId, paperId, mode) => {
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/bos/approve-paper`, { studentId, paperId, mode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage('Paper approved successfully.');
        setPapersData(prev => ({
          regular: mode === 'Regular' ? prev.regular.filter(p => !(p.studentId === studentId && p.paperId === paperId)) : prev.regular,
          supply: mode === 'Supply' ? prev.supply.filter(p => !(p.studentId === studentId && p.paperId === paperId)) : prev.supply
        }));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to approve paper.');
    }
  };

  const handleApproveAllPapers = async (mode) => {
    if (!window.confirm(`Are you sure you want to approve all ${mode} papers?`)) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/bos/approve-all-papers`, { mode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage(`All ${mode} papers approved successfully.`);
        setPapersData(prev => ({
          regular: mode === 'Regular' ? [] : prev.regular,
          supply: mode === 'Supply' ? [] : prev.supply
        }));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to approve all papers.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Computed values for principals filtering
  const filteredPrincipals = (principals || []).filter(p => {
    const term = principalsSearch.toLowerCase().trim();
    const matchesSearch = term ? (
      (p.fullName || '').toLowerCase().includes(term) ||
      (p.email || p.regdNo || '').toLowerCase().includes(term)
    ) : true;
    const matchesStatus = statusFilter === 'ALL' ? true : p.approvalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Computed values for approvals filtering & count
  const filteredRegularRecords = (recordsData.regular || []).filter(r => {
    const term = approvalsSearch.toLowerCase();
    return (
      (r.studentId?.fullName || '').toLowerCase().includes(term) ||
      (r.studentId?.regdNo || '').toLowerCase().includes(term) ||
      (r.groupSubjectName || r.subjectId?.subName || '').toLowerCase().includes(term)
    );
  });

  const filteredSupplyRecords = (recordsData.supply || []).filter(r => {
    const term = approvalsSearch.toLowerCase();
    return (
      (r.studentId?.fullName || '').toLowerCase().includes(term) ||
      (r.studentId?.regdNo || '').toLowerCase().includes(term) ||
      (r.groupSubjectName || r.subjectId?.subName || '').toLowerCase().includes(term)
    );
  });

  const filteredRegularPapers = (papersData.regular || []).filter(p => {
    const term = approvalsSearch.toLowerCase();
    return (
      (p.fullName || '').toLowerCase().includes(term) ||
      (p.regdNo || '').toLowerCase().includes(term) ||
      (p.paperName || '').toLowerCase().includes(term)
    );
  });

  const filteredSupplyPapers = (papersData.supply || []).filter(p => {
    const term = approvalsSearch.toLowerCase();
    return (
      (p.fullName || '').toLowerCase().includes(term) ||
      (p.regdNo || '').toLowerCase().includes(term) ||
      (p.paperName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50">
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarExpanded ? 'w-full md:w-64' : 'w-full md:w-20'
        } bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out md:h-full z-50`}
      >
        <div className={`p-4 flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-between md:justify-center'} border-b border-slate-100`}>
          <div className={`${!isSidebarExpanded ? 'block md:hidden' : 'block'}`}>
            <h2 className="text-xl font-bold text-teal-600 truncate">BOS panel</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Lab Digitization System</p>
          </div>
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="hidden md:block p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none cursor-pointer"
            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto elegant-scrollbar">
          <button
            onClick={() => setActiveView('principals')}
            className={`flex items-center w-full text-left px-3 py-3 rounded-md font-medium transition-colors cursor-pointer border border-transparent ${
              activeView === 'principals'
                ? 'bg-teal-50 text-teal-700 font-semibold border-teal-100/50 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            } ${isSidebarExpanded ? 'space-x-3' : 'justify-center'}`}
          >
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-teal-600" />
            <span className={`${!isSidebarExpanded ? 'inline md:hidden' : 'inline'} truncate ml-3 md:ml-0 ${isSidebarExpanded ? 'md:ml-3' : ''}`}>Pending Principals</span>
          </button>
          <button
            onClick={() => setActiveView('approvals')}
            className={`flex items-center w-full text-left px-3 py-3 rounded-md font-medium transition-colors cursor-pointer border border-transparent ${
              activeView === 'approvals'
                ? 'bg-teal-50 text-teal-700 font-semibold border-teal-100/50 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            } ${isSidebarExpanded ? 'space-x-3' : 'justify-center'}`}
          >
            <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-teal-600" />
            <span className={`${!isSidebarExpanded ? 'inline md:hidden' : 'inline'} truncate ml-3 md:ml-0 ${isSidebarExpanded ? 'md:ml-3' : ''}`}>Evaluation Approvals</span>
          </button>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className={`flex items-center text-slate-600 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-md hover:bg-red-50 group relative cursor-pointer ${isSidebarExpanded ? 'space-x-3' : 'justify-center md:justify-center'}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className={`${!isSidebarExpanded ? 'inline md:hidden' : 'inline'} ml-3 md:ml-0 ${isSidebarExpanded ? 'md:ml-3' : ''}`}>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 relative overflow-y-auto md:overflow-y-auto p-4 sm:p-6">
        <div className="absolute top-8 right-8 z-40">
          <SessionTimer />
        </div>

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-md p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/5 mb-6">
          <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-3.5 py-1 bg-teal-500/20 text-teal-200 border border-teal-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Board of Studies (BOS) Hub
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2.5 bg-gradient-to-r from-white via-slate-100 to-teal-100 bg-clip-text text-transparent">
                {activeView === 'principals' ? 'Principal Verification Panel' : 'Evaluation Approval Panel'}
              </h1>
              <p className="text-teal-200/80 text-sm font-semibold tracking-wide mt-1">
                {activeView === 'principals' 
                  ? 'Authorize Principal registrations to enable administration of college student lab evaluation files.'
                  : 'Verify and approve evaluated subjects and consolidated papers before enabling admin downloads.'}
              </p>
            </div>
            <button 
              onClick={activeView === 'principals' ? fetchPendingPrincipals : fetchApprovalsData}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all self-start md:self-center shrink-0 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {activeView === 'principals' ? 'Sync Principals' : 'Sync Approvals'}
            </button>
          </div>
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

        {/* Dynamic Panel Content */}
        {activeView === 'principals' ? (
          loading && principals.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-4" />
              <span className="font-semibold text-sm">Loading principal verification queue...</span>
            </div>
          ) : principals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-16 text-center shadow-sm max-w-2xl mx-auto mt-8">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-teal-50 text-teal-600 mb-4 border border-teal-100">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Clear Principal Queue</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                All registering college principals have been processed. No pending requests.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-md rounded-tr-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 gap-3">
                <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
                  <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium">Principal Registrations</span>
                  <span className="text-xs text-slate-400 ml-1">({filteredPrincipals.length} shown)</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-60"
                      placeholder="Search Name or Email..."
                      value={principalsSearch}
                      onChange={(e) => setPrincipalsSearch(e.target.value)}
                    />
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer font-semibold shadow-sm"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending Approval</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr className="bg-teal-700 text-white text-sm">
                      <th className="px-4 py-3 text-left whitespace-nowrap">Principal Name</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Email Address</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">College Code</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">College Name</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Registered Photo</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Registration Date & Time</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrincipals.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400 italic">
                          No principal registrations found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPrincipals.map((principal, idx) => (
                        <tr 
                          key={principal._id} 
                          className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}
                        >
                          <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                            {principal.fullName}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                            {principal.email || principal.regdNo}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-semibold">
                            {principal.collegeId?.collegeCode || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                            {principal.collegeId?.collegeName || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center">
                              {principal.profileImage ? (
                                <div className="relative group">
                                  <img 
                                    src={`${API_BASE_URL}${principal.profileImage}`} 
                                    alt={`${principal.fullName} capture`} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm cursor-pointer hover:border-teal-500 transition-colors"
                                    onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${principal.profileImage}`, name: principal.fullName })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${principal.profileImage}`, name: principal.fullName })}
                                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    title="Zoom Image"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">No Photo</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-700 whitespace-nowrap font-medium">
                            {formatDateTime(principal.updatedAt || principal.createdAt)}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {principal.approvalStatus === 'PENDING' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openNoteModal(principal._id, principal.fullName, 'approve')}
                                  className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50 mr-1"
                                  title="Approve Principal"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openNoteModal(principal._id, principal.fullName, 'reject')}
                                  className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-red-50"
                                  title="Reject Principal"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : principal.approvalStatus === 'APPROVED' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 shadow-sm">
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
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <span>Showing <span className="font-semibold text-slate-700">{filteredPrincipals.length}</span> registrations matching filter</span>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 gap-4 mb-4">
              <div className="flex overflow-x-auto elegant-scrollbar whitespace-nowrap">
                <button
                  onClick={() => { setApprovalsTab('records'); setApprovalsSearch(''); }}
                  className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
                    approvalsTab === 'records'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Evaluated Records (Subjects)
                </button>
                <button
                  onClick={() => { setApprovalsTab('papers'); setApprovalsSearch(''); }}
                  className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
                    approvalsTab === 'papers'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Evaluated Papers (Consolidated)
                </button>
              </div>

              <div className="relative w-full sm:w-56 mb-2 sm:mb-0">
                <input
                  type="text"
                  placeholder="Search evaluations..."
                  value={approvalsSearch}
                  onChange={(e) => setApprovalsSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
                <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {approvalsSearch && (
                  <button
                    onClick={() => setApprovalsSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col justify-center items-center py-20 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-4" />
                <span className="font-semibold text-sm">Loading evaluations...</span>
              </div>
            ) : approvalsTab === 'records' ? (
              <>
                {/* REGULAR RECORDS */}
                <div className="bg-white rounded-md rounded-tr-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 gap-3">
                    <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium">Regular Subject Evaluations</span>
                      <span className="text-xs text-slate-400 ml-1">({filteredRegularRecords.length} records)</span>
                    </div>
                    {filteredRegularRecords.length > 0 && (
                      <button
                        onClick={() => handleApproveAllRecords('Regular')}
                        className="flex items-center whitespace-nowrap justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                      >
                        Approve All Regular
                      </button>
                    )}
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-teal-700 text-white text-sm">
                          <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Subject</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Evaluator</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Score</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegularRecords.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-sm italic">
                              No pending regular subject evaluations.
                            </td>
                          </tr>
                        ) : (
                          filteredRegularRecords.map((row, idx) => (
                            <tr key={row._id} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}>
                              <td className="px-4 py-2.5 text-slate-700 font-semibold whitespace-nowrap">{row.studentId?.regdNo}</td>
                              <td className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">{row.studentId?.fullName}</td>
                              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-slate-800 block text-xs">{row.groupSubjectName || row.subjectId?.subName}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{row.subjectId?.subCode} (Sem {row.studentId?.currentSemester})</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-xs">{row.evaluatorId?.fullName || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap font-bold text-teal-700 text-sm">
                                {row.score} <span className="text-[10px] text-slate-400 font-normal">/ {row.maxMarks}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleApproveRecord(row._id, 'Regular')}
                                  className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50"
                                  title="Approve Record"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SUPPLY RECORDS */}
                <div className="bg-white rounded-md rounded-tr-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 gap-3">
                    <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium">Backlog (Supply) Subject Evaluations</span>
                      <span className="text-xs text-slate-400 ml-1">({filteredSupplyRecords.length} records)</span>
                    </div>
                    {filteredSupplyRecords.length > 0 && (
                      <button
                        onClick={() => handleApproveAllRecords('Supply')}
                        className="flex items-center whitespace-nowrap justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                      >
                        Approve All Supply
                      </button>
                    )}
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-teal-700 text-white text-sm">
                          <th className="px-4 py-3 text-center whitespace-nowrap w-16">Photo</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Subject</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Evaluator</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Score</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSupplyRecords.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-sm italic">
                              No pending backlog (supply) subject evaluations.
                            </td>
                          </tr>
                        ) : (
                          filteredSupplyRecords.map((row, idx) => (
                            <tr key={row._id} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}>
                              <td className="px-4 py-2.5 text-center">
                                {row.studentId?.profileImage ? (
                                  <img
                                    src={`${API_BASE_URL}${row.studentId.profileImage}`}
                                    alt={row.studentId.fullName}
                                    onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${row.studentId.profileImage}`, name: row.studentId.fullName })}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 cursor-pointer mx-auto shadow-sm hover:border-teal-500"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto text-[10px] border border-slate-200 font-semibold">
                                    N/A
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700 font-semibold whitespace-nowrap">{row.studentId?.regdNo}</td>
                              <td className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">{row.studentId?.fullName}</td>
                              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-slate-800 block text-xs">{row.groupSubjectName || row.subjectId?.subName}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{row.subjectId?.subCode} (Sem {row.studentId?.currentSemester})</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-xs">{row.evaluatorId?.fullName || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap font-bold text-teal-700 text-sm">
                                {row.score} <span className="text-[10px] text-slate-400 font-normal">/ {row.maxMarks}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleApproveRecord(row._id, 'Supply')}
                                  className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50"
                                  title="Approve Record"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* REGULAR PAPERS */}
                <div className="bg-white rounded-md rounded-tr-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 gap-3">
                    <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium">Regular Consolidated Papers</span>
                      <span className="text-xs text-slate-400 ml-1">({filteredRegularPapers.length} papers)</span>
                    </div>
                    {filteredRegularPapers.length > 0 && (
                      <button
                        onClick={() => handleApproveAllPapers('Regular')}
                        className="flex items-center whitespace-nowrap justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                      >
                        Approve All Regular
                      </button>
                    )}
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-teal-700 text-white text-sm">
                          <th className="px-4 py-3 text-center whitespace-nowrap w-16">Photo</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Paper</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Consolidated Score</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Result</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegularPapers.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-sm italic">
                              No pending regular paper grades.
                            </td>
                          </tr>
                        ) : (
                          filteredRegularPapers.map((row, idx) => (
                            <tr key={`reg-paper-${row.studentId}-${row.paperId}-${idx}`} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}>
                              <td className="px-4 py-2.5 text-center">
                                {row.profileImage ? (
                                  <img
                                    src={`${API_BASE_URL}${row.profileImage}`}
                                    alt={row.fullName}
                                    onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${row.profileImage}`, name: row.fullName })}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 cursor-pointer mx-auto shadow-sm hover:border-teal-500"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto text-[10px] border border-slate-200 font-semibold">
                                    N/A
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700 font-semibold whitespace-nowrap">{row.regdNo}</td>
                              <td className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">{row.fullName}</td>
                              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-slate-800 block text-xs">{row.paperName}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{row.paperCode} (Sem {row.semester})</span>
                              </td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap font-bold text-teal-700 text-sm">
                                {row.obtainedScore} <span className="text-[10px] text-slate-400 font-normal">/ {row.maxMarks}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded border ${row.isPassed ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'} text-[10px] font-semibold`}>
                                  {row.isPassed ? 'PASS' : 'FAIL'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleApprovePaper(row.studentId, row.paperId, 'Regular')}
                                  className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50 mr-1"
                                  title="Approve Paper"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SUPPLY PAPERS */}
                <div className="bg-white rounded-md rounded-tr-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 gap-3">
                    <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium">Backlog (Supply) Consolidated Papers</span>
                      <span className="text-xs text-slate-400 ml-1">({filteredSupplyPapers.length} papers)</span>
                    </div>
                    {filteredSupplyPapers.length > 0 && (
                      <button
                        onClick={() => handleApproveAllPapers('Supply')}
                        className="flex items-center whitespace-nowrap justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                      >
                        Approve All Supply
                      </button>
                    )}
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-teal-700 text-white text-sm">
                          <th className="px-4 py-3 text-center whitespace-nowrap w-16">Photo</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Paper</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Consolidated Score</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Result</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSupplyPapers.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-sm italic">
                              No pending backlog (supply) paper grades.
                            </td>
                          </tr>
                        ) : (
                          filteredSupplyPapers.map((row, idx) => (
                            <tr key={`sup-paper-${row.studentId}-${row.paperId}-${idx}`} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}>
                              <td className="px-4 py-2.5 text-center">
                                {row.profileImage ? (
                                  <img
                                    src={`${API_BASE_URL}${row.profileImage}`}
                                    alt={row.fullName}
                                    onClick={() => setPreviewPhoto({ src: `${API_BASE_URL}${row.profileImage}`, name: row.fullName })}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 cursor-pointer mx-auto shadow-sm hover:border-teal-500"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto text-[10px] border border-slate-200 font-semibold">
                                    N/A
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700 font-semibold whitespace-nowrap">{row.regdNo}</td>
                              <td className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">{row.fullName}</td>
                              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-slate-800 block text-xs">{row.paperName}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{row.paperCode} (Sem {row.semester})</span>
                              </td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap font-bold text-teal-700 text-sm">
                                {row.obtainedScore} <span className="text-[10px] text-slate-400 font-normal">/ {row.maxMarks}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded border ${row.isPassed ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'} text-[10px] font-semibold`}>
                                  {row.isPassed ? 'PASS' : 'FAIL'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleApprovePaper(row.studentId, row.paperId, 'Supply')}
                                  className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-teal-50 mr-1"
                                  title="Approve Paper"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile Image Zoom Viewer Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm truncate flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-300 animate-pulse" />
                {previewPhoto.name} Profile Image
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
            <div className={`p-4 text-white flex items-center justify-between ${noteModal.type === 'approve' ? 'bg-teal-700' : 'bg-rose-700'}`}>
              <h3 className="font-bold text-sm truncate flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                {noteModal.type === 'approve' ? 'Approve Registration' : 'Reject Registration'}
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
                Are you sure you want to <strong className={noteModal.type === 'approve' ? 'text-teal-700' : 'text-rose-700'}>{noteModal.type}</strong> principal <strong className="text-slate-800">{noteModal.targetName}</strong>?
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
                  This note will be included in the automated email sent to the Principal.
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
                className={`px-4 py-1.5 text-white text-xs font-bold rounded cursor-pointer transition-colors shadow-sm ${noteModal.type === 'approve' ? 'bg-teal-700 hover:bg-teal-800' : 'bg-rose-700 hover:bg-rose-800'}`}
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

export default BOSDashboard;
