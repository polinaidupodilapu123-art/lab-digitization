import { useState, useEffect } from 'react';
import { Users, BookOpen, CheckCircle, Filter, Download } from 'lucide-react';
import axios from 'axios';
import SearchableDropdown from '../../components/SearchableDropdown';
import { downloadAssignmentScoresXlsx } from '../../utils/exportUtils';
import { API_BASE_URL } from '../../utils/config';

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

const Assignments = () => {
  const [filters, setFilters] = useState({ colleges: [], courses: [], semesters: [] });
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('generate');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [pagesRequired, setPagesRequired] = useState(10);
  const [deadline, setDeadline] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [mode, setMode] = useState('Regular');

  // New state for Backlog feature
  const [backlogCandidates, setBacklogCandidates] = useState([]);
  const [selectedBacklogCandidates, setSelectedBacklogCandidates] = useState([]);

  // Fetch backlog candidates when Backlog tab is active
  useEffect(() => {
    if (activeTab === 'backlog') {
      const fetchBacklog = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/admin/backlog-candidates`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setBacklogCandidates(res.data);
        } catch (err) {
          console.error('Failed to load backlog candidates');
        }
      };
      fetchBacklog();
    }
  }, [activeTab]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Sort so newly generated assignments are on top
      const sorted = res.data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAssignments(sorted);
    } catch (err) {
      console.error('Failed to load assignments');
    }
  };

  const handleExportAssignments = () => {
    try {
      const rows = assignments.map(a => ({
        collegeName: a.studentId?.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        course: a.studentId?.courseId?.courseName || "Programme",
        academicYear: a.academicYear || "",
        semester: a.studentId?.currentSemester || a.subjectId?.semester || "",
        mode: a.mode || "Regular",
        registeredNumber: a.studentId?.regdNo || "",
        fullName: a.studentId?.fullName || "",
        subjectTitle: a.groupSubjectName || a.subjectId?.subName || "",
        maxMarks: a.maxMarks || a.subjectId?.maxMarks || 100,
        marksAwarded: a.score,
        remarks: a.feedback || ""
      }));

      downloadAssignmentScoresXlsx(rows, "generated-assignments-report");
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export assignments. Please try again.");
    }
  };

  // 1. Fetch available filters on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/assignment-filters`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setFilters(res.data);
      } catch (err) {
        console.error('Failed to load filters');
      }
    };
    fetchFilters();
    fetchAssignments();
  }, []);

  // 2. Fetch students and subjects when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCollege) params.append('collegeCode', selectedCollege);
        if (selectedCourse) params.append('courseCode', selectedCourse);
        if (selectedSemester) params.append('semester', selectedSemester);
        if (selectedGroup) params.append('groupCode', selectedGroup);

        const res = await axios.get(`${API_BASE_URL}/api/admin/assignment-data?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const rawSubs = res.data.subjects || [];
        const sortedSubs = [...rawSubs].sort((a, b) => {
          const aIsGroup = !!a.isGroupSubject;
          const bIsGroup = !!b.isGroupSubject;
          
          if (aIsGroup && !bIsGroup) return 1;
          if (!aIsGroup && bIsGroup) return -1;
          if (!aIsGroup && !bIsGroup) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          }
          return (a.subName || '').localeCompare(b.subName || '');
        });

        setStudents(res.data.students || []);
        setSubjects(sortedSubs);
        
        // Reset selections when filters change
        setSelectedStudents([]);
        setSelectedSubjects([]);
      } catch (err) {
        console.error('Failed to load data');
      }
    };
    fetchData();
  }, [selectedCollege, selectedCourse, selectedSemester, selectedGroup]);

  const toggleStudent = (id) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const toggleAllSubjects = () => {
    if (subjects.length === 0) return;
    if (selectedSubjects.length === subjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(subjects.map(s => s._id));
    }
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === students.length && students.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s._id));
    }
  };

  const handleAssign = async () => {
    if (selectedStudents.length === 0 || selectedSubjects.length === 0) {
      return setError('Please select at least one student and one subject.');
    }
    if (!academicYear || !deadline || !pagesRequired) {
      return setError('Please fill in Academic Year, Deadline, and Required Pages.');
    }
    
    setMessage('');
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/admin/assign-subjects`, {
        studentIds: selectedStudents,
        subjectIds: selectedSubjects,
        pagesRequired,
        academicYear,
        deadline,
        mode
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setMessage(`Successfully assigned ${selectedSubjects.length} subject(s) to ${selectedStudents.length} student(s).`);
      setTimeout(() => setMessage(''), 4000);
      setSelectedStudents([]);
      setSelectedSubjects([]);
      fetchAssignments();
      setActiveTab('list');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign subjects.');
    }
  };

  const PAGE_SIZE = 10;
  const pagedAssignments = assignments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="px-4 py-6 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manage Assignments</h1>
        <p className="text-slate-500 mt-2 text-sm">Generate subject assignments for students, handle backlogs, and view all records.</p>
      </div>

      <div className="flex overflow-x-auto elegant-scrollbar border-b border-slate-200 mb-6 whitespace-nowrap">
        <button
          onClick={() => { setActiveTab('generate'); setCurrentPage(1); setError(''); setMessage(''); }}
          className={`px-5 py-2.5 font-medium text-sm transition-all border-b-2 cursor-pointer rounded-t-md ${
            activeTab === 'generate'
              ? 'border-teal-600 text-teal-700 font-semibold bg-teal-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Generate Assignments
        </button>
        <button
          onClick={() => { setActiveTab('backlog'); setCurrentPage(1); setError(''); setMessage(''); }}
          className={`px-5 py-2.5 font-medium text-sm transition-all border-b-2 cursor-pointer rounded-t-md flex items-center gap-1.5 ${
            activeTab === 'backlog'
              ? 'border-teal-600 text-teal-700 font-semibold bg-teal-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Backlog
          {backlogCandidates.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-full">
              {backlogCandidates.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('list'); setCurrentPage(1); setError(''); setMessage(''); }}
          className={`px-5 py-2.5 font-medium text-sm transition-all border-b-2 cursor-pointer rounded-t-md ${
            activeTab === 'list'
              ? 'border-teal-600 text-teal-700 font-semibold bg-teal-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Generated Assignments ({assignments.length})
        </button>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-green-50 rounded-md flex items-center space-x-3 text-green-700 border border-green-200 shadow-sm animate-fadeIn">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium text-sm">{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-md text-red-600 font-medium text-sm border border-red-200 shadow-sm animate-fadeIn">
          {error}
        </div>
      )}

      {/* --- GENERATE TAB --- */}
      {activeTab === 'generate' && (
        <>
          {/* Filters Card */}
          <div className="bg-white p-5 rounded-md shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-4 items-end animate-fadeIn">
            <div className="flex-1 min-w-[200px]">
              <SearchableDropdown
                label="College"
                placeholder="-- Select College --"
                options={filters.colleges.map(c => ({ value: c.collegeCode, label: `${c.collegeCode} - ${c.collegeName}` }))}
                value={selectedCollege}
                onChange={(val) => {
                  setSelectedCollege(val);
                  setSelectedCourse('');
                  setSelectedSemester('');
                  setSelectedGroup('');
                }}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchableDropdown
                label="Course"
                placeholder="-- Select Course --"
                options={filters.courses.map(c => ({ value: c.courseCode, label: `${c.courseCode} - ${c.courseName}` }))}
                value={selectedCourse}
                onChange={(val) => {
                  setSelectedCourse(val);
                  setSelectedSemester('');
                  setSelectedGroup('');
                }}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchableDropdown
                label="Semester"
                placeholder="-- Select Semester --"
                options={filters.semesters?.map(sem => ({ value: sem, label: sem })) || []}
                value={selectedSemester}
                onChange={(val) => {
                  setSelectedSemester(val);
                  setSelectedGroup('');
                }}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchableDropdown
                label="Group"
                placeholder="-- All Groups --"
                options={filters.groups?.map(g => ({ value: g.groupCode, label: `${g.groupCode} - ${g.groupName}` })) || []}
                value={selectedGroup}
                onChange={setSelectedGroup}
              />
            </div>
          </div>

          {/* Grid Layout for Students and Subjects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            {/* Students Panel */}
            <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-teal-600" />
                  Select Students
                </h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSelectAllStudents}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    {selectedStudents.length === students.length && students.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                    {selectedStudents.length} Selected
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto elegant-scrollbar p-4 space-y-2">
                {students.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">Select College and Course to view students.</p>
                ) : (
                  students.map(student => (
                    <label key={student._id} className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${selectedStudents.includes(student._id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudent(student._id)}
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {student.regdNo} • Grp: {student.groupId?.groupCode || 'N/A'} 
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Subjects Panel */}
            <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-teal-600" />
                  Select Subjects
                </h2>
                <div className="flex items-center gap-4">
                  {subjects.length > 0 && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mr-2"
                        checked={selectedSubjects.length === subjects.length}
                        onChange={toggleAllSubjects}
                      />
                      <span className="text-sm font-medium text-slate-700">Select All</span>
                    </label>
                  )}
                  <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                    {selectedSubjects.length} Selected
                  </span>
                </div>
              </div>
              
              <div className="p-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic Year <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2023-2024"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deadline <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Req. Pages <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    value={pagesRequired}
                    onChange={(e) => setPagesRequired(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white" 
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mode</label>
                  <select 
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Supply">Supply</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto elegant-scrollbar p-4 space-y-2">
                {subjects.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">Select a Semester to view subjects.</p>
                ) : (
                  subjects.map(subject => {
                    const isAssigned = selectedStudents.length > 0 && assignments.some(a => {
                      const aStudentId = a.studentId?._id || a.studentId;
                      const aSubjectId = a.subjectId?._id || a.subjectId;
                      return aStudentId && aSubjectId && 
                             selectedStudents.includes(aStudentId.toString()) && 
                             aSubjectId.toString() === subject._id.toString();
                    });

                    return (
                      <label key={subject._id} className={`flex items-center p-3 border rounded-md transition-colors ${isAssigned ? 'border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-65' : selectedSubjects.includes(subject._id) ? 'border-teal-500 bg-teal-50 cursor-pointer' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={isAssigned}
                          className={`w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 ${isAssigned ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          checked={!isAssigned && selectedSubjects.includes(subject._id)}
                          onChange={() => toggleSubject(subject._id)}
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${isAssigned ? 'text-slate-400' : 'text-slate-900'}`}>{subject.subName}</p>
                            {isAssigned && (
                              <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-md leading-none">
                                Subject Assigned
                              </span>
                            )}
                          </div>
                          <p className={`text-xs flex items-center ${isAssigned ? 'text-slate-400/80' : 'text-slate-500'}`}>
                            {subject.subCode} • Semester: {subject.semester || 'N/A'}
                            {(subject.isGroupSubject && selectedGroup) && (
                              <span className="ml-2 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Group Subject</span>
                            )}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={handleAssign}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-md transition-colors cursor-pointer text-sm"
                >
                  Generate Assignments
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- BACKLOG TAB --- */}
      {activeTab === 'backlog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
          {/* Backlog Candidates Panel */}
          <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-teal-600" />
                Backlog Candidates
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedBacklogCandidates([])} 
                  className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
                <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                  {selectedBacklogCandidates.length} Selected
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto elegant-scrollbar p-4 space-y-2">
              {backlogCandidates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">No backlog candidates found.</p>
              ) : (
                backlogCandidates.map((cand, idx) => (
                  <label 
                    key={cand.studentId?._id + '-' + cand.subjectId?._id + '-' + idx} 
                    className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${selectedBacklogCandidates.includes(cand) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                      checked={selectedBacklogCandidates.includes(cand)}
                      onChange={() => {
                        const exists = selectedBacklogCandidates.includes(cand);
                        if (exists) {
                          setSelectedBacklogCandidates(selectedBacklogCandidates.filter(c => c !== cand));
                        } else {
                          setSelectedBacklogCandidates([...selectedBacklogCandidates, cand]);
                        }
                      }}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold text-slate-900">
                          {cand.studentId?.fullName || 'Student'}
                        </p>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          cand.reason === 'Failed' 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {cand.reason} {cand.score !== null ? `(${cand.score} Marks)` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Regd No: <span className="font-medium text-slate-700">{cand.studentId?.regdNo || 'N/A'}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Subject: <span className="font-medium text-slate-700">{cand.subjectId?.subName || 'N/A'}</span> ({cand.subjectId?.subCode})
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Backlog Settings & Assignment Panel */}
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 flex flex-col h-[600px] justify-between">
            <div>
              <div className="border-b border-slate-200 pb-4 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-teal-600" />
                  Backlog Assignment Details
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Specify details to generate supply assignments for the selected candidates.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic Year <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2023-2024"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deadline <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Required Pages <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    value={pagesRequired}
                    onChange={(e) => setPagesRequired(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white" 
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mode</label>
                  <select 
                    disabled 
                    value="Supply"
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 outline-none transition-all text-slate-500 bg-slate-50 cursor-not-allowed"
                  >
                    <option value="Supply">Supply (Backlog)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                disabled={selectedBacklogCandidates.length === 0}
                onClick={async () => {
                  if (!academicYear || !deadline || !pagesRequired) {
                    setError('Please fill in Academic Year, Deadline, and Required Pages.');
                    return;
                  }
                  setError('');
                  setMessage('');
                  const payload = {
                    candidates: selectedBacklogCandidates.map(c => ({ 
                      studentId: c.studentId._id, 
                      subjectId: c.subjectId._id 
                    })),
                    pagesRequired,
                    academicYear,
                    deadline
                  };
                  try {
                    await axios.post(`${API_BASE_URL}/api/admin/bulk-assign-backlogs`, payload, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    setMessage(`Successfully assigned supply assignments to ${selectedBacklogCandidates.length} backlog candidate(s).`);
                    setTimeout(() => setMessage(''), 4000);
                    setSelectedBacklogCandidates([]);
                    fetchAssignments();
                    setActiveTab('list');
                  } catch (err) {
                    setError(err.response?.data?.message || 'Failed to assign backlogs');
                  }
                }}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors cursor-pointer shadow-sm text-sm"
              >
                Assign supply assignments for ({selectedBacklogCandidates.length}) Selected Candidates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIST TAB --- */}
      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-teal-600" />
              Generated Assignments ({assignments.length})
            </h2>
            {assignments.length > 0 && (
              <button
                onClick={handleExportAssignments}
                className="flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </button>
            )}
          </div>
          <div className="overflow-x-auto elegant-scrollbar">
            <table className="w-full text-sm animate-fadeIn">
              <thead>
                <tr className="bg-teal-700 text-white text-sm font-semibold">
                  <th className="px-4 py-3 text-left whitespace-nowrap">Subject</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Mode</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Student</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Pages</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Deadline</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Assigned Evaluator</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Evaluated by</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Score</th>
                </tr>
              </thead>
              <tbody>
                {pagedAssignments.map((assignment) => (
                  <tr key={assignment._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                      <p className="font-medium text-slate-900">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
                      <p className="text-xs text-slate-500">{assignment.subjectId?.subCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold
                        ${assignment.mode === 'Supply' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'}
                      `}>
                        {assignment.mode || 'Regular'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium text-slate-900">{assignment.studentId?.fullName}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{assignment.studentId?.regdNo}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{assignment.pagesRequired}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{new Date(assignment.deadline).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{assignment.evaluatorId?.fullName || <span className="text-slate-400 italic text-xs">Unassigned</span>}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{assignment.status === 'Evaluated' ? assignment.evaluatorId?.fullName : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${assignment.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 
                          assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}
                      `}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right font-semibold text-slate-900">{assignment.score !== undefined && assignment.score !== null ? assignment.score : '—'}</td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-400">
                      No assignments have been generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={assignments.length} page={currentPage} onPage={setCurrentPage} />
        </div>
      )}
    </div>
  );
};

export default Assignments;
