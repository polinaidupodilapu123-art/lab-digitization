import { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Download, BookOpen, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import ReallocateModal from '../../components/ReallocateModal';

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

const EvaluatedRecords = () => {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paperPage, setPaperPage] = useState(1);
  const [reallocateTarget, setReallocateTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const PAGE_SIZE = 10;

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const activeRecords = res.data.filter(a => a.status !== 'Pending');
      const sorted = activeRecords.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
      setRecords(sorted);
    } catch (err) {
      console.error('Failed to load assignments');
    }
  };

  const handleReallocateSuccess = (msg) => {
    setToastMessage(msg);
    setReallocateTarget(null);
    fetchAssignments();
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/papers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPapers(res.data);
      } catch (err) {
        console.error('Failed to load papers', err);
      }
    };
    fetchAssignments();
    fetchPapers();
  }, []);

  const uniqueSemesters = [...new Set(records.map(r => r.subjectId?.semester || r.studentId?.currentSemester).filter(Boolean))].sort();

  const filteredRecords = records.filter(record => {
    const nameMatch = (record.studentId?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const regdNoMatch = (record.studentId?.regdNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const subjectMatch = (record.groupSubjectName || record.subjectId?.subName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const queryMatch = nameMatch || regdNoMatch || subjectMatch;

    const statusMatch = !selectedStatus || record.status === selectedStatus;
    const semMatch = !selectedSemester || (record.subjectId?.semester === selectedSemester || record.studentId?.currentSemester === selectedSemester);

    return queryMatch && statusMatch && semMatch;
  });

  const regularRecords = filteredRecords.filter(r => !r.mode || r.mode === 'Regular');
  const supplyRecords = filteredRecords.filter(r => r.mode === 'Supply');

  // Group by Student
  const studentsMap = {};
  filteredRecords.forEach(r => {
    const regdNo = r.studentId?.regdNo;
    if (!regdNo) return;
    if (!studentsMap[regdNo]) {
      studentsMap[regdNo] = {
        fullName: r.studentId?.fullName || "Student",
        regdNo: regdNo,
        collegeName: r.studentId?.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        degree: r.studentId?.courseId?.courseName || "Programme",
        semester: r.studentId?.currentSemester || r.subjectId?.semester || "",
        assignments: []
      };
    }
    studentsMap[regdNo].assignments.push(r);
  });

  const regularPaperRows = [];
  const supplyPaperRows = [];

  const studentsList = Object.values(studentsMap).map(student => {
    const studentAssignments = student.assignments;
    
    // Group assignments by mode
    const regularAssignments = studentAssignments.filter(a => !a.mode || a.mode === 'Regular');
    const supplyAssignments = studentAssignments.filter(a => a.mode === 'Supply');
    
    const regularMap = new Map(regularAssignments.map(a => [a.subjectId?._id?.toString() || a.subjectId?.toString() || '', a]));
    const supplyMap = new Map(supplyAssignments.map(a => [a.subjectId?._id?.toString() || a.subjectId?.toString() || '', a]));

    const filteredPapers = selectedSemester ? papers.filter(p => p.semester === selectedSemester) : papers;

    const buildPaperScore = (paper, assignmentMap, mode, fallbackMap = null) => {
      let obtainedScore = 0;
      let paperMaxMarks = 0;
      let evaluatedCount = 0;
      const totalSubjectsCount = paper.subjectIds?.length || 0;
      let hasFailedSubject = false;

      (paper.subjectIds || []).forEach(sub => {
        const subId = sub._id || sub;
        let assignment = assignmentMap.get(subId.toString());
        
        if (!assignment && fallbackMap) {
          const fallbackAssignment = fallbackMap.get(subId.toString());
          if (fallbackAssignment && fallbackAssignment.status === 'Evaluated') {
            assignment = fallbackAssignment;
          }
        }

        paperMaxMarks += sub.maxMarks || 0;

        if (assignment) {
          obtainedScore += assignment.score || 0;
          evaluatedCount++;
          
          const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
          if (assignment.score < passMark) {
            hasFailedSubject = true;
          }
        }
      });

      const isEvaluated = evaluatedCount === totalSubjectsCount && totalSubjectsCount > 0;
      const isPassed = isEvaluated ? (!hasFailedSubject && obtainedScore >= (paper.passMarks || 0)) : false;

      return {
        fullName: student.fullName,
        regdNo: student.regdNo,
        semester: paper.semester || student.semester,
        collegeName: student.collegeName,
        degree: student.degree,
        paperName: paper.paperName || paper.paperCode || "Paper",
        paperCode: paper.paperCode,
        obtainedScore: isEvaluated ? obtainedScore : null,
        maxMarks: paperMaxMarks,
        passMarks: paper.passMarks || 0,
        status: isEvaluated ? 'Evaluated' : 'Pending',
        isPassed,
        mode: mode
      };
    };

    filteredPapers.forEach(paper => {
      const hasRegular = paper.subjectIds?.some(sub => regularMap.has(sub._id ? sub._id.toString() : sub.toString()));
      if (hasRegular) regularPaperRows.push(buildPaperScore(paper, regularMap, 'Regular'));
      
      const hasSupply = paper.subjectIds?.some(sub => supplyMap.has(sub._id ? sub._id.toString() : sub.toString()));
      if (hasSupply) supplyPaperRows.push(buildPaperScore(paper, supplyMap, 'Supply', regularMap));
    });

    return student;
  });

  const handleExportEvaluated = async () => {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      const formatExportData = (rows) => rows.map(r => ({
        'College Name': r.studentId?.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        'Course': r.studentId?.courseId?.courseName || "Programme",
        'Academic Year': r.academicYear || "",
        'Semester': r.studentId?.currentSemester || r.subjectId?.semester || "",
        'Mode': r.mode || "Regular",
        'Registration Number': r.studentId?.regdNo || "",
        'Student Name': r.studentId?.fullName || "",
        'Subject Title': r.groupSubjectName || r.subjectId?.subName || "",
        'Max Marks': r.maxMarks || r.subjectId?.maxMarks || 100,
        'Marks Awarded': r.score,
        'Remarks': r.feedback || ""
      }));

      if (regularRecords.length > 0) {
        const regularSheet = XLSX.utils.json_to_sheet(formatExportData(regularRecords));
        XLSX.utils.book_append_sheet(workbook, regularSheet, "Regular Subjects");
      }
      if (supplyRecords.length > 0) {
        const supplySheet = XLSX.utils.json_to_sheet(formatExportData(supplyRecords));
        XLSX.utils.book_append_sheet(workbook, supplySheet, "Backlog Subjects");
      }

      if (regularRecords.length === 0 && supplyRecords.length === 0) {
        const emptySheet = XLSX.utils.json_to_sheet([{ Message: "No data available" }]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, "Evaluations");
      }

      XLSX.writeFile(workbook, `Subject_Evaluations_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel.');
    }
  };

  const handleExportPaperGrades = async () => {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      const formatExportData = (rows) => rows.map(row => ({
        'College Name': row.collegeName,
        'Course': row.degree,
        'Semester': row.semester,
        'Registration Number': row.regdNo,
        'Student Name': row.fullName,
        'Paper Name': row.paperName,
        'Paper Code': row.paperCode,
        'Total Score': row.obtainedScore !== null ? row.obtainedScore : 'Pending',
        'Max Marks': row.maxMarks,
        'Result': row.obtainedScore !== null ? (row.isPassed ? 'PASS' : 'FAIL') : 'Pending'
      }));

      if (regularPaperRows.length > 0) {
        const regularSheet = XLSX.utils.json_to_sheet(formatExportData(regularPaperRows));
        XLSX.utils.book_append_sheet(workbook, regularSheet, "Regular Papers");
      }
      if (supplyPaperRows.length > 0) {
        const supplySheet = XLSX.utils.json_to_sheet(formatExportData(supplyPaperRows));
        XLSX.utils.book_append_sheet(workbook, supplySheet, "Backlog Papers");
      }

      if (regularPaperRows.length === 0 && supplyPaperRows.length === 0) {
        const emptySheet = XLSX.utils.json_to_sheet([{ Message: "No data available" }]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, "Grades");
      }

      XLSX.writeFile(workbook, `Paper_Grades_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel.');
    }
  };

  const pagedRegularRecords = regularRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedSupplyRecords = supplyRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  
  const pagedRegularPapers = regularPaperRows.slice((paperPage - 1) * PAGE_SIZE, paperPage * PAGE_SIZE);
  const pagedSupplyPapers = supplyPaperRows.slice((paperPage - 1) * PAGE_SIZE, paperPage * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 bg-slate-50 w-full animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Evaluated Records</h1>
          <p className="text-slate-500 mt-1">Review all lab records that have been graded by evaluators.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('submissions'); setCurrentPage(1); }}
          className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
            activeTab === 'submissions'
              ? 'border-teal-600 text-teal-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Submissions List
        </button>
        <button
          onClick={() => { setActiveTab('papers'); setPaperPage(1); }}
          className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${
            activeTab === 'papers'
              ? 'border-teal-600 text-teal-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Paper Grades Report
        </button>
      </div>

      <div className="bg-white rounded-md rounded-tr-2xl border border-t-0 border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
            {activeTab === 'submissions' ? `Evaluated Submissions (${filteredRecords.length})` : `Aggregated Paper Grades (${regularPaperRows.length + supplyPaperRows.length})`}
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setCurrentPage(1);
                setPaperPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white cursor-pointer"
            >
              <option value="">-- All Semesters --</option>
              {uniqueSemesters.map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
            
            {activeTab === 'submissions' && (
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white cursor-pointer"
              >
                <option value="">-- All Statuses --</option>
                <option value="Submitted">Pending Evaluation</option>
                <option value="Evaluated">Evaluation Completed</option>
              </select>
            )}

            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search student or subject..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setPaperPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
              />
            </div>

            {(filteredRecords.length > 0 || regularPaperRows.length > 0 || supplyPaperRows.length > 0) && (
              <button
                onClick={activeTab === 'submissions' ? handleExportEvaluated : handleExportPaperGrades}
                className="flex items-center justify-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export Excel
              </button>
            )}
          </div>
        </div>

        {activeTab === 'submissions' ? (
          <>
            {/* Regular Submissions */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Regular Subject Evaluations ({regularRecords.length})</h3>
            </div>
            <div className="w-full relative overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[12rem]">Document / Subject</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Max Marks</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pass Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRegularRecords.map((record) => (
                    <tr key={record._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap text-sm">{record.studentId?.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{record.studentId?.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.maxMarks ?? record.subjectId?.maxMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.subjectId?.subPassMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.status === 'Evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right">
                        <span className="font-bold text-emerald-600 text-base">{record.score !== null ? record.score : '-'}</span>
                        <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        {record.status !== 'Evaluated' && (
                          <button
                            onClick={() => setReallocateTarget(record)}
                            className="inline-flex items-center px-2 py-1 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Re-allocate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {regularRecords.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No regular subject evaluations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Backlog Submissions */}
            <div className="p-4 bg-slate-50 border-y border-slate-200 flex items-center gap-2 mt-4">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-purple-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Supply (Backlog) Subject Evaluations ({supplyRecords.length})</h3>
            </div>
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[12rem]">Document / Subject</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Max Marks</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pass Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSupplyRecords.map((record) => (
                    <tr key={record._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap text-sm">{record.studentId?.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{record.studentId?.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.maxMarks ?? record.subjectId?.maxMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.subjectId?.subPassMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.status === 'Evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right">
                        <span className="font-bold text-emerald-600 text-base">{record.score !== null ? record.score : '-'}</span>
                        <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        {record.status !== 'Evaluated' && (
                          <button
                            onClick={() => setReallocateTarget(record)}
                            className="inline-flex items-center px-2 py-1 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Re-allocate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {supplyRecords.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No supply subject evaluations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination total={Math.max(regularRecords.length, supplyRecords.length)} page={currentPage} onPage={setCurrentPage} />
          </>
        ) : (
          <>
            {/* Regular Papers Table */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Regular Paper Grades ({regularPaperRows.length})</h3>
            </div>
            <div className="w-full relative overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Semester</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Paper Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-center min-w-[8rem]">Aggregated Score</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRegularPapers.map((row, idx) => (
                    <tr key={`reg-${row.regdNo}-${row.paperCode || idx}`} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium text-slate-900">{row.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-mono text-xs">{row.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{row.semester}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-semibold text-slate-800">{row.paperName}</p>
                        <p className="text-xs text-slate-400">{row.paperCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                        {row.obtainedScore !== null ? (
                          <span className={`inline-flex flex-col items-center px-3 py-1.5 rounded-md text-xs font-bold ${
                            row.isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <span className="text-sm">{row.obtainedScore} / {row.maxMarks}</span>
                            <span className="text-[9px] opacity-75 font-semibold mt-0.5">{row.isPassed ? 'PASS' : 'FAIL'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {regularPaperRows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500 text-sm">No regular paper grades found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Backlog Papers Table */}
            <div className="p-4 bg-slate-50 border-y border-slate-200 flex items-center gap-2 mt-4">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-purple-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Supply (Backlog) Paper Grades ({supplyPaperRows.length})</h3>
              <span className="text-xs text-slate-500 font-medium ml-2 bg-white px-2 py-0.5 rounded border border-slate-200">Consolidated with Regular marks</span>
            </div>
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Semester</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Paper Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-center min-w-[8rem]">Consolidated Score</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSupplyPapers.map((row, idx) => (
                    <tr key={`sup-${row.regdNo}-${row.paperCode || idx}`} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium text-slate-900">{row.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-mono text-xs">{row.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{row.semester}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-semibold text-slate-800">{row.paperName}</p>
                        <p className="text-xs text-slate-400">{row.paperCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                        {row.obtainedScore !== null ? (
                          <span className={`inline-flex flex-col items-center px-3 py-1.5 rounded-md text-xs font-bold ${
                            row.isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <span className="text-sm">{row.obtainedScore} / {row.maxMarks}</span>
                            <span className="text-[9px] opacity-75 font-semibold mt-0.5">{row.isPassed ? 'PASS' : 'FAIL'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {supplyPaperRows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500 text-sm">No supply (backlog) paper grades found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination total={Math.max(regularPaperRows.length, supplyPaperRows.length)} page={paperPage} onPage={setPaperPage} />
          </>
        )}
      </div>
      {reallocateTarget && (
        <ReallocateModal
          assignment={reallocateTarget}
          onClose={() => setReallocateTarget(null)}
          onSuccess={handleReallocateSuccess}
        />
      )}
    </div>
  );
};

export default EvaluatedRecords;
