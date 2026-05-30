import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, FileText, CheckCircle, Clock, Filter, RefreshCw, LogOut, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import Notifications from './Notifications';
import PendingStudents from './PendingStudents';
import CollegeRecords from './CollegeRecords';
import { API_BASE_URL } from '../../utils/config';

/* ─── Pure SVG Donut Chart ─── */
const DonutChart = ({ pct, label, color = '#0d9488', size = 144, stroke = 14 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cx} r={r} fill="transparent"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-800">{pct}%</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
};

/* ─── SVG Segmented Ring — Submission Pipeline (multi-arc donut) ─── */
/* Shows: Evaluated (teal) + Submitted-awaiting-eval (blue) + Not-submitted (amber) */
/* Visually distinct from the single-arc DonutChart above */
const SegmentedRing = ({ segments, size = 140, stroke = 16 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center">
      <span className="text-slate-300 text-xs font-semibold">No data</span>
    </div>
  );

  // Build strokeDasharray arcs from 12 o'clock going clockwise
  // Each arc = (value/total)*circ, with a small gap between segments
  const GAP = 4; // px gap between arcs
  let cumulativeOffset = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle cx={cx} cy={cx} r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const arcLen = (seg.value / total) * circ - GAP;
          const dashArray = `${Math.max(arcLen, 0)} ${circ}`;
          const dashOffset = -(cumulativeOffset);
          cumulativeOffset += (seg.value / total) * circ;
          return (
            <circle
              key={i}
              cx={cx} cy={cx} r={r}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            >
              <title>{seg.label}: {seg.value}</title>
            </circle>
          );
        })}
      </svg>
      {/* Center label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-slate-800">
          {total > 0 ? Math.round(((segments[0].value + segments[1].value) / total) * 100) : 0}%
        </span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Submitted</span>
      </div>
    </div>
  );
};

/* ─── Column (Bar) Chart per subject ─── */
const ColumnChart = ({ chartData }) => {
  if (!chartData || chartData.length === 0) return null;

  const COLORS = {
    evaluated: '#0d9488',   // teal-600
    submitted:  '#3b82f6',  // blue-500
    pending:    '#f59e0b',  // amber-500
  };

  // Find the max value for scaling bar heights
  const maxVal = Math.max(
    ...chartData.flatMap(s => [s.evaluated, s.submitted, s.pending]),
    1
  );
  const BAR_MAX_H = 120; // px

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-end gap-4 min-w-max px-2 pt-4" style={{ minHeight: BAR_MAX_H + 64 }}>
        {chartData.map((sub, idx) => {
          const evalH  = Math.max((sub.evaluated / maxVal) * BAR_MAX_H, sub.evaluated > 0 ? 4 : 0);
          const subH   = Math.max((sub.submitted  / maxVal) * BAR_MAX_H, sub.submitted  > 0 ? 4 : 0);
          const pendH  = Math.max((sub.pending    / maxVal) * BAR_MAX_H, sub.pending    > 0 ? 4 : 0);

          return (
            <div key={idx} className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
              {/* Bars */}
              <div className="flex items-end gap-1" style={{ height: BAR_MAX_H }}>
                {/* Evaluated */}
                <div className="relative group flex items-end" style={{ height: BAR_MAX_H }}>
                  <div
                    style={{ height: evalH, width: 18, backgroundColor: COLORS.evaluated, borderRadius: '4px 4px 0 0', transition: 'height 0.7s ease' }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    Evaluated: {sub.evaluated}
                  </div>
                </div>
                {/* Submitted */}
                <div className="relative group flex items-end" style={{ height: BAR_MAX_H }}>
                  <div
                    style={{ height: subH, width: 18, backgroundColor: COLORS.submitted, borderRadius: '4px 4px 0 0', transition: 'height 0.7s ease' }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    Submitted: {sub.submitted}
                  </div>
                </div>
                {/* Pending */}
                <div className="relative group flex items-end" style={{ height: BAR_MAX_H }}>
                  <div
                    style={{ height: pendH, width: 18, backgroundColor: COLORS.pending, borderRadius: '4px 4px 0 0', transition: 'height 0.7s ease' }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    Pending: {sub.pending}
                  </div>
                </div>
              </div>

              {/* Baseline */}
              <div className="w-full h-px bg-slate-200" />

              {/* X-axis label */}
              <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight max-w-[72px] line-clamp-2" title={sub.subjectLabel}>
                {sub.subjectLabel}
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 px-2">
        {[
          { color: COLORS.evaluated, label: 'Evaluated' },
          { color: COLORS.submitted,  label: 'Submitted' },
          { color: COLORS.pending,    label: 'Pending' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
};


/* ─── Main Stats Component ─── */
const PrincipalDashboardStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/api/principal/stats`;
      const params = [];
      if (selectedCourse) params.push(`courseId=${selectedCourse}`);
      if (selectedSemester) params.push(`semester=${selectedSemester}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load college stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [selectedCourse, selectedSemester]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="h-7 w-7 animate-spin mr-3 text-teal-600" />
        <span className="font-semibold text-sm">Loading college dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center max-w-lg mx-auto mt-12 bg-red-50 border border-red-200 text-red-700 rounded-md">
        <p className="font-bold text-lg">Failed to load Dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={fetchStats} className="mt-4 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  const { college, counts, filters, chartData } = data || {};

  const totalEvaluated = counts?.totalEvaluated || 0;
  const totalSubmitted = counts?.totalSubmitted || 0;
  const totalPending   = counts?.totalPending   || 0;
  const totalSheets    = counts?.totalSheets    || 0;

  // Donut metric: Evaluation Rate — what % of ALL sheets are fully graded
  const evalPct = totalSheets > 0 ? Math.round((totalEvaluated / totalSheets) * 100) : 0;

  // Segmented ring metric: Submission Pipeline
  // Segment 1 (teal):  Evaluated   — graded and done
  // Segment 2 (blue):  Submitted   — uploaded, awaiting evaluation
  // Segment 3 (amber): Pending     — not yet uploaded by student
  const ringSegments = [
    { label: 'Evaluated (Graded)',       value: totalEvaluated, color: '#0d9488' },
    { label: 'Submitted (Awaiting Eval)', value: totalSubmitted,  color: '#3b82f6' },
    { label: 'Not Yet Submitted',         value: totalPending,    color: '#f59e0b' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* College Info Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-md p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/5">
        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3.5 py-1 bg-teal-500/20 text-teal-200 border border-teal-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              College Principal Hub
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2.5 bg-gradient-to-r from-white via-slate-100 to-teal-100 bg-clip-text text-transparent">
              {college?.collegeName}
            </h1>
            <p className="text-teal-200/80 text-sm font-semibold tracking-wide mt-1">
              College Code: {college?.collegeCode}
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all self-start md:self-center shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Dashboard
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 mr-2 shrink-0">
          <Filter className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-bold uppercase tracking-wide">Filter Stats</span>
        </div>
        <div className="w-full sm:w-56">
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="w-full border border-slate-200 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50 text-slate-800 font-semibold"
          >
            <option value="">All Courses</option>
            {filters?.courses?.map(c => (
              <option key={c._id} value={c._id}>{c.courseCode} - {c.courseName}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            className="w-full border border-slate-200 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50 text-slate-800 font-semibold"
          >
            <option value="">All Semesters</option>
            {filters?.semesters?.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
        {(selectedCourse || selectedSemester) && (
          <button
            onClick={() => { setSelectedCourse(''); setSelectedSemester(''); }}
            className="text-xs text-teal-600 hover:text-teal-700 font-bold hover:underline cursor-pointer py-2 px-3 rounded-md hover:bg-teal-50 shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: Users,       bg: 'bg-teal-50',   text: 'text-teal-600',  label: 'Total Students',     value: counts?.totalStudents },
          { icon: Clock,       bg: 'bg-amber-50',  text: 'text-amber-600', label: 'Pending Students',   value: counts?.totalPendingStudents, link: '/principal/pending-students' },
          { icon: FileText,    bg: 'bg-blue-50',   text: 'text-blue-600',  label: 'Submitted Sheets',   value: counts?.totalSubmitted },
          { icon: CheckCircle, bg: 'bg-green-50',  text: 'text-green-600', label: 'Evaluated Records',  value: counts?.totalEvaluated },
        ].map(({ icon: Icon, bg, text, label, value, link }) => (
          <div key={label} className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative group">
            <div className="flex items-center gap-4">
              <div className={`p-3 ${bg} ${text} rounded-md`}><Icon className="h-6 w-6" /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{value ?? 0}</h3>
              </div>
            </div>
            {link && (
              <Link to={link} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold uppercase tracking-wider">
                View All
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column Chart — Subject-wise breakdown */}
        <div className="lg:col-span-8 bg-white p-6 rounded-md border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Lab Evaluation & Submission Progress</h3>
            <p className="text-slate-500 text-xs mt-1">Subject-wise column chart — Evaluated · Submitted · Pending</p>
          </div>

          {!chartData || chartData.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No assignment records match this filter.</p>
            </div>
          ) : (
            <ColumnChart chartData={chartData} />
          )}
        </div>

        {/* Right column — Donut + Pie */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Donut — Evaluation Rate only (% of sheets fully graded) */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col items-center gap-4">
            <div className="w-full">
              <h3 className="text-base font-bold text-slate-900">Evaluation Rate</h3>
              <p className="text-slate-500 text-xs mt-0.5">% of total sheets fully graded</p>
            </div>
            <DonutChart pct={evalPct} label="Graded" color="#0d9488" size={140} stroke={14} />
            <div className="w-full bg-slate-50 rounded-md border border-slate-100 p-3 text-xs space-y-1.5">
              {[
                { label: 'Graded Sheets',  value: totalEvaluated, color: 'text-teal-700' },
                { label: 'Total Sheets',   value: totalSheets,    color: 'text-slate-700' },
                { label: 'Still Pending',  value: totalSheets - totalEvaluated, color: 'text-amber-600' },
              ].map(r => (
                <div key={r.label} className="flex justify-between font-medium">
                  <span className="text-slate-500">{r.label}:</span>
                  <span className={`font-bold ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Segmented Ring — Submission Pipeline (different metric from donut above) */}
          {/* Donut above = evaluation rate. This ring = where each sheet stands in the pipeline */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col items-center gap-4">
            <div className="w-full">
              <h3 className="text-base font-bold text-slate-900">Submission Pipeline</h3>
              <p className="text-slate-500 text-xs mt-0.5">Stage each sheet is currently in</p>
            </div>
            <SegmentedRing segments={ringSegments} size={140} stroke={16} />
            {/* Legend with individual percentages */}
            <div className="w-full space-y-2">
              {ringSegments.map(seg => {
                const pct = totalSheets > 0 ? Math.round((seg.value / totalSheets) * 100) : 0;
                return (
                  <div key={seg.label} className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: seg.color }} />
                      {seg.label}
                    </span>
                    <span className="text-slate-800">
                      {seg.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

/* ─── Shell with sidebar ─── */
const PrincipalDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarExpanded(false);
      } else {
        setIsSidebarExpanded(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/principal', icon: Users },
    { name: 'Pending Students', path: '/principal/pending-students', icon: Clock },
    { name: 'College Records', path: '/principal/records', icon: FileText },
    { name: 'Notifications', path: '/principal/circulars', icon: Bell },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarExpanded ? 'w-64' : 'w-20'
        } bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-50`}
      >
        <div className={`p-4 flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} border-b border-slate-100`}>
          {isSidebarExpanded && (
            <div>
              <h2 className="text-xl font-bold text-teal-600 truncate">Principal Portal</h2>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">AKNU Digitization Hub</p>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none"
            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto elegant-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.path === '/principal'
              ? location.pathname === '/principal'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                title={!isSidebarExpanded ? item.name : ""}
                className={`flex items-center px-3 py-3 rounded-md transition-all group relative ${
                  isActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isSidebarExpanded ? 'space-x-3' : 'justify-center'}`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500 transition-colors'}`} />
                {isSidebarExpanded && <span className="truncate">{item.name}</span>}
                
                {/* Tooltip for collapsed state */}
                {!isSidebarExpanded && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            title={!isSidebarExpanded ? "Logout" : ""}
            className={`flex items-center text-slate-600 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-md hover:bg-red-50 group relative ${isSidebarExpanded ? 'space-x-3' : 'justify-center'}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isSidebarExpanded && <span>Logout</span>}
            
            {/* Tooltip for collapsed state */}
            {!isSidebarExpanded && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-red-600 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                Logout
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<PrincipalDashboardStats />} />
          <Route path="/pending-students" element={<PendingStudents />} />
          <Route path="/records" element={<CollegeRecords />} />
          <Route path="/circulars" element={<Notifications />} />
        </Routes>
      </div>
    </div>
  );
};

export default PrincipalDashboard;
