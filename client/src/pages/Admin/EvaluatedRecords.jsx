import { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Download } from 'lucide-react';
import axios from 'axios';
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

const EvaluatedRecords = () => {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paperPage, setPaperPage] = useState(1);

  const handleExportEvaluated = () => {
    try {
      const rows = filteredRecords.map(r => ({
        collegeName: r.studentId?.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        degree: r.studentId?.courseId?.courseName || "Programme",
        academicYear: r.academicYear || "",
        semester: r.studentId?.currentSemester || r.subjectId?.semester || "",
        mode: r.mode || "Regular",
        registeredNumber: r.studentId?.regdNo || "",
        fullName: r.studentId?.fullName || "",
        subjectTitle: r.groupSubjectName || r.subjectId?.subName || "",
        maxMarks: r.maxMarks || r.subjectId?.maxMarks || 100,
        marksAwarded: r.score,
        remarks: r.feedback || ""
      }));

      downloadAssignmentScoresXlsx(rows, "evaluated-records-report");
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export evaluated records. Please try again.");
    }
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/assignments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Filter only submitted or evaluated records (exclude Pending/unsubmitted)
        const activeRecords = res.data.filter(a => a.status !== 'Pending');
        // Sort newly updated ones on top
        const sorted = activeRecords.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
        setRecords(sorted);
      } catch (err) {
        console.error('Failed to load assignments');
      }
    };
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

  const filteredRecords = records.filter(record => {
    const nameMatch = (record.studentId?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const regdNoMatch = (record.studentId?.regdNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const subjectMatch = (record.groupSubjectName || record.subjectId?.subName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const queryMatch = nameMatch || regdNoMatch || subjectMatch;

    const statusMatch = !selectedStatus || record.status === selectedStatus;

    return queryMatch && statusMatch;
  });

  // 1. Group evaluated assignments by student
  const studentsMap = {};
  filteredRecords.forEach(r => {
    const studentId = r.studentId?._id;
    const regdNo = r.studentId?.regdNo;
    if (!regdNo) return;
    if (!studentsMap[regdNo]) {
      studentsMap[regdNo] = {
        fullName: r.studentId?.fullName || "Student",
        regdNo: regdNo,
        collegeName: r.studentId?.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        degree: r.studentId?.courseId?.courseName || "B.Ed",
        semester: r.studentId?.currentSemester || r.subjectId?.semester || "",
        assignments: []
      };
    }
    studentsMap[regdNo].assignments.push(r);
  });

  // 2. Map student assignments to Paper scores
  const studentsList = Object.values(studentsMap).map(student => {
    const studentAssignments = student.assignments;
    const assignmentMap = new Map(
      studentAssignments.map(a => {
        const key = a.subjectId?._id ? a.subjectId._id.toString() : (a.subjectId ? a.subjectId.toString() : '');
        return [key, a];
      })
    );

    const paperScores = papers.map(paper => {
      let obtainedScore = 0;
      let paperMaxMarks = 0;
      let evaluatedCount = 0;
      const totalSubjectsCount = paper.subjectIds?.length || 0;

      (paper.subjectIds || []).forEach(sub => {
        const subId = sub._id || sub;
        const assignment = assignmentMap.get(subId.toString());
        paperMaxMarks += sub.maxMarks || 0;

        if (assignment) {
          obtainedScore += assignment.score || 0;
          evaluatedCount++;
        }
      });

      const isEvaluated = evaluatedCount === totalSubjectsCount && totalSubjectsCount > 0;
      return {
        paperCode: paper.paperCode,
        paperName: paper.paperName,
        obtainedScore: isEvaluated ? obtainedScore : null,
        maxMarks: paperMaxMarks,
        passMarks: paper.passMarks || 0,
        status: isEvaluated ? 'Evaluated' : 'Pending'
      };
    });

    return {
      ...student,
      paperScores
    };
  });

  // 3. Flatten student list to a Student-Paper combination list for a single vertically formatted report
  const studentPapersRows = [];
  studentsList.forEach(s => {
    (s.paperScores || []).forEach(ps => {
      studentPapersRows.push({
        fullName: s.fullName,
        regdNo: s.regdNo,
        semester: s.semester || "—",
        collegeName: s.collegeName,
        degree: s.degree,
        paperName: ps.paperName || ps.paperCode || "Paper",
        paperCode: ps.paperCode,
        obtainedScore: ps.obtainedScore,
        maxMarks: ps.maxMarks,
        passMarks: ps.passMarks,
        status: ps.status,
        evaluatedCount: ps.evaluatedCount,
        totalSubjectsCount: ps.totalSubjectsCount
      });
    });
  });

  const handleExportPaperGrades = async () => {
    try {
      const XLSX = await import('xlsx');
      const header = [
        "Name of the College",
        "Degree",
        "Semester",
        "Registered Number",
        "Name",
        "Paper Name",
        "Aggregated Score"
      ];

      const data = [
        [...header],
        ...studentPapersRows.map(s => [
          s.collegeName,
          s.degree,
          s.semester,
          s.regdNo,
          s.fullName,
          s.paperName,
          s.obtainedScore !== null ? `${s.obtainedScore} / ${s.maxMarks}` : "Pending"
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Paper Marks");
      XLSX.writeFile(wb, "student-paper-grades-report.xlsx");
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export paper grades. Please try again.");
    }
  };

  const PAGE_SIZE = 10;
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedPaperRows = studentPapersRows.slice((paperPage - 1) * PAGE_SIZE, paperPage * PAGE_SIZE);

  return (
    <div className="px-4 py-6 w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Evaluated Records</h1>
          <p className="text-slate-500 mt-1">Review all lab records that have been graded by evaluators.</p>
        </div>
      </div>

      {/* Tabs styled exactly like Master Data */}
      <div className="flex border-b border-slate-200 mb-6">
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

      <div className="bg-white border border-slate-200 rounded-md rounded-tr-2xl border-t-0 shadow-sm overflow-hidden">
        {activeTab === 'submissions' ? (
          <>
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
                Evaluated Submissions ({filteredRecords.length})
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Status Dropdown */}
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

                {/* Search Input */}
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

                {/* Export Button */}
                {filteredRecords.length > 0 && (
                  <button
                    onClick={handleExportEvaluated}
                    className="flex items-center justify-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export Excel
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[12rem]">Document / Subject</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Mode</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-center">Max Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-center">Pass Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Date of Evaluation</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Evaluated By</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[10rem]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((record) => (
                    <tr key={record._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap text-sm">{record.studentId?.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{record.studentId?.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
                          ${record.mode === 'Supply' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}
                        `}>
                          {record.mode || 'Regular'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.maxMarks ?? record.subjectId?.maxMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.subjectId?.subPassMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium text-slate-900">{record.evaluatorId?.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'Evaluated'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.status === 'Evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right">
                        <span className="font-bold text-emerald-600 text-base">{record.score}</span>
                        <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-slate-500 italic">
                        {record.feedback || 'None'}
                      </td>
                    </tr>
                  ))}
                  
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan="11" className="px-6 py-12 text-center text-slate-500">
                        No evaluated records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={filteredRecords.length} page={currentPage} onPage={setCurrentPage} />
          </>
        ) : (
          <>
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
                Aggregated Paper Grades ({studentPapersRows.length})
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                      setPaperPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                  />
                </div>

                {/* Export Button */}
                {studentPapersRows.length > 0 && (
                  <button
                    onClick={handleExportPaperGrades}
                    className="flex items-center justify-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export Paper Marks
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Semester</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Paper Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-center min-w-[8rem]">Aggregated Score</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPaperRows.map((row, idx) => {
                    const isPassed = row.obtainedScore >= row.passMarks;
                    return (
                      <tr key={`${row.regdNo}-${row.paperCode || idx}`} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
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
                              isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              <span className="text-sm">{row.obtainedScore} / {row.maxMarks}</span>
                              <span className="text-[9px] opacity-75 font-semibold mt-0.5">{isPassed ? 'PASS' : 'FAIL'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {studentPapersRows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        No paper evaluation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={studentPapersRows.length} page={paperPage} onPage={setPaperPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default EvaluatedRecords;
