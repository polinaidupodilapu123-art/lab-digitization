import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Filter, RefreshCw, AlertCircle, Clock, BookOpen, User, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const PendingStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering state
  const [filters, setFilters] = useState({ courses: [], semesters: [] });
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  const fetchPendingStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // We first need the filters to populate dropdowns correctly if they don't exist
      // But we can get unique courses/semesters from the returned data
      let url = `${API_BASE_URL}/api/principal/pending-students`;
      const params = [];
      if (selectedCourse) params.push(`courseId=${selectedCourse}`);
      if (selectedSemester) params.push(`semester=${selectedSemester}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = res.data.data;
      setStudents(data);

      // Extract unique courses and semesters for filters if not set yet
      if (filters.courses.length === 0) {
        const uniqueCoursesMap = new Map();
        const uniqueSems = new Set();
        data.forEach(s => {
          if (s.courseId && s.courseCode !== 'N/A') {
            uniqueCoursesMap.set(s.courseId, { _id: s.courseId, courseCode: s.courseCode, courseName: s.courseName });
          }
          if (s.semester && s.semester !== 'N/A') {
            uniqueSems.add(s.semester);
          }
        });
        setFilters({
          courses: Array.from(uniqueCoursesMap.values()),
          semesters: Array.from(uniqueSems)
        });
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load pending students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingStudents();
  }, [selectedCourse, selectedSemester]);

  // Frontend filter for course since the backend might need Course ID but we only have Course Code mapped easily in this view, 
  // actually the backend accepts courseId but since we don't fetch full course list from /pending-students, 
  // let's do frontend filtering for the table to make it snappy, or we can fetch the initial full list.
  // We'll do simple frontend filtering.

  const filteredStudents = students.filter(student => {
    const matchCourse = selectedCourse ? student.courseId === selectedCourse : true;
    const matchSemester = selectedSemester ? student.semester === selectedSemester : true;
    return matchCourse && matchSemester;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-amber-500 h-6 w-6" />
            Pending Students
          </h1>
          <p className="text-sm text-slate-500 mt-1">List of students who have not yet submitted their lab records.</p>
        </div>
        <button 
          onClick={fetchPendingStudents}
          className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-sm font-semibold transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 mr-2 shrink-0">
          <Filter className="h-4.5 w-4.5 text-teal-600" />
          <span className="text-sm font-bold uppercase tracking-wide">Filter List</span>
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full border border-slate-200 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50 text-slate-800 font-semibold"
          >
            <option value="">All Courses</option>
            {filters.courses.map(c => (
              <option key={c._id} value={c._id}>{c.courseCode} - {c.courseName}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full border border-slate-200 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50 text-slate-800 font-semibold"
          >
            <option value="">All Semesters</option>
            {filters.semesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>

        {(selectedCourse || selectedSemester) && (
          <button
            onClick={() => { setSelectedCourse(''); setSelectedSemester(''); }}
            className="text-xs text-teal-600 hover:text-teal-700 font-bold hover:underline py-2 px-3 rounded-md hover:bg-teal-50 shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && students.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center shadow-sm">
          <CheckCircle className="h-12 w-12 text-teal-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Pending Students</h3>
          <p className="text-slate-500 text-sm mt-1">All students matching these filters have submitted their records!</p>
        </div>
      ) : (
        <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-700 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left whitespace-nowrap">HT No</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Course</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Sem</th>
                  <th className="px-4 py-3 text-left">Pending Subjects</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr 
                    key={student._id} 
                    className={`border-b border-slate-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50`}
                  >
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {student.regdNo}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {student.fullName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {student.courseCode}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-center">
                      {student.semester}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                        {student.pendingSubjects.map((sub, i) => (
                          <span 
                            key={i} 
                            title={sub.fullName}
                            className=" hover:text-teal-700 hover:border-teal-700 transition-colors"
                          >
                            {sub.shortName}{i < student.pendingSubjects.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingStudents;
