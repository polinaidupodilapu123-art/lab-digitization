import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, CheckCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Select from 'react-select'; // using react-select for searchable dropdowns

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = `${API_BASE_URL}/api/admin`;

const PromoteStudentsModal = ({ token, onClose, onSuccess }) => {
  const [colleges, setColleges] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([
    '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'
  ]);
  
  const [filters, setFilters] = useState({ collegeId: null, courseId: null, semester: null });
  const [toSemester, setToSemester] = useState(null);
  
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allStudents, setAllStudents] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const PAGE_SIZE = 10;

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [colRes, curRes, stuRes] = await Promise.all([
          axios.get(`${API}/colleges`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setColleges(colRes.data.map(c => ({ value: c._id, label: `${c.collegeCode} - ${c.collegeName}` })));
        setCourses(curRes.data.map(c => ({ value: c._id, label: `${c.courseCode} - ${c.courseName}` })));
        setAllStudents(stuRes.data);
      } catch (err) {
        console.error('Error fetching dropdowns:', err);
      }
    };
    fetchDropdowns();
  }, [token]);

  // Automatically filter students when dropdowns change
  useEffect(() => {
    if (!filters.collegeId && !filters.courseId && !filters.semester) {
      setStudents([]);
      setSelectedStudentIds([]);
      return;
    }
    const filtered = allStudents.filter(s => {
      let match = true;
      if (filters.collegeId) match = match && s.collegeId?._id === filters.collegeId.value;
      if (filters.courseId) match = match && s.courseId?._id === filters.courseId.value;
      if (filters.semester) match = match && s.currentSemester === filters.semester.value;
      return match;
    });
    setStudents(filtered);
    setSelectedStudentIds(filtered.map(s => s._id)); // Select all by default
    setCurrentPage(1);
  }, [filters, allStudents]);

  const handlePromote = async () => {
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student to promote.');
      return;
    }
    if (!toSemester) {
      setError('Please select the Target Semester.');
      return;
    }
    setError('');
    setPromoting(true);
    try {
      const res = await axios.post(`${API}/students/promote`, {
        studentIds: selectedStudentIds,
        toSemester: toSemester.value
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess('students', res.data.message);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote students.');
    }
    setPromoting(false);
  };

  const toggleSelection = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const displayedIds = filteredStudents.map(s => s._id);
    const allDisplayedSelected = displayedIds.every(id => selectedStudentIds.includes(id));
    if (allDisplayedSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => [...new Set([...prev, ...displayedIds])]);
    }
  };

  const semesterOptions = semesters.map(s => ({ value: s, label: s }));

  const filteredStudents = React.useMemo(() => {
    return students.filter(s => {
      if (!searchTerm) return true;
      const lowerQuery = searchTerm.toLowerCase();
      return (
        String(s.fullName).toLowerCase().includes(lowerQuery) ||
        String(s.regdNo).toLowerCase().includes(lowerQuery)
      );
    });
  }, [students, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedStudents = filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 text-teal-800">
            <CheckCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Promote Students</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Filters Panel */}
          <div className="bg-white rounded-md shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row items-end gap-3">
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className={`cursor-pointer text-white w-[38px] h-[38px] rounded-md transition-colors shadow-sm focus:outline-none flex items-center justify-center flex-shrink-0 ${showSearch ? 'bg-slate-700 hover:bg-slate-800' : 'bg-teal-600 hover:bg-teal-700'}`}
                title="Toggle Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <div className="w-full md:flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
                  College
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Select 
                  options={colleges} 
                  value={filters.collegeId}
                  onChange={val => {
                    setFilters({ collegeId: val, courseId: null, semester: null });
                    setCurrentPage(1);
                  }}
                  placeholder="Select College"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                />
              </div>
              <div className="w-full md:flex-1 min-w-[150px]">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
                  Course
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Select 
                  options={courses} 
                  value={filters.courseId}
                  onChange={val => {
                    setFilters(prev => ({...prev, courseId: val, semester: null}));
                    setCurrentPage(1);
                  }}
                  placeholder="Select Course"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                />
              </div>
              <div className="w-full md:flex-1 min-w-[150px]">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center">
                  From Semester
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Select 
                  options={semesterOptions} 
                  value={filters.semester}
                  onChange={val => {
                    setFilters(prev => ({...prev, semester: val}));
                    setCurrentPage(1);
                  }}
                  placeholder="Current Sem"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                />
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
                      placeholder="Search by student name or registration number..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-6 py-1.5 text-sm bg-transparent outline-none text-slate-800 font-medium"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Students Table */}
          {students.length > 0 && (
            <>
              <div className="border border-slate-200 rounded-md overflow-hidden mb-6">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s._id))}
                            onChange={toggleAll}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Reg. No</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Student Name</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Group</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedStudents.map((student, i) => (
                        <tr key={student._id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => toggleSelection(student._id)}>
                          <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedStudentIds.includes(student._id)}
                              onChange={() => toggleSelection(student._id)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-slate-800 font-medium">{student.regdNo}</td>
                          <td className="px-4 py-2.5 text-slate-600">{student.fullName}</td>
                          <td className="px-4 py-2.5 text-slate-500">{student.groupCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Showing <span className="font-semibold text-slate-700">{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredStudents.length)}</span> of <span className="font-semibold text-slate-700">{filteredStudents.length}</span> students
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="h-3 w-3" /> Prev
                      </button>
                      <span className="text-xs font-semibold text-slate-700 px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        Next <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Row */}
              <div className="bg-teal-50 border border-teal-100 rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-teal-800 font-medium">
                  {selectedStudentIds.length} out of {students.length} students selected
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-48">
                    <Select 
                      options={semesterOptions} 
                      value={toSemester}
                      onChange={setToSemester}
                      placeholder="Promote to Sem..."
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    />
                  </div>
                  <button 
                    onClick={handlePromote}
                    disabled={promoting || selectedStudentIds.length === 0 || !toSemester}
                    className="flex-1 md:flex-none px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                  >
                    {promoting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {promoting ? 'Promoting...' : 'Promote Selected'}
                  </button>
                </div>
              </div>
            </>
          )}

          {students.length === 0 && !loading && !error && filters.collegeId && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-md text-slate-500">
              No students found for the selected filters.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PromoteStudentsModal;
