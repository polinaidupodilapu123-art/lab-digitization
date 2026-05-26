import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileCheck, BookOpen, AlertCircle, FileText, Search } from 'lucide-react';
import axios from 'axios';
import SearchableDropdown from '../../components/SearchableDropdown';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState(''); // Active Subject _id
  const [submissions, setSubmissions] = useState([]);
  const [marks, setMarks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Search/Filter dropdown states
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Assigned Core & Pedagogy Subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/evaluator/subjects`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const sorted = (res.data || []).sort((a, b) => {
          const aIsGroup = !!a.isGroupSubject;
          const bIsGroup = !!b.isGroupSubject;
          if (aIsGroup && !bIsGroup) return 1;
          if (!aIsGroup && bIsGroup) return -1;
          if (!aIsGroup && !bIsGroup) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          }
          return (a.subName || '').localeCompare(b.subName || '');
        });
        setSubjects(sorted);
        if (sorted.length > 0) {
          setActiveTab(sorted[0]._id);
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch Submissions
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/evaluator/records`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Sort newly submitted/created records on top
        const sorted = res.data.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
        setSubmissions(sorted);
      } catch (err) {
        console.error('Failed to load records', err);
      } finally {
        setLoadingRecords(false);
      }
    };
    fetchRecords();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMarkChange = (id, field, value) => {
    setMarks(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: value } 
    }));
  };

  const handleSubmitMarks = async (id) => {
    const data = marks[id];
    if (!data || !data.score) return;
    
    const submission = submissions.find(s => s._id === id);
    const maxMarks = submission ? (submission.maxMarks ?? submission.subjectId?.maxMarks ?? 100) : 100;

    if (Number(data.score) > maxMarks || Number(data.score) < 0) {
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/api/evaluator/records/${id}/grade`, {
        score: Number(data.score),
        feedback: data.remarks || ''
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSubmissions(prev => prev.map(sub => 
        sub._id === id ? { ...sub, status: 'Evaluated', score: Number(data.score), feedback: data.remarks } : sub
      ));
      alert('Marks saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save marks');
    }
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCollege, selectedCourse, selectedSubject, selectedStatus, searchTerm]);

  // Extract unique colleges from submissions
  const collegeOptions = useMemo(() => {
    const map = new Map();
    submissions.forEach(sub => {
      const college = sub.studentId?.collegeId;
      if (college && college.collegeCode) {
        map.set(college.collegeCode, `${college.collegeCode} - ${college.collegeName}`);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [submissions]);

  // Extract unique courses from submissions
  const courseOptions = useMemo(() => {
    const map = new Map();
    submissions.forEach(sub => {
      const course = sub.studentId?.courseId;
      if (course && course.courseCode) {
        map.set(course.courseCode, `${course.courseCode} - ${course.courseName}`);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [submissions]);

  // Extract and sort unique subjects in the exact same order as the subjects table in the Master Data page
  const subjectOptions = useMemo(() => {
    // Sort subjects so core theory papers are on top (by createdAt desc) and pedagogy group subjects are at the bottom
    const sortedSubjects = [...subjects].sort((a, b) => {
      if (a.isGroupSubject && !b.isGroupSubject) return 1;
      if (!a.isGroupSubject && b.isGroupSubject) return -1;
      if (!a.isGroupSubject && !b.isGroupSubject) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return (a.subName || '').localeCompare(b.subName || '');
    });

    return sortedSubjects.map(sub => {
      const subCode = sub.isGroupSubject ? 'PEDAGOGY' : sub.subCode;
      return {
        value: sub.subName,
        label: `${subCode} - ${sub.subName}`
      };
    });
  }, [subjects]);

  // Filter submissions dynamically based on selected dropdown values, status, and search query
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const college = sub.studentId?.collegeId;
      const course = sub.studentId?.courseId;
      const subName = sub.groupSubjectName || sub.subjectId?.subName;

      // 1. Search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const nameMatch = (sub.studentId?.fullName || '').toLowerCase().includes(query);
        const regdMatch = (sub.studentId?.regdNo || '').toLowerCase().includes(query);
        const collMatch = (college?.collegeCode || '').toLowerCase().includes(query) || (college?.collegeName || '').toLowerCase().includes(query);
        const courMatch = (course?.courseCode || '').toLowerCase().includes(query) || (course?.courseName || '').toLowerCase().includes(query);
        const subMatch = (subName || '').toLowerCase().includes(query);
        if (!nameMatch && !regdMatch && !collMatch && !courMatch && !subMatch) {
          return false;
        }
      }

      // 2. Status filter
      if (selectedStatus && sub.status !== selectedStatus) {
        return false;
      }

      // 3. Dropdown filters
      if (selectedCollege && (!college || college.collegeCode !== selectedCollege)) {
        return false;
      }
      if (selectedCourse && (!course || course.courseCode !== selectedCourse)) {
        return false;
      }
      if (selectedSubject && subName !== selectedSubject) {
        return false;
      }
      return true;
    });
  }, [submissions, selectedCollege, selectedCourse, selectedSubject, selectedStatus, searchTerm]);

  const PAGE_SIZE = 10;
  const pagedSubmissions = filteredSubmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-emerald-600 text-white p-2 rounded-md mr-3">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Evaluator Portal</h1>
                <p className="text-sm text-slate-500 font-medium">{user.fullName}</p>
              </div>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assigned Records</h2>
            <p className="text-slate-500 mt-1">Review student lab records and submit marks for your assigned core or group subjects.</p>
          </div>
          
          {subjects.length > 0 && (
            <div className="flex space-x-4 text-sm font-medium">
              <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200">
                <span className="text-slate-500 mr-2">Total Submissions:</span>
                <span className="text-teal-700 font-semibold">{filteredSubmissions.length}</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200">
                <span className="text-slate-500 mr-2">Pending:</span>
                <span className="text-orange-600 font-semibold">{filteredSubmissions.filter(s => s.status === 'Submitted').length}</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200">
                <span className="text-slate-500 mr-2">Evaluated:</span>
                <span className="text-emerald-600 font-semibold">{filteredSubmissions.filter(s => s.status === 'Evaluated').length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Assigned Subjects Status Check */}
        {!loadingSubjects && subjects.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3.5 rounded-md mb-6 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <span className="font-medium">No core or pedagogy subjects assigned yet. Please contact your system administrator.</span>
          </div>
        )}

        {/* Filters Panel */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-1.5">
              <FileCheck className="h-4.5 w-4.5 text-teal-600" />
              Filter Student Records
            </h3>

            {/* Search Input */}
            <div className="mb-5 relative z-20">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Search Submissions</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by student name, roll number, college, course, subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[38%] pl-10 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-slate-50 text-slate-800 font-medium animate-transition"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-30">
              <div>
                <SearchableDropdown
                  label="Filter by College"
                  placeholder="-- All Colleges --"
                  options={collegeOptions}
                  value={selectedCollege}
                  onChange={setSelectedCollege}
                />
              </div>
              <div>
                <SearchableDropdown
                  label="Filter by Course"
                  placeholder="-- All Courses --"
                  options={courseOptions}
                  value={selectedCourse}
                  onChange={setSelectedCourse}
                />
              </div>
              <div>
                <SearchableDropdown
                  label="Filter by Subject"
                  placeholder="-- All Subjects --"
                  options={subjectOptions}
                  value={selectedSubject}
                  onChange={setSelectedSubject}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Filter by Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors cursor-pointer outline-none min-h-[38px]"
                >
                  <option value="">-- All Statuses --</option>
                  <option value="Submitted">Pending Evaluation</option>
                  <option value="Evaluated">Evaluation Completed</option>
                </select>
              </div>
            </div>
            
            {/* Record Count & Reset filter button */}
            <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-100 pt-3 flex-wrap gap-2">
              <span className="text-slate-500 font-medium">
                Showing <span className="text-teal-700 font-bold">{filteredSubmissions.length}</span> matching student record{filteredSubmissions.length === 1 ? '' : 's'}
              </span>
              {(selectedCollege || selectedCourse || selectedSubject || selectedStatus || searchTerm) && (
                <button 
                  onClick={() => {
                    setSelectedCollege('');
                    setSelectedCourse('');
                    setSelectedSubject('');
                    setSelectedStatus('');
                    setSearchTerm('');
                  }}
                  className="text-teal-600 hover:text-teal-800 font-semibold cursor-pointer transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submissions Table Card */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll no.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">College</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Course</th>
                    <th className="min-w-[10rem] px-4 py-3 text-left whitespace-nowrap">Subject</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Mode</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Academic year</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Document</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Max Marks</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pass Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Deadline</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                    <th className="w-[4.5rem] px-4 py-3 text-left whitespace-nowrap tabular-nums">Score</th>
                    <th className="min-w-[6rem] px-4 py-3 text-left whitespace-nowrap">Remarks</th>
                    <th className="w-[1%] pr-4 text-right px-4 py-3 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRecords ? (
                    <tr>
                      <td colSpan="16" className="px-6 py-12 text-center text-slate-400">
                        Loading student submissions…
                      </td>
                    </tr>
                  ) : pagedSubmissions.length > 0 ? (
                    pagedSubmissions.map(sub => (
                      <tr key={sub._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap text-sm">{sub.studentId?.fullName}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{sub.studentId?.regdNo}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-semibold" title={sub.studentId?.collegeId?.collegeName}>
                          {sub.studentId?.collegeId?.collegeCode || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-semibold" title={sub.studentId?.courseId?.courseName}>
                          {sub.studentId?.courseId?.courseCode || '—'}
                        </td>
                         <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium">
                          {sub.groupSubjectName || sub.subjectId?.subName}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
                            ${sub.mode === 'Supply' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}
                          `}>
                            {sub.mode || 'Regular'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{sub.academicYear || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                          {sub.filePath ? (
                            <a 
                              href={`${API_BASE_URL}${sub.filePath}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center justify-center p-2 text-teal-600 hover:text-white hover:bg-teal-700 rounded-md transition-colors border border-teal-200 hover:border-teal-700 cursor-pointer"
                              title="View Submission PDF"
                            >
                              <FileText className="h-5 w-5" />
                            </a>
                          ) : (
                            <span className="text-slate-300 italic text-xs">No File</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold">
                          {sub.maxMarks ?? sub.subjectId?.maxMarks ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold">
                          {sub.subjectId?.subPassMarks ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          {sub.valuationDeadline ? (
                            (() => {
                              const deadlineDate = new Date(sub.valuationDeadline);
                              const today = new Date();
                              const diffTime = deadlineDate - today;
                              const diffHours = diffTime / (1000 * 60 * 60);
                              
                              let textColorClass = 'text-slate-600 font-medium';
                              let bgClass = 'bg-slate-50 border-slate-200';
                              let tagText = '';
                              
                              if (diffHours < 0) {
                                textColorClass = 'text-red-700 font-bold animate-pulse';
                                bgClass = 'bg-red-50 border-red-200';
                                tagText = 'OVERDUE';
                              } else if (diffHours < 48) {
                                textColorClass = 'text-amber-700 font-bold';
                                bgClass = 'bg-amber-50 border-amber-200';
                                tagText = 'URGENT';
                              }
                              
                              return (
                                <div className={`inline-flex flex-col px-2 py-0.5 rounded-md border text-[11px] ${bgClass}`}>
                                  <span className={textColorClass}>
                                    {deadlineDate.toLocaleDateString('en-GB')}
                                  </span>
                                  {tagText && (
                                    <span className={`text-[8px] font-extrabold tracking-wider leading-none text-center ${textColorClass}`}>
                                      {tagText}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-slate-300 italic text-xs">No Deadline</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sub.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sub.status === 'Evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          {sub.status === 'Evaluated' ? (
                            <div className="font-bold text-slate-900">{sub.score} / {sub.maxMarks ?? sub.subjectId?.maxMarks ?? 100}</div>
                          ) : (
                            (() => {
                              const enteredScore = marks[sub._id]?.score;
                              const maxLimit = sub.maxMarks ?? sub.subjectId?.maxMarks ?? 100;
                              const isExceeded = enteredScore !== undefined && enteredScore !== '' && Number(enteredScore) > maxLimit;
                              const isNegative = enteredScore !== undefined && enteredScore !== '' && Number(enteredScore) < 0;
                              const hasError = isExceeded || isNegative;
                              
                              return (
                                <div className="flex flex-col items-center">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max={maxLimit}
                                    value={enteredScore || ''}
                                    onChange={(e) => handleMarkChange(sub._id, 'score', e.target.value)}
                                    className={`w-16 border rounded p-1 text-center font-semibold transition-all duration-200 ${
                                      hasError 
                                        ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500 focus:border-red-500 focus:outline-none' 
                                        : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500 text-slate-800'
                                    }`}
                                    placeholder="0"
                                  />
                                  {isExceeded && (
                                    <span className="text-[10px] text-red-600 font-bold mt-1.5 leading-none whitespace-nowrap text-center animate-pulse">
                                      Max: {maxLimit}
                                    </span>
                                  )}
                                  {isNegative && (
                                    <span className="text-[10px] text-red-600 font-bold mt-1.5 leading-none whitespace-nowrap text-center animate-pulse">
                                      Min: 0
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          {sub.status === 'Evaluated' ? (
                            <span className="text-slate-600 text-sm">{sub.feedback || '—'}</span>
                          ) : (
                            <input 
                              type="text" 
                              value={marks[sub._id]?.remarks || ''}
                              onChange={(e) => handleMarkChange(sub._id, 'remarks', e.target.value)}
                              className="w-full border border-slate-300 rounded p-1 text-sm"
                              placeholder="Optional remarks"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right">
                          {sub.status !== 'Evaluated' && (
                            (() => {
                              const enteredScore = marks[sub._id]?.score;
                              const maxLimit = sub.maxMarks ?? sub.subjectId?.maxMarks ?? 100;
                              const isExceeded = enteredScore !== undefined && enteredScore !== '' && Number(enteredScore) > maxLimit;
                              const isNegative = enteredScore !== undefined && enteredScore !== '' && Number(enteredScore) < 0;
                              const hasError = isExceeded || isNegative;
                              
                              return (
                                <button 
                                  onClick={() => handleSubmitMarks(sub._id)}
                                  disabled={!enteredScore || hasError}
                                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-300 text-white rounded-md font-medium transition-colors cursor-pointer"
                                >
                                  Submit
                                </button>
                              );
                            })()
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="15" className="px-6 py-12 text-center text-slate-500">
                        <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <span className="text-sm font-medium">No student submissions found matching the criteria.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={filteredSubmissions.length} page={currentPage} onPage={setCurrentPage} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
