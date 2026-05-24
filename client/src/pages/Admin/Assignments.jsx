import { useState, useEffect } from 'react';
import { Users, BookOpen, CheckCircle, Filter } from 'lucide-react';
import axios from 'axios';
import SearchableDropdown from '../../components/SearchableDropdown';

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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [pagesRequired, setPagesRequired] = useState(10);
  const [deadline, setDeadline] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const fetchAssignments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/assignments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignments(res.data);
    } catch (err) {
      console.error('Failed to load assignments');
    }
  };

  // 1. Fetch available filters on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/assignment-filters', {
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

        const res = await axios.get(`http://localhost:5000/api/admin/assignment-data?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        setStudents(res.data.students || []);
        setSubjects(res.data.subjects || []);
        
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
      await axios.post('http://localhost:5000/api/admin/assign-subjects', {
        studentIds: selectedStudents,
        subjectIds: selectedSubjects,
        pagesRequired,
        academicYear,
        deadline
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setMessage(`Successfully assigned ${selectedSubjects.length} subject(s) to ${selectedStudents.length} student(s).`);
      setSelectedStudents([]);
      setSelectedSubjects([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign subjects.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Generate Assignments</h1>
        <p className="text-slate-500 mt-2">Filter to find the right students and semester papers, then assign.</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-4 items-end">
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

      {message && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center space-x-3 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg text-red-600 font-medium text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Students Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
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
                <label key={student._id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedStudents.includes(student._id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
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
                      <span className="text-[10px] ml-2 text-slate-400">
                        (Sub1: {student.groupId?.subject1 || 'empty'}, Sub2: {student.groupId?.subject2 || 'empty'})
                      </span>
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Subjects Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
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
          
          <div className="p-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Academic Year</label>
              <input 
                type="text" 
                placeholder="e.g. 2023-2024"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Deadline</label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Req. Pages</label>
              <input 
                type="number" 
                value={pagesRequired}
                onChange={(e) => setPagesRequired(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm" 
                min="1"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto elegant-scrollbar p-4 space-y-2">
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">Select a Semester to view subjects.</p>
            ) : (
              subjects.map(subject => (
                <label key={subject._id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedSubjects.includes(subject._id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                    checked={selectedSubjects.includes(subject._id)}
                    onChange={() => toggleSubject(subject._id)}
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{subject.subName}</p>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center">
                      {subject.subCode} • Semester: {subject.semester || 'N/A'}
                      {(subject.isGroupSubject && selectedGroup) && (
                        <span className="ml-2 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Group Subject</span>
                      )}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
          {/* Assign Button */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={handleAssign}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Generate Assignments
            </button>
          </div>
        </div>

      </div>

      {/* Generated Assignments Table */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-teal-600" />
            Generated Assignments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Roll no.</th>
                <th className="px-6 py-4 font-semibold">Pages</th>
                <th className="px-6 py-4 font-semibold">Deadline</th>
                <th className="px-6 py-4 font-semibold">Assigned controller</th>
                <th className="px-6 py-4 font-semibold">Evaluated by</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{assignment.groupSubjectName || assignment.subjectId?.subName}</p>
                    <p className="text-xs text-slate-500">{assignment.subjectId?.subCode}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{assignment.studentId?.fullName}</td>
                  <td className="px-6 py-4">{assignment.studentId?.regdNo}</td>
                  <td className="px-6 py-4">{assignment.pagesRequired}</td>
                  <td className="px-6 py-4">{new Date(assignment.deadline).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{assignment.evaluatorId?.fullName || <span className="text-slate-400 italic">Unassigned</span>}</td>
                  <td className="px-6 py-4">{assignment.status === 'Evaluated' ? assignment.evaluatorId?.fullName : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${assignment.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 
                        assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}
                    `}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{assignment.score !== undefined ? assignment.score : '—'}</td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-slate-500">
                    No assignments have been generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Assignments;
