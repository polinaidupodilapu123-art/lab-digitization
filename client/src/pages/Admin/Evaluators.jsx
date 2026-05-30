import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Users, BookOpen, CheckCircle, Search, ChevronDown, Check, AlertCircle, Filter, Edit, Clock, X, Square, CheckSquare } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import SearchableDropdown from '../../components/SearchableDropdown';

const API = `${API_BASE_URL}/api/admin`;

export default function Evaluators() {
  const token = localStorage.getItem('token');
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [submittedSubjects, setSubmittedSubjects] = useState({ subjectIds: [], groupSubjectNames: [], fullyAllocatedSubjectIds: [], fullyAllocatedGroupNames: [] });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selection state
  const [allocationMode, setAllocationMode] = useState('Regular');
  const [selectedSubjects, setSelectedSubjects] = useState([]); // Array of { id, name, type, groupCode }
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Allocation form state
  const [allocationEvaluatorId, setAllocationEvaluatorId] = useState('');
  const [splitMethod, setSplitMethod] = useState('ALL');
  const [allocationCount, setAllocationCount] = useState('');
  const [allocationColleges, setAllocationColleges] = useState([]);
  const [rollStart, setRollStart] = useState('');
  const [rollEnd, setRollEnd] = useState('');
  const [valuationDeadline, setValuationDeadline] = useState('');
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [subRes, groupRes, evRes, colRes] = await Promise.all([
          axios.get(`${API}/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/evaluators`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/colleges`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setSubjects(subRes.data || []);
        setGroups(groupRes.data || []);
        setEvaluators(evRes.data || []);
        setColleges(colRes.data || []);
      } catch (err) {
        setError('Failed to load basic data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    const fetchSubmitted = async () => {
      try {
        const submRes = await axios.get(`${API}/subjects-with-submissions?mode=${allocationMode}`, { headers: { Authorization: `Bearer ${token}` } });
        setSubmittedSubjects(submRes.data || { subjectIds: [], groupSubjectNames: [], fullyAllocatedSubjectIds: [], fullyAllocatedGroupNames: [] });
      } catch (err) {
        console.error('Failed to load submitted subjects', err);
      }
    };
    fetchSubmitted();
    setSelectedSubjects([]);
    setStats(null);
  }, [allocationMode, token]);

  const uniqueSemesters = useMemo(() => [...new Set(subjects.map(s => s.semester).filter(Boolean))].sort(), [subjects]);
  const regularSubjects = useMemo(() => {
    let list = subjects.filter(s => s.studentChoice !== 'C' && s.studentChoice !== 'c');
    if (selectedSemester) {
      list = list.filter(s => s.semester === selectedSemester);
    }
    return list;
  }, [subjects, selectedSemester]);
  const activeGroup = useMemo(() => groups.find(g => g.groupCode === selectedGroupCode), [groups, selectedGroupCode]);
  const activeGroupSubjects = activeGroup?.subjects || [];

  const combinedSubjectList = useMemo(() => {
    let list = regularSubjects.map(s => ({
      id: s._id,
      name: `${s.subCode ? s.subCode + ' - ' : ''}${s.subName}`,
      type: 'CORE',
      isFullyAllocated: submittedSubjects.fullyAllocatedSubjectIds?.includes(s._id)
    }));

    if (activeGroupSubjects.length > 0) {
      const groupSubjList = activeGroupSubjects.map(name => ({
        id: name,
        name: name,
        type: 'GROUP',
        groupCode: activeGroup.groupCode,
        isFullyAllocated: submittedSubjects.fullyAllocatedGroupNames?.includes(name)
      }));
      list = [...list, ...groupSubjList];
    }
    
    if (subjectSearch) {
      list = list.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()));
    }
    
    // Filter out subjects that have no submitted records
    list = list.filter(s => {
      if (s.type === 'CORE') return submittedSubjects.subjectIds.includes(s.id);
      return submittedSubjects.groupSubjectNames.includes(s.name);
    });

    return list;
  }, [regularSubjects, activeGroupSubjects, subjectSearch, activeGroup, submittedSubjects]);

  const isSubjectSelected = (sub) => {
    return selectedSubjects.some(s => s.id === sub.id && s.type === sub.type);
  };

  const toggleSubject = (sub) => {
    if (sub.isFullyAllocated) return;
    setSelectedSubjects(prev => {
      if (isSubjectSelected(sub)) return prev.filter(s => !(s.id === sub.id && s.type === sub.type));
      return [...prev, sub];
    });
  };

  const fetchStats = async () => {
    if (selectedSubjects.length === 0) {
      setStats(null);
      return;
    }

    setStatsLoading(true);
    setError('');
    setSuccess('');
    try {
      const parsedSubjects = selectedSubjects.map(s => s.type === 'CORE' ? { subjectId: s.id } : { groupSubjectName: s.name });
      const res = await axios.get(`${API}/subject-allocation-stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { subjects: JSON.stringify(parsedSubjects), mode: allocationMode }
      });
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedSubjects]);

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!allocationEvaluatorId) return setError('Please select an evaluator.');
    if (splitMethod === 'COUNT' && (!allocationCount || allocationCount <= 0)) return setError('Please enter a valid count.');
    if (splitMethod === 'COLLEGE' && allocationColleges.length === 0) return setError('Please select at least one college.');

    setAllocating(true);
    setError('');
    setSuccess('');
    
    try {
      const payload = {
        allocations: [{
          subjectId: selectedSubjects[0].type === 'CORE' ? selectedSubjects[0].id : undefined,
          groupSubjectName: selectedSubjects[0].type === 'GROUP' ? selectedSubjects[0].name : undefined,
          splitMethod,
          count: splitMethod === 'COUNT' ? Number(allocationCount) : undefined,
          collegeIds: splitMethod === 'COLLEGE' ? allocationColleges : undefined,
          rollStart: splitMethod === 'RANGE' ? rollStart : undefined,
          rollEnd: splitMethod === 'RANGE' ? rollEnd : undefined,
          valuationDeadline: valuationDeadline || undefined,
        }],
        evaluatorId: allocationEvaluatorId,
        mode: allocationMode
      };
      
      const res = await axios.post(`${API}/allocate-subject-bulk`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(res.data.message);
      
      // Reset form fields
      setSplitMethod('ALL');
      setAllocationCount('');
      setAllocationColleges([]);
      setRollStart('');
      setRollEnd('');
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate assignments.');
    } finally {
      setAllocating(false);
    }
  };

  const toggleCollege = (id) => {
    setAllocationColleges(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading allocation data...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <BookOpen className="h-6 w-6 text-teal-50" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Subject Allocation</h1>
          </div>
          <p className="text-teal-100/90 text-sm max-w-2xl leading-relaxed mt-3">
            Select a subject to view its total generated assignments. Allocate unassigned records to evaluators by specific counts, colleges, or roll number ranges to prevent duplicate assignments and balance workloads.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium text-sm">{success}</span>
        </div>
      )}

      {/* Main Selection Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-teal-600" />
          1. Select Subject(s) to Allocate
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Allocation Mode</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              value={allocationMode}
              onChange={(e) => setAllocationMode(e.target.value)}
            >
              <option value="Regular">Regular Subjects</option>
              <option value="Supply">Backlog / Supply</option>
            </select>
          </div>
          <div className="w-full md:w-1/4 z-50">
            <SearchableDropdown
              label="Filter by Semester"
              placeholder="-- All Semesters --"
              value={selectedSemester}
              onChange={(val) => setSelectedSemester(val || '')}
              options={uniqueSemesters.map(sem => ({
                value: sem,
                label: `Semester ${sem}`
              }))}
            />
          </div>
          <div className="w-full md:w-1/4 z-50">
            <SearchableDropdown
              label="Filter by Group"
              placeholder="-- Search Group --"
              value={selectedGroupCode}
              onChange={(val) => setSelectedGroupCode(val || '')}
              options={groups.map(g => ({
                value: g.groupCode,
                label: `${g.groupCode} - ${g.groupName}`
              }))}
            />
          </div>
          <div className="w-full md:w-1/4 relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Search Subject</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. DATA STRUCTURES"
                value={subjectSearch}
                onChange={e => setSubjectSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">{combinedSubjectList.length} Subjects Found</span>
            <span className="text-sm text-teal-600 font-medium">{selectedSubjects.length} Selected</span>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {combinedSubjectList.length === 0 ? (
              <div className="col-span-full p-4 text-center text-slate-500 text-sm">No subjects match your search.</div>
            ) : (
              combinedSubjectList.map(sub => (
                <div 
                  key={sub.type + '-' + sub.id}
                  onClick={() => toggleSubject(sub)}
                  className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                    sub.isFullyAllocated 
                      ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60' 
                      : isSubjectSelected(sub) 
                        ? 'bg-teal-50 border-teal-200 cursor-pointer' 
                        : 'bg-white border-slate-200 hover:border-teal-300 cursor-pointer'
                  }`}
                >
                  <div className={`flex-shrink-0 ${sub.isFullyAllocated || isSubjectSelected(sub) ? 'text-teal-600' : 'text-slate-300'}`}>
                    {(sub.isFullyAllocated || isSubjectSelected(sub)) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{sub.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500">{sub.type === 'CORE' ? 'Core Theory' : `Pedagogy (${sub.groupCode})`}</p>
                      {sub.isFullyAllocated && <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Completed</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stats and Allocation Split View */}
      {stats && (
        <div className="relative">
          {statsLoading && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          )}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn ${statsLoading ? 'pointer-events-none' : ''}`}>
          
          {/* Left Column: Stats & Current Evaluators */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-teal-600" />
                  Subject Status
                </h3>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between border border-slate-100">
                  <div className="text-sm font-medium text-slate-600">Total Records</div>
                  <div className="text-xl font-bold text-slate-800">{stats.total}</div>
                </div>
                
                <div className="bg-teal-50 rounded-lg p-4 flex items-center justify-between border border-teal-100">
                  <div className="text-sm font-medium text-teal-700">Allocated</div>
                  <div className="text-xl font-bold text-teal-800">{stats.allocated}</div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 flex items-center justify-between border border-orange-100">
                  <div className="text-sm font-medium text-orange-700 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> Unallocated (Pending)
                  </div>
                  <div className="text-xl font-bold text-orange-800">{stats.unallocated}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600" />
                  Current Evaluators
                </h3>
              </div>
              <div className="p-0">
                {stats.evaluators.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No evaluators assigned to this subject yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {stats.evaluators.map(ev => (
                      <li key={ev._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{ev.fullName}</p>
                          <p className="text-xs text-slate-500">{ev.regdNo}</p>
                        </div>
                        <div className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-full">
                          {ev.count}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Allocation Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-teal-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                <Edit className="h-5 w-5 text-teal-600" />
                <h3 className="font-semibold text-slate-800 text-lg">Allocate Pending Records</h3>
              </div>
              
              {stats.unallocated === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-teal-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-slate-800">All Done!</h4>
                  <p className="text-slate-500 mt-1">Every assignment for this subject has been allocated to an evaluator.</p>
                </div>
              ) : (
                <form onSubmit={handleAllocate} className="p-6 space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 z-40">
                      <SearchableDropdown
                        label={
                          <span>
                            Select Evaluator <span className="text-red-500">*</span>
                          </span>
                        }
                        placeholder="-- Choose an Evaluator --"
                        value={allocationEvaluatorId}
                        onChange={val => setAllocationEvaluatorId(val || '')}
                        options={evaluators.map(ev => ({
                          value: ev._id,
                          label: `${ev.fullName} (${ev.regdNo})`
                        }))}
                      />
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valuation Date <span className="text-slate-400 font-normal text-xs ml-1">(Optional)</span></label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        value={valuationDeadline}
                        onChange={e => setValuationDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Allocation Strategy <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['ALL', 'COUNT', 'COLLEGE', 'RANGE'].map(method => (
                        <label 
                          key={method} 
                          className={`
                            border rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center
                            ${splitMethod === method ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'}
                          `}
                        >
                          <input 
                            type="radio" 
                            name="splitMethod" 
                            value={method} 
                            checked={splitMethod === method}
                            onChange={(e) => setSplitMethod(e.target.value)}
                            className="sr-only"
                          />
                          <span className="text-sm font-bold">{method === 'ALL' ? 'All Remaining' : method === 'COUNT' ? 'By Count' : method === 'COLLEGE' ? 'By College' : 'By Roll Range'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Fields based on Split Method */}
                  <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
                    {splitMethod === 'ALL' && (
                      <p className="text-sm text-slate-600 text-center">
                        This will allocate all <strong className="text-slate-800">{stats.unallocated}</strong> remaining assignments to the selected evaluator.
                      </p>
                    )}

                    {splitMethod === 'COUNT' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Records to Assign</label>
                        <input
                          type="number"
                          className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          value={allocationCount}
                          onChange={e => setAllocationCount(e.target.value)}
                          placeholder={`Max: ${stats.unallocated}`}
                          max={stats.unallocated}
                          min="1"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          The system will randomly select exactly {allocationCount || 'X'} unassigned records.
                        </p>
                      </div>
                    )}

                    {splitMethod === 'COLLEGE' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Colleges</label>
                        <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                          {colleges.map(c => (
                            <label key={c._id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={allocationColleges.includes(c._id)}
                                onChange={() => toggleCollege(c._id)}
                                className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                              />
                              <span className="text-sm text-slate-700 font-medium">
                                {c.collegeCode} - {c.collegeName}
                                {stats?.collegeCounts && stats.collegeCounts[c._id] > 0 && (
                                  <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {stats.collegeCounts[c._id]} pending
                                  </span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {splitMethod === 'RANGE' && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-slate-700 mb-2">From Roll No</label>
                          <input
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            value={rollStart}
                            onChange={e => setRollStart(e.target.value)}
                            placeholder="e.g. 255001"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-slate-700 mb-2">To Roll No</label>
                          <input
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            value={rollEnd}
                            onChange={e => setRollEnd(e.target.value)}
                            placeholder="e.g. 255099"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Valuation Date moved up */}

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={allocating || !allocationEvaluatorId}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {allocating ? 'Allocating...' : 'Allocate Records'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}
