import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  School,
  FileText,
  CheckCircle,
  Clock,
  Search,
  ChevronDown,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const Overview = () => {
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState({ _id: 'all', collegeName: 'All Colleges', collegeCode: '' });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown UI states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchColleges = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/colleges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setColleges(res.data || []);
    } catch (err) {
      console.error('Error fetching colleges:', err);
    }
  };

  const fetchStats = async (collegeId) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/admin/dashboard-stats?collegeId=${collegeId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
    fetchStats('all');
  }, []);

  const handleCollegeSelect = (college) => {
    setSelectedCollege(college);
    setIsDropdownOpen(false);
    setSearchQuery('');
    fetchStats(college._id);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const filteredColleges = colleges.filter(c =>
    c.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.collegeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Normalize stats fallback values if not loaded yet
  const totalPrincipals = stats?.totalPrincipals ?? 0;
  const totalPrincipalsRegistered = stats?.totalPrincipalsRegistered ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const totalStudentsRegistered = stats?.totalStudentsRegistered ?? 0;
  const totalRecords = stats?.totalRecords ?? 0;
  const totalRecordsSubmitted = stats?.totalRecordsSubmitted ?? 0;
  const totalRecordsPending = stats?.totalRecordsPending ?? 0;

  // Calculate percentages
  const principalRegPct = totalPrincipals > 0 ? Math.round((totalPrincipalsRegistered / totalPrincipals) * 100) : 0;
  const studentRegPct = totalStudents > 0 ? Math.round((totalStudentsRegistered / totalStudents) * 100) : 0;

  const recordsSubmittedPct = totalRecords > 0 ? Math.round((totalRecordsSubmitted / totalRecords) * 100) : 0;
  const recordsPendingPct = totalRecords > 0 ? Math.round((totalRecordsPending / totalRecords) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-lg p-6 text-white shadow-md relative overflow-hidden border border-slate-700/30">
        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-100 bg-clip-text text-transparent">
              System Dashboard
            </h1>
            <p className="text-teal-200/80 text-sm font-medium mt-1">
              Real-time summary statistics for registrations, students, and lab records.
            </p>
          </div>
          <button
            onClick={() => fetchStats(selectedCollege._id)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* College Dropdown Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Select College Scope:</span>
        </div>
        <div className="relative w-full sm:w-96" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer shadow-sm"
          >
            <span className="truncate font-medium">
              {selectedCollege._id === 'all'
                ? 'All Colleges'
                : `${selectedCollege.collegeCode} - ${selectedCollege.collegeName}`}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-700 outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Search by college name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="py-1">
                {/* All Colleges Option */}
                <div
                  onClick={() => handleCollegeSelect({ _id: 'all', collegeName: 'All Colleges', collegeCode: '' })}
                  className="px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 cursor-pointer flex items-center justify-between border-b border-slate-100"
                >
                  <span>All Colleges</span>
                  {selectedCollege._id === 'all' && <Check className="h-4 w-4 text-teal-600" />}
                </div>

                {filteredColleges.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => handleCollegeSelect(c)}
                    className="px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">{c.collegeCode} - {c.collegeName}</span>
                    {selectedCollege._id === c._id && <Check className="h-4 w-4 text-teal-600" />}
                  </div>
                ))}

                {filteredColleges.length === 0 && searchQuery && (
                  <div className="px-3 py-4 text-xs text-center text-slate-500">
                    No colleges match your search.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* User Stats Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          User & Enrollment Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Principals */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-teal-50 text-teal-600 rounded-lg">
              <School className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Principals</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalPrincipals}</p>
            </div>
          </div>

          {/* Registered Principals */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Principals Registered</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalPrincipalsRegistered}</p>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalStudents}</p>
            </div>
          </div>

          {/* Registered Students */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Registered</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalStudentsRegistered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Record Stats Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Lab Record Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Records */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Records Assigned</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalRecords}</p>
            </div>
          </div>

          {/* Records Submitted */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted Records</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalRecordsSubmitted}</p>
            </div>
          </div>

          {/* Records Pending */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Records</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalRecordsPending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphical Insights Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Visual Analytics & Charts
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Bars */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <h2 className="text-base font-bold text-slate-800">Registration Completion</h2>
              <p className="text-xs text-slate-500 mt-0.5">Registration rates out of total master database records.</p>
            </div>

            <div className="flex justify-around items-center my-auto py-4"> 
              {/* Student Progress */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-28 h-28">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    {!loading && studentRegPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3.5"
                        strokeDasharray={`${studentRegPct} ${100 - studentRegPct}`}
                        strokeDashoffset="25"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-slate-800">
                      {loading ? '-' : `${studentRegPct}%`}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 mt-1">Student Enrollment</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {loading ? '-' : `${totalStudentsRegistered} / ${totalStudents}`}
                </span>
              </div>

              {/* Principal Progress */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-28 h-28">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    {!loading && principalRegPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeDasharray={`${principalRegPct} ${100 - principalRegPct}`}
                        strokeDashoffset="25"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-slate-800">
                      {loading ? '-' : `${principalRegPct}%`}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 mt-1">Principal Enrollment</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {loading ? '-' : `${totalPrincipalsRegistered} / ${totalPrincipals}`}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3 mt-3">
              * Users must register to submit and evaluate digitized records.
            </div>
          </div>

          {/* Doughnut Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <h2 className="text-base font-bold text-slate-800">Lab Record Submissions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Completion status of generated student record files.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 my-auto py-2">
              {/* SVG Doughnut */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg viewBox="0 0 36 36" className="w-36 h-36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />

                  {!loading && recordsSubmittedPct > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.8"
                      strokeDasharray={`${recordsSubmittedPct} ${100 - recordsSubmittedPct}`}
                      strokeDashoffset="25"
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}

                  {!loading && recordsPendingPct > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.8"
                      strokeDasharray={`${recordsPendingPct} ${100 - recordsPendingPct}`}
                      strokeDashoffset={25 - recordsSubmittedPct}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-800">
                    {loading ? '-' : totalRecords}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Total Assigned
                  </span>
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="w-full sm:w-48 space-y-3">
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-600">Submitted Records</span>
                    </div>
                    <div className="font-bold text-slate-900 text-right">
                      {loading ? '-' : `${totalRecordsSubmitted} (${recordsSubmittedPct}%)`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-semibold text-slate-600">Pending Records</span>
                    </div>
                    <div className="font-bold text-slate-900 text-right">
                      {loading ? '-' : `${totalRecordsPending} (${recordsPendingPct}%)`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3 mt-3 text-center sm:text-left">
              * Progress updates automatically on student upload action.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
