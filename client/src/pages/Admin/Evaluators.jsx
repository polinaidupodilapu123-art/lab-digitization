import { useState, useEffect } from 'react';
import { Shield, BookOpen, CheckCircle, RefreshCw, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';
import SearchableDropdown from '../../components/SearchableDropdown';

const API = 'http://localhost:5000/api/admin';
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

/* ── Subject Assignment Modal ── */
const AssignSubjectsModal = ({ evaluator, onClose, onSuccess }) => {
  const token = localStorage.getItem('token');
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedGroupSubs, setSelectedGroupSubs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Lock background scroll
    document.body.style.overflow = 'hidden';
    
    // Load subjects, groups, and assignments concurrently
    const loadData = async () => {
      try {
        const [subRes, groupsRes, assignRes] = await Promise.all([
          axios.get(`${API}/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/assignments`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const sortedSubs = (subRes.data || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setSubjects(sortedSubs);
        setGroups(groupsRes.data || []);
        setAssignments(assignRes.data || []);
        
        // Initialize checked items as empty (reset state) when opening the form
        setSelectedIds([]);
        setSelectedGroupSubs([]);
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
    setSelectedIds(prev => 
      prev.includes(idStr) ? prev.filter(item => item !== idStr) : [...prev, idStr]
    );
  };

  const handleToggleGroupSubject = (name) => {
    setSelectedGroupSubs(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API}/evaluators/${evaluator._id}/subjects`, {
        subjectIds: selectedIds,
        groupSubjects: selectedGroupSubs
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess('Subjects assigned successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject assignments.');
    } finally {
      setSaving(false);
    }
  };

  // Find pedagogy subjects of selected group
  const activeGroup = groups.find(g => g.groupCode === selectedGroupCode);
  const activeGroupSubjects = activeGroup ? [activeGroup.pedagogy1Name, activeGroup.pedagogy2Name].filter(Boolean) : [];

  // Filter regular subjects (excluding studentChoice 'C' or 'c')
  const filteredRegular = subjects
    .filter(sub => sub.studentChoice !== 'C' && sub.studentChoice !== 'c');

  // Dynamic submitted records counter for selected subjects in the top right
  const submittedCount = assignments.filter(a => {
    if (a.status === 'Pending') return false;
    
    const isRegularMatch = a.subjectId && selectedIds.includes((a.subjectId._id || a.subjectId).toString());
    const isGroupMatch = a.groupSubjectName && selectedGroupSubs.includes(a.groupSubjectName);
    
    return isRegularMatch || isGroupMatch;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 flex-shrink-0 text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
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
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
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
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 space-y-4 bg-slate-50/50 max-h-[45vh] elegant-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading subjects…
              </div>
            ) : (
              <>
                {/* Regular Subjects Section */}
                {filteredRegular.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Core Theory Papers</h4>
                    <div className="space-y-1.5">
                      {filteredRegular.map(sub => {
                        const isChecked = selectedIds.includes(sub._id.toString());
                        return (
                          <label key={sub._id} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? 'border-teal-500 bg-teal-50/70' : 'border-transparent hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRegular(sub._id)}
                              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5 mr-3"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{sub.subCode}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{sub.subName}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dynamic Group Pedagogy Subjects */}
                {selectedGroupCode && activeGroupSubjects.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">Group Pedagogy Subjects</h4>
                    <div className="space-y-1.5">
                      {activeGroupSubjects.map(name => {
                        const isChecked = selectedGroupSubs.includes(name);
                        return (
                          <label key={name} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? 'border-indigo-500 bg-indigo-50/70' : 'border-transparent hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleGroupSubject(name)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 mr-3"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Pedagogy subject in B.Ed Group {selectedGroupCode}</p>
                            </div>
                          </label>
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
              </>
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
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center space-x-3 text-green-700 border border-green-200">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{message}</span>
          <button onClick={() => setMessage('')} className="ml-auto text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
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
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Allocated Subjects</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((evaluator, index) => {
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + index;
                  return (
                    <tr key={evaluator._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{globalIdx + 1}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{evaluator.fullName}</td>
                      <td className="px-6 py-4 text-slate-600">{evaluator.regdNo}</td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setAssignTarget(evaluator)}
                          className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm animate-pulse-subtle"
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
