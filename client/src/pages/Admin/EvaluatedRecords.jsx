import { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Download } from 'lucide-react';
import axios from 'axios';
import { downloadAssignmentScoresXlsx } from '../../utils/exportUtils';

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
        const res = await axios.get('http://localhost:5000/api/admin/assignments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Filter only evaluated records
        const evaluated = res.data.filter(a => a.status === 'Evaluated');
        // Sort newly evaluated / submitted ones on top
        const sorted = evaluated.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
        setRecords(sorted);
      } catch (err) {
        console.error('Failed to load assignments');
      }
    };
    const fetchPapers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/papers', {
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

  const filteredRecords = records.filter(record => 
    record.studentId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.studentId?.regdNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.subjectId?.subName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      studentAssignments.map(a => [a.subjectId?._id || a.subjectId, a])
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

  const handleExportPaperGrades = async () => {
    try {
      const XLSX = await import('xlsx');
      const header = [
        "Name of the College",
        "Degree",
        "Semester",
        "Registered Number",
        "Name",
        ...papers.map(p => `${p.paperCode} - ${p.paperName} (Max: ${p.maxMarks})`)
      ];

      const data = [
        [...header],
        ...studentsList.map(s => [
          s.collegeName,
          s.degree,
          s.semester,
          s.regdNo,
          s.fullName,
          ...s.paperScores.map(ps => ps.obtainedScore !== null ? ps.obtainedScore : "Pending")
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
  const pagedStudentsList = studentsList.slice((paperPage - 1) * PAGE_SIZE, paperPage * PAGE_SIZE);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Evaluated Records</h1>
          <p className="text-slate-500 mt-1">Review all lab records that have been graded by evaluators.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
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
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
          />
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

      <div className="bg-white border border-slate-200 rounded-b-2xl rounded-tr-2xl border-t-0 shadow-sm overflow-hidden">
        {activeTab === 'submissions' ? (
          <>
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
                Evaluated Submissions ({filteredRecords.length})
              </h2>
              {filteredRecords.length > 0 && (
                <button
                  onClick={handleExportEvaluated}
                  className="flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export Excel
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student Name</th>
                    <th className="px-6 py-4 font-semibold">Roll No.</th>
                    <th className="px-6 py-4 font-semibold min-w-[12rem]">Document / Subject</th>
                    <th className="px-6 py-4 font-semibold">Date of Evaluation</th>
                    <th className="px-6 py-4 font-semibold">Evaluated By</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Score</th>
                    <th className="px-6 py-4 font-semibold min-w-[10rem]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{record.studentId?.fullName}</td>
                      <td className="px-6 py-4">{record.studentId?.regdNo}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                      </td>
                      <td className="px-6 py-4">
                        {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{record.evaluatorId?.fullName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-emerald-600 text-base">{record.score}</span>
                        <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic">
                        {record.feedback || 'None'}
                      </td>
                    </tr>
                  ))}
                  
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
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
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
                Aggregated Paper Grades ({studentsList.length})
              </h2>
              {studentsList.length > 0 && (
                <button
                  onClick={handleExportPaperGrades}
                  className="flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export Paper Marks
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student Name</th>
                    <th className="px-6 py-4 font-semibold">Roll No.</th>
                    <th className="px-6 py-4 font-semibold">Semester</th>
                    {papers.map(p => (
                      <th key={p.paperCode} className="px-6 py-4 font-semibold text-center min-w-[8rem]" title={p.paperName}>
                        {p.paperCode}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedStudentsList.map((s) => (
                    <tr key={s.regdNo} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{s.fullName}</td>
                      <td className="px-6 py-4 font-mono text-xs">{s.regdNo}</td>
                      <td className="px-6 py-4">{s.semester}</td>
                      {s.paperScores.map((ps) => {
                        const isPassed = ps.obtainedScore >= ps.passMarks;
                        return (
                          <td key={ps.paperCode} className="px-6 py-4 text-center">
                            {ps.obtainedScore !== null ? (
                              <span className={`inline-flex flex-col items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                                isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}>
                                <span>{ps.obtainedScore} / {ps.maxMarks}</span>
                                <span className="text-[9px] opacity-75">{isPassed ? 'PASS' : 'FAIL'}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Pending</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {studentsList.length === 0 && (
                    <tr>
                      <td colSpan={3 + papers.length} className="px-6 py-12 text-center text-slate-500">
                        No paper evaluation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={studentsList.length} page={paperPage} onPage={setPaperPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default EvaluatedRecords;
