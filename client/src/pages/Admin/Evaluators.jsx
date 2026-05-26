import { useState, useEffect } from 'react';
import { Shield, BookOpen, CheckCircle, RefreshCw, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';
import SearchableDropdown from '../../components/SearchableDropdown';

import { API_BASE_URL } from '../../utils/config';

const API = `${API_BASE_URL}/api/admin`;
const PAGE_SIZE = 10;

/* ── Pagination component ── */
const Pagination = ({ total, page, onPage }) => {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
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
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-3 w-3" /> Prev
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
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          Next <ChevronRight className="h-3 w-3" />
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

/* ── Subject Allocation Configuration Panel ── */
const SubjectAllocationPanel = ({ allocation, colleges, assignments, subjectId, groupSubjectName, onChange }) => {
  const [colSearch, setColSearch] = useState('');
  
  const handleFieldChange = (field, value) => {
    onChange(field, value);
  };
  
  const filteredColleges = colleges.filter(c => 
    (c.collegeName || '').toLowerCase().includes(colSearch.toLowerCase()) ||
    (c.collegeCode || '').toLowerCase().includes(colSearch.toLowerCase())
  );

  const getPendingCountForCollege = (colId) => {
    if (!assignments || !Array.isArray(assignments)) return 0;
    return assignments.filter(a => {
      if (a.evaluatorId) return false;
      
      if (subjectId) {
        const aSubId = a.subjectId?._id || a.subjectId;
        if (!aSubId || aSubId.toString() !== subjectId.toString()) return false;
      } else if (groupSubjectName) {
        if (!a.groupSubjectName || a.groupSubjectName.trim().toLowerCase() !== groupSubjectName.trim().toLowerCase()) return false;
      } else {
        return false;
      }
      
      const aColId = a.studentId?.collegeId?._id || a.studentId?.collegeId;
      if (!aColId || aColId.toString() !== colId.toString()) return false;
      
      return true;
    }).length;
  };
  
  return (
    <div className="mt-2.5 p-3.5 bg-slate-100/90 border border-slate-200/80 rounded-md space-y-3.5 transition-all duration-300 shadow-inner animate-fade-in">
      {/* Valuation Deadline & Split Method */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Valuation Deadline
          </label>
          <input
            type="date"
            value={allocation.valuationDeadline || ''}
            onChange={(e) => handleFieldChange('valuationDeadline', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium text-slate-700 shadow-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Record Split Mode
          </label>
          <select
            value={allocation.splitMethod || 'ALL'}
            onChange={(e) => handleFieldChange('splitMethod', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-semibold text-slate-700 shadow-sm cursor-pointer outline-none"
          >
            <option value="ALL">Assign All Records</option>
            <option value="COLLEGE">Filter by College</option>
            <option value="RANGE">Filter by Roll Number Range</option>
          </select>
        </div>
      </div>
      
      {/* College-wise Split Option */}
      {allocation.splitMethod === 'COLLEGE' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Select College(s)
            </label>
            <input
              type="text"
              placeholder="Search college..."
              value={colSearch}
              onChange={(e) => setColSearch(e.target.value)}
              className="px-2 py-0.5 text-[10px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 w-32 shadow-sm text-slate-700"
            />
          </div>
          <div className="border border-slate-200 rounded-md p-2 bg-white max-h-32 overflow-y-auto sleek-scrollbar space-y-1 shadow-sm">
            {filteredColleges.map(col => {
              const isChecked = allocation.collegeIds?.includes(col._id);
              const pending = getPendingCountForCollege(col._id);
              return (
                <label key={col._id} className={`flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs transition-colors ${isChecked ? 'bg-teal-50/40' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked || false}
                    onChange={() => {
                      const nextColIds = isChecked
                        ? allocation.collegeIds.filter(id => id !== col._id)
                        : [...(allocation.collegeIds || []), col._id];
                      handleFieldChange('collegeIds', nextColIds);
                    }}
                    className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <span className="font-medium text-slate-700 flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-900">{col.collegeCode}</span> - {col.collegeName}
                    {pending > 0 ? (
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-orange-700 bg-orange-100 rounded-full leading-none">
                        {pending} pending
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-medium text-slate-400 bg-slate-100 rounded-full leading-none">
                        0 pending
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
            {filteredColleges.length === 0 && (
              <p className="text-[11px] text-slate-400 italic text-center py-2">No colleges match search.</p>
            )}
          </div>
        </div>
      )}
      
      {/* Roll Range-wise Split Option */}
      {allocation.splitMethod === 'RANGE' && (
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Student Registration Number Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                placeholder="Start Roll No"
                value={allocation.rollStart || ''}
                onChange={(e) => handleFieldChange('rollStart', e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium text-slate-700 shadow-sm"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="End Roll No"
                value={allocation.rollEnd || ''}
                onChange={(e) => handleFieldChange('rollEnd', e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium text-slate-700 shadow-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Assigns only students whose registration numbers lie alphanumerically within this range (inclusive).
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Subject Assignment Modal ── */
const AssignSubjectsModal = ({ evaluator, onClose, onSuccess }) => {
  const token = localStorage.getItem('token');
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const loadData = async () => {
      try {
        const [subRes, groupsRes, assignRes, collegeRes] = await Promise.all([
          axios.get(`${API}/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/assignments`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/colleges`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const sortedSubs = (subRes.data || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setSubjects(sortedSubs);
        setGroups(groupsRes.data || []);
        setAssignments(assignRes.data || []);
        setColleges(collegeRes.data || []);
        
        setAllocations({});
        setSelectedGroupCode('');
      } catch (err) {
        setError('Failed to load subject options.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();

    return () => { document.body.style.overflow = 'unset'; };
  }, [evaluator, token]);

  const handleToggleRegular = (id) => {
    const idStr = id.toString();
    setAllocations(prev => {
      const next = { ...prev };
      if (next[idStr]) {
        delete next[idStr];
      } else {
        next[idStr] = {
          subjectId: idStr,
          valuationDeadline: '',
          splitMethod: 'ALL',
          collegeIds: [],
          rollStart: '',
          rollEnd: ''
        };
      }
      return next;
    });
  };

  const handleToggleGroupSubject = (name) => {
    const trimmedName = name.trim();
    setAllocations(prev => {
      const next = { ...prev };
      if (next[trimmedName]) {
        delete next[trimmedName];
      } else {
        next[trimmedName] = {
          groupSubjectName: trimmedName,
          valuationDeadline: '',
          splitMethod: 'ALL',
          collegeIds: [],
          rollStart: '',
          rollEnd: ''
        };
      }
      return next;
    });
  };

  const updateAllocation = (key, field, value) => {
    setAllocations(prev => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    const allocationList = Object.values(allocations);
    if (allocationList.length === 0) {
      setError('Please select at least one subject to assign.');
      setSaving(false);
      return;
    }
    
    try {
      await axios.post(`${API}/evaluators/${evaluator._id}/subjects`, {
        allocations: allocationList
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess('Subjects and student sheets assigned successfully with custom splits & deadlines!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject assignments.');
    } finally {
      setSaving(false);
    }
  };

  const activeGroup = groups.find(g => g.groupCode === selectedGroupCode);
  const activeGroupSubjects = activeGroup ? [activeGroup.pedagogy1Name, activeGroup.pedagogy2Name].filter(Boolean) : [];

  const filteredRegular = subjects
    .filter(sub => sub.studentChoice !== 'C' && sub.studentChoice !== 'c');

  const selectedIds = Object.values(allocations)
    .filter(a => a.subjectId)
    .map(a => a.subjectId);

  const selectedGroupSubs = Object.values(allocations)
    .filter(a => a.groupSubjectName)
    .map(a => a.groupSubjectName);

  const getSubjectTotalPending = (subId, groupName) => {
    if (!assignments || !Array.isArray(assignments)) return 0;
    return assignments.filter(a => {
      if (a.evaluatorId) return false;
      if (subId) {
        const aSubId = a.subjectId?._id || a.subjectId;
        return aSubId && aSubId.toString() === subId.toString();
      } else if (groupName) {
        return a.groupSubjectName && a.groupSubjectName.trim().toLowerCase() === groupName.trim().toLowerCase();
      }
      return false;
    }).length;
  };

  const submittedCount = assignments.filter(a => {
    if (a.status === 'Pending') return false;
    
    const isRegularMatch = a.subjectId && selectedIds.includes((a.subjectId._id || a.subjectId).toString());
    const isGroupMatch = a.groupSubjectName && selectedGroupSubs.includes(a.groupSubjectName);
    
    return isRegularMatch || isGroupMatch;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 flex-shrink-0 text-white animate-fade-in">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 animate-pulse-subtle" />
            <h3 className="text-lg font-semibold">Assign Subjects</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-teal-900/60 text-teal-200 border border-teal-500/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-all duration-300">
              Submitted Records: <span className="text-white">{submittedCount}</span>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer rounded-md p-0.5">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col min-h-0">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200 animate-slide-in">
              ✕ {error}
            </div>
          )}

          {/* Group dropdown selection */}
          <div className="mb-4 flex-shrink-0 relative z-30">
            <SearchableDropdown
              label="Select Group for Pedagogy Option"
              placeholder="-- Select a Group --"
              options={groups.map(g => ({ value: g.groupCode, label: `${g.groupCode} - ${g.groupName}` }))}
              value={selectedGroupCode}
              onChange={setSelectedGroupCode}
            />
          </div>

          {/* Subjects Checklist */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 p-2.5 bg-slate-50/50 max-h-[45vh] sleek-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading options…
              </div>
            ) : (
              <div className="space-y-4">
                {/* Regular Subjects Section */}
                {filteredRegular.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Core Theory Papers</h4>
                    <div className="space-y-2">
                      {filteredRegular.map(sub => {
                        const isChecked = !!allocations[sub._id.toString()];
                        const pendingTotal = getSubjectTotalPending(sub._id, null);
                        const isDisabled = pendingTotal === 0 && !isChecked;
                        return (
                          <div key={sub._id} className={`p-3 border rounded-md transition-all duration-300 bg-white ${isChecked ? 'border-teal-500 shadow-sm' : isDisabled ? 'border-slate-100 opacity-60 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <label className={`flex items-start ${isDisabled ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-800'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleToggleRegular(sub._id)}
                                className={`w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5 mr-3 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-semibold ${isDisabled ? 'text-slate-400' : 'text-slate-800'}`}>{sub.subCode}</p>
                                  {pendingTotal > 0 ? (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-md leading-none">
                                      {pendingTotal} pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-md leading-none">
                                      Subjects Assigned
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs mt-0.5 ${isDisabled ? 'text-slate-400/80' : 'text-slate-500'}`}>{sub.subName}</p>
                              </div>
                            </label>
                            
                            {/* Collapsible Panel for Allocation Settings */}
                            {isChecked && (
                              <SubjectAllocationPanel
                                allocation={allocations[sub._id.toString()]}
                                colleges={colleges}
                                assignments={assignments}
                                subjectId={sub._id}
                                onChange={(field, val) => updateAllocation(sub._id.toString(), field, val)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dynamic Group Pedagogy Subjects */}
                {selectedGroupCode && activeGroupSubjects.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">Group Pedagogy Subjects</h4>
                    <div className="space-y-2">
                      {activeGroupSubjects.map(name => {
                        const key = name.trim();
                        const isChecked = !!allocations[key];
                        const pendingTotal = getSubjectTotalPending(null, name);
                        const isDisabled = pendingTotal === 0 && !isChecked;
                        return (
                          <div key={name} className={`p-3 border rounded-md transition-all duration-300 bg-white ${isChecked ? 'border-indigo-500 shadow-sm' : isDisabled ? 'border-slate-100 opacity-60 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <label className={`flex items-start ${isDisabled ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-800'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleToggleGroupSubject(name)}
                                className={`w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 mr-3 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-semibold ${isDisabled ? 'text-slate-400' : 'text-slate-800'}`}>{name}</p>
                                  {pendingTotal > 0 ? (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-md leading-none">
                                      {pendingTotal} pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-md leading-none">
                                      Subjects Assigned
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs mt-0.5 ${isDisabled ? 'text-slate-400/80' : 'text-slate-500'}`}>Pedagogy subject in B.Ed Group {selectedGroupCode}</p>
                              </div>
                            </label>
                            
                            {/* Collapsible Panel for Allocation Settings */}
                            {isChecked && (
                              <SubjectAllocationPanel
                                allocation={allocations[key]}
                                colleges={colleges}
                                assignments={assignments}
                                groupSubjectName={name}
                                onChange={(field, val) => updateAllocation(key, field, val)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredRegular.length === 0 && (!selectedGroupCode || activeGroupSubjects.length === 0) && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No matching subjects found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

const Evaluators = () => {
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState(null);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  const fetchEvaluators = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/evaluators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort newly created evaluators on top
      const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setEvaluators(sorted);
    } catch (err) {
      console.error('Failed to load evaluators', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluators();
  }, []);

  const handleAssignSuccess = (successMsg) => {
    setAssignTarget(null);
    setMessage(successMsg);
    setTimeout(() => setMessage(''), 4000);
    fetchEvaluators();
  };

  // Search Filter
  const filteredEvaluators = evaluators.filter(ev => 
    ev.fullName.toLowerCase().includes(search.toLowerCase()) ||
    ev.regdNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalRows = filteredEvaluators.length;
  const pagedRows = filteredEvaluators.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manage Evaluators</h1>
          <p className="text-slate-500 mt-2">View active evaluator accounts and allocate specific core theory or group pedagogy subjects for evaluation.</p>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-green-50 rounded-md flex items-center space-x-3 text-green-700 border border-green-200">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{message}</span>
          <button onClick={() => setMessage('')} className="ml-auto text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
            <Shield className="h-5 w-5 text-teal-600" />
            <span>Active Evaluators</span>
            {!loading && <span className="text-xs text-slate-400 font-normal">({totalRows} total)</span>}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search evaluators..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              {search && (
                <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={fetchEvaluators}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-200 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mr-3" /> Loading evaluator data…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-700 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Allocated Subjects</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((evaluator, index) => {
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + index;
                  return (
                    <tr key={evaluator._id} className={`border-b border-slate-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{globalIdx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{evaluator.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{evaluator.regdNo}</td>
                      <td className="px-4 py-2.5">
                        {(evaluator.subjects?.length > 0 || evaluator.groupSubjects?.length > 0) ? (
                          <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                            {/* Core theory papers */}
                            {(evaluator.subjects || []).map(sub => (
                              <span key={sub._id} className="inline-flex px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-100 border border-teal-200 rounded-md" title={sub.subName}>
                                {sub.aliasName || sub.subCode}
                              </span>
                            ))}
                            {/* Group pedagogy subjects */}
                            {(evaluator.groupSubjects || []).map(name => (
                              <span key={name} className="inline-flex px-2 py-0.5 text-[10px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-200 rounded-md">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-xs">No subjects assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setAssignTarget(evaluator)}
                          className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-sm animate-pulse-subtle"
                        >
                          Assign Subjects
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredEvaluators.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                      <Shield className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      No active evaluators found. Create evaluators under the <strong>Master Data</strong> page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && evaluators.length > PAGE_SIZE && (
          <Pagination total={totalRows} page={currentPage} onPage={setCurrentPage} />
        )}

      </div>

      {/* Modal */}
      {assignTarget && (
        <AssignSubjectsModal
          evaluator={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={handleAssignSuccess}
        />
      )}

    </div>
  );
};

export default Evaluators;
