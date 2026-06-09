import { useState, useEffect, useMemo } from 'react';
import { Users, BookOpen, AlertCircle, CheckCircle, Filter, Edit, Download, Upload, RefreshCw, Search, X, Activity } from 'lucide-react';
import axios from 'axios';
import SearchableDropdown from '../../components/SearchableDropdown';
import { downloadAssignmentScoresXlsx } from '../../utils/exportUtils';
import { API_BASE_URL } from '../../utils/config';
import ActivityFeed from '../../components/ActivityFeed';

/* ── Pagination component ── */
const Pagination = ({ total, page, onPage, pageSize = 10 }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

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
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${p === page
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

const AssignmentTable = ({ title, data, currentPage, setCurrentPage, pageSize = 10, handleExportAssignments, onEditDeadline }) => {
  const pagedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden animate-fadeIn mb-8">
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-teal-600" />
          {title} ({data.length})
        </h2>
        {data.length > 0 && (
          <button
            onClick={() => handleExportAssignments(data)}
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
              <th className="px-4 py-3 text-left whitespace-nowrap">Record Submission Deadline</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Assigned Evaluator</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Evaluated by</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Final Marks</th>
            </tr>
          </thead>
          <tbody>
            {pagedData.map((assignment) => (
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
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {new Date(assignment.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {onEditDeadline && assignment.status === 'Pending' && (
                      <button
                        onClick={() => onEditDeadline(assignment)}
                        className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-1"
                        title="Edit Deadline"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{assignment.evaluatorId?.fullName || <span className="text-slate-400 italic text-xs">Unassigned</span>}</td>
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{assignment.status === 'Evaluated' ? assignment.evaluatorId?.fullName : '—'}</td>
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${assignment.status === 'Evaluated' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}
                    `}>
                      {assignment.status}
                    </span>
                    {assignment.studentNote && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[100px]" title={assignment.studentNote}>
                        Has Note
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right font-semibold text-slate-900">{assignment.score !== undefined && assignment.score !== null ? assignment.score : '—'}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="10" className="px-6 py-8 text-center text-slate-400">
                  No assignments have been generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={data.length} page={currentPage} onPage={setCurrentPage} pageSize={pageSize} />
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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const [pagesRequired, setPagesRequired] = useState(10);
  const [deadline, setDeadline] = useState('');
  const [suggestedMarksDeadline, setSuggestedMarksDeadline] = useState('');

  const [mode, setMode] = useState('Regular');
  const [showActivity, setShowActivity] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSemester, setUploadSemester] = useState('');
  const [uploadingFee, setUploadingFee] = useState(false);

  const handleFeeUpload = async (e) => {
    e.preventDefault();
    if (!uploadSemester) return setError('Please select a semester');
    const file = document.getElementById('backlogFile')?.files[0];
    if (!file) return setError('Please select an Excel file');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('semester', uploadSemester);

    try {
      setUploadingFee(true);
      setError('');
      setMessage('');
      const res = await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/backlogfees`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage(res.data.message);
      setTimeout(() => setMessage(''), 4000);
      setShowUploadModal(false);
      if (selectedSemester !== uploadSemester) {
        setSelectedSemester(uploadSemester);
      } else {
        fetchAssignments(); // Trigger a re-render if semester didn't change
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload Backlog Fees.');
    } finally {
      setUploadingFee(false);
    }
  };

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

  const handleExportAssignments = (dataToExport) => {
    try {
      const rows = (dataToExport || assignments).map(a => ({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        params.append('mode', mode);

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
  }, [selectedCollege, selectedCourse, selectedSemester, selectedGroup, mode]);

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

    const targetMode = mode === 'Backlog' ? 'Supply' : 'Regular';
    const unassignedSubjects = subjects.filter(subject => {
      const isAssigned = selectedStudents.length > 0 && assignments.some(a => {
        const aStudentId = a.studentId?._id || a.studentId;
        const aSubjectId = a.subjectId?._id || a.subjectId;
        const aMode = a.mode || 'Regular';
        return aStudentId && aSubjectId &&
          selectedStudents.includes(aStudentId.toString()) &&
          aSubjectId.toString() === subject._id.toString() &&
          aMode === targetMode;
      });
      return !isAssigned;
    });

    if (selectedSubjects.length === unassignedSubjects.length && unassignedSubjects.length > 0) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(unassignedSubjects.map(s => s._id));
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
    if (!deadline || !suggestedMarksDeadline || !pagesRequired) {
      return setError('Please fill in Submission Deadline, Suggested Marks Deadline and Required Pages.');
    }

    setMessage('');
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/admin/assign-subjects`, {
        studentIds: selectedStudents,
        subjectIds: selectedSubjects,
        pagesRequired,
        deadline,
        suggestedMarksDeadline: suggestedMarksDeadline || undefined,
        mode: mode === 'Backlog' ? 'Supply' : 'Regular'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setMessage(`Successfully assigned ${selectedSubjects.length} subject(s) to ${selectedStudents.length} student(s).`);
      setTimeout(() => setMessage(''), 4000);
      setSelectedStudents([]);
      setSelectedSubjects([]);
      setSuggestedMarksDeadline('');
      setRefreshTrigger(prev => prev + 1);
      setSelectedCollege('');
      setSelectedCourse('');
      setSelectedSemester('');
      setSelectedGroup('');
      fetchAssignments();
      setActiveTab('list');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign subjects.');
    }
  };

  const [listCollege, setListCollege] = useState('');
  const [listCourse, setListCourse] = useState('');
  const [listSemester, setListSemester] = useState('');
  const [listStatus, setListStatus] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Extract unique options from assignments
  const listColleges = useMemo(() => {
    const map = new Map();
    assignments.forEach(a => {
      const col = a.studentId?.collegeId;
      if (col && col.collegeName) map.set(col._id, col.collegeName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const listCourses = useMemo(() => {
    const map = new Map();
    assignments.forEach(a => {
      if (listCollege && a.studentId?.collegeId?._id !== listCollege) return;
      const crs = a.studentId?.courseId;
      if (crs && crs.courseName) map.set(crs._id, crs.courseName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments, listCollege]);

  const listSemesters = useMemo(() => {
    const sems = new Set();
    assignments.forEach(a => {
      if (listCollege && a.studentId?.collegeId?._id !== listCollege) return;
      if (listCourse && a.studentId?.courseId?._id !== listCourse) return;
      if (a.subjectId?.semester) sems.add(a.subjectId.semester);
    });
    return Array.from(sems).sort((a, b) => a - b);
  }, [assignments, listCollege, listCourse]);

  // Reset dependent filters
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setListCourse(''); setListSemester(''); }, [listCollege]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setListSemester(''); }, [listCourse]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      // Dropdown filters
      if (listCollege && a.studentId?.collegeId?._id !== listCollege) return false;
      if (listCourse && a.studentId?.courseId?._id !== listCourse) return false;
      if (listSemester && String(a.subjectId?.semester) !== String(listSemester)) return false;
      if (listStatus && a.status !== listStatus) return false;

      // Search filter
      if (listSearch) {
        const q = listSearch.toLowerCase();
        const regdNo = (a.studentId?.regdNo || '').toLowerCase();
        const fName = (a.studentId?.fullName || '').toLowerCase();
        if (!regdNo.includes(q) && !fName.includes(q)) return false;
      }
      return true;
    });
  }, [assignments, listCollege, listCourse, listSemester, listStatus, listSearch]);

  const regularAssignments = filteredAssignments.filter(a => a.mode !== 'Supply');
  const supplyAssignments = filteredAssignments.filter(a => a.mode === 'Supply');

  const [regularPage, setRegularPage] = useState(1);
  const [supplyPage, setSupplyPage] = useState(1);

  const handleEditDeadline = async (assignment) => {
    const currentDeadline = new Date(assignment.deadline).toISOString().split('T')[0];
    const newDeadline = window.prompt("Enter new deadline (YYYY-MM-DD):", currentDeadline);
    if (!newDeadline || newDeadline === currentDeadline) return;

    // Simple validation for YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDeadline)) {
      alert("Invalid date format. Please use YYYY-MM-DD.");
      return;
    }

    try {
      setMessage('Updating deadline...');
      const res = await axios.put(`${API_BASE_URL}/api/admin/record/assignments/${assignment._id}`,
        { deadline: newDeadline },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMessage(res.data.message || 'Deadline updated successfully!');
      fetchAssignments();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update deadline');
    }
    setTimeout(() => { setMessage(''); setError(''); }, 3000);
  };

  return (
    <div className="px-4 py-6 w-full">
      {showActivity && (
        <ActivityFeed
          actionTypes={['EXTEND_DEADLINE', 'CREATE_ASSIGNMENT', 'UPDATE_ASSIGNMENT', 'REALLOCATE_EVALUATOR', 'ALLOCATE_EVALUATOR']}
          onClose={() => setShowActivity(false)}
          refreshTrigger={refreshTrigger}
        />
      )}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manage Assignments</h1>
          <p className="text-slate-500 text-sm mt-0.5">Generate subject assignments for students, handle backlogs, and view all records.</p>
        </div>
        <button
          onClick={() => setShowActivity(true)}
          className="flex items-center cursor-pointer gap-2 px-4 py-2 mt-1 bg-white border border-slate-200 shadow-sm rounded-md text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium sm:mr-[130px]"
        >
          <Activity className="h-4 w-4 text-teal-600" />
          Activity History
        </button>
      </div>

      <div className="flex overflow-x-auto elegant-scrollbar border-b border-slate-200 mb-6 whitespace-nowrap">
        <button
          onClick={() => { setActiveTab('generate'); setCurrentPage(1); setError(''); setMessage(''); }}
          className={`px-5 py-2.5 font-medium text-sm transition-all border-b-2 cursor-pointer rounded-t-md ${activeTab === 'generate'
            ? 'border-teal-600 text-teal-700 font-semibold bg-teal-50/30'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Generate Records
        </button>

        <button
          onClick={() => { setActiveTab('list'); setCurrentPage(1); setError(''); setMessage(''); }}
          className={`px-5 py-2.5 font-medium text-sm transition-all border-b-2 cursor-pointer rounded-t-md ${activeTab === 'list'
            ? 'border-teal-600 text-teal-700 font-semibold bg-teal-50/30'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Generated Records ({assignments.length})
        </button>
      </div>

      {/* --- TOAST NOTIFICATIONS --- */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg flex items-center gap-3 shadow-xl animate-fadeIn min-w-[300px]">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium text-sm">{message}</span>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3 shadow-xl animate-fadeIn min-w-[300px]">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* --- GENERATE TAB --- */}
      {activeTab === 'generate' && (
        <>
          {/* Mode Selector */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700">Assignment Mode:</label>
              <select
                className="border border-slate-300 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="Regular">Regular Subjects</option>
                <option value="Backlog">Backlog / Supply</option>
              </select>
            </div>

            {mode === 'Backlog' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="text-sm font-semibold px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md flex items-center gap-2 transition-colors shadow-sm"
              >
                <Upload className="h-4 w-4" />
                Upload Backlog Fees
              </button>
            )}
          </div>
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

              <div className="p-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Submission Deadline <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 whitespace-nowrap">Suggested Marks Deadline <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={suggestedMarksDeadline}
                    onChange={(e) => setSuggestedMarksDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                  />
                </div>
                <div className='ml-2'>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Req. Pages <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={pagesRequired}
                    onChange={(e) => setPagesRequired(Number(e.target.value))}
                    className="sm:w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto elegant-scrollbar p-4 space-y-2">
                {subjects.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">Select a Semester to view subjects.</p>
                ) : (
                  subjects.map(subject => {
                    const targetMode = mode === 'Backlog' ? 'Supply' : 'Regular';
                    const isAssigned = selectedStudents.length > 0 && assignments.some(a => {
                      const aStudentId = a.studentId?._id || a.studentId;
                      const aSubjectId = a.subjectId?._id || a.subjectId;
                      const aMode = a.mode || 'Regular';
                      return aStudentId && aSubjectId &&
                        selectedStudents.includes(aStudentId.toString()) &&
                        aSubjectId.toString() === subject._id.toString() &&
                        aMode === targetMode;
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
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={handleAssign}
                  disabled={selectedSubjects.length === 0}
                  className={`w-full font-medium py-2.5 rounded-md transition-colors text-sm ${selectedSubjects.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-sm'}`}
                >
                  Generate Assignments
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- LIST TAB --- */}
      {activeTab === 'list' && (
        <div>
          {/* Filters Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Filter className="h-5 w-5 text-teal-600" />
                Filter Generated Assignments
              </div>

              <button
                onClick={() => {
                  setListCollege(''); setListCourse(''); setListSemester(''); setListStatus(''); setListSearch(''); setShowSearch(false);
                }}
                className="text-xs font-medium text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </button>
            </div>

            <div className="p-5">
              <div className="flex flex-col md:flex-row items-end gap-3">

                {/* Search Toggle Button */}
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`cursor-pointer text-white w-[38px] h-[38px] rounded-md transition-colors shadow-sm focus:outline-none flex items-center justify-center flex-shrink-0 ${showSearch ? 'bg-slate-700 hover:bg-slate-800' : 'bg-teal-600 hover:bg-teal-700'}`}
                  title="Toggle Search"
                >
                  <Search className="h-5 w-5" />
                </button>

                {/* College Filter */}
                <div className="w-full md:flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">College</label>
                  <select
                    value={listCollege}
                    onChange={(e) => setListCollege(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="">All Colleges</option>
                    {listColleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Course Filter */}
                <div className="w-full md:flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Course</label>
                  <select
                    value={listCourse}
                    onChange={(e) => setListCourse(e.target.value)}
                    disabled={!listCollege}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="">All Courses</option>
                    {listCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Semester Filter */}
                <div className="w-full md:flex-1 min-w-[120px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Semester</label>
                  <select
                    value={listSemester}
                    onChange={(e) => setListSemester(e.target.value)}
                    disabled={!listCourse}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="">All Semesters</option>
                    {listSemesters.map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-full md:flex-1 min-w-[120px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={listStatus}
                    onChange={(e) => setListStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Evaluated">Evaluated</option>
                  </select>
                </div>

              </div>

              {/* Toggled Search Box */}
              {showSearch && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn">
                  <div className="relative max-w-sm bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search by Registration No or Name..."
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                        className="w-full pl-9 pr-6 py-1.5 text-sm bg-transparent outline-none text-slate-800 font-medium"
                      />
                      {listSearch && (
                        <button onClick={() => setListSearch('')} className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="text-teal-700 font-bold">{filteredAssignments.length}</span> matching records
              </div>
            </div>
          </div>

          <AssignmentTable
            title="Regular Assignments"
            data={regularAssignments}
            currentPage={regularPage}
            setCurrentPage={setRegularPage}
            handleExportAssignments={handleExportAssignments}
            onEditDeadline={handleEditDeadline}
          />

          <AssignmentTable
            title="Supply (Backlog) Assignments"
            data={supplyAssignments}
            currentPage={supplyPage}
            setCurrentPage={setSupplyPage}
            handleExportAssignments={handleExportAssignments}
            onEditDeadline={handleEditDeadline}
          />
        </div>
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-teal-700">
                <Upload className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Upload Backlog Fees</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFeeUpload} className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Semester</label>
                <select
                  required
                  value={uploadSemester}
                  onChange={(e) => setUploadSemester(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800"
                >
                  <option value="">-- Select Semester --</option>
                  {filters.semesters?.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Excel File</label>
                <input
                  type="file"
                  id="backlogFile"
                  accept=".xlsx,.xls"
                  required
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-md text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFee}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {uploadingFee && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {uploadingFee ? 'Uploading...' : 'Upload Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
