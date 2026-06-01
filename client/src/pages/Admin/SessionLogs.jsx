import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Download, Search, LayoutList, Users } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import * as XLSX from 'xlsx';

const formatDuration = (seconds) => {
  if (seconds === undefined || seconds === null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const SessionLogs = () => {
  const [activeTab, setActiveTab] = useState('detailed'); // 'detailed' or 'summary'
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const [logsRes, summaryRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/session-logs`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          axios.get(`${API_BASE_URL}/api/admin/session-logs/summary`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        ]);
        setLogs(logsRes.data);
        setSummary(summaryRes.data);
      } catch (err) {
        console.error('Failed to load session logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleExportDetailed = () => {
    const exportData = filteredLogs.map(log => {
      const isPrincipal = log.userId?.role === 'PRINCIPAL';
      const colName = isPrincipal ? (log.userId?.collegeId?.collegeName || 'N/A') : '-';
      const colCode = isPrincipal ? (log.userId?.collegeId?.collegeCode || 'N/A') : '-';
      return {
        'Username / ID': log.userId?.regdNo || log.userId?.email || 'N/A',
        'Name': log.userId?.fullName || 'N/A',
        'Role': log.userId?.role || 'N/A',
        'College Code': colCode,
        'College Name': colName,
        'Login Date/Time': new Date(log.loginTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        'Logout Date/Time': log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active',
        'Session Duration': formatDuration(log.durationSeconds),
        'System IP': log.ipAddress || 'Unknown',
        'Location / User Agent': log.userAgent || 'Unknown'
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detailed Session Logs");
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `Detailed_Session_Logs_${formattedDate}.xlsx`);
  };

  const handleExportSummary = () => {
    const exportData = filteredSummary.map(s => {
      const isPrincipal = s._id?.role === 'PRINCIPAL';
      const colName = isPrincipal ? (s._id?.collegeId?.collegeName || 'N/A') : '-';
      const colCode = isPrincipal ? (s._id?.collegeId?.collegeCode || 'N/A') : '-';
      return {
        'Username / ID': s._id?.regdNo || s._id?.email || 'N/A',
        'Name': s._id?.fullName || 'N/A',
        'Role': s._id?.role || 'N/A',
        'College Code': colCode,
        'College Name': colName,
        'Total Logins': s.totalLogins,
        'Total Active Time': formatDuration(s.totalDurationSeconds),
        'Last Login': s.lastLoginTime ? new Date(s.lastLoginTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "User Summary Logs");
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `Summary_Session_Logs_${formattedDate}.xlsx`);
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const name = (log.userId?.fullName || '').toLowerCase();
    const regdNo = (log.userId?.regdNo || log.userId?.email || '').toLowerCase();
    const role = (log.userId?.role || '').toLowerCase();
    return name.includes(term) || regdNo.includes(term) || role.includes(term);
  });

  const filteredSummary = summary.filter(s => {
    const term = searchTerm.toLowerCase();
    const name = (s._id?.fullName || '').toLowerCase();
    const regdNo = (s._id?.regdNo || s._id?.email || '').toLowerCase();
    const role = (s._id?.role || '').toLowerCase();
    return name.includes(term) || regdNo.includes(term) || role.includes(term);
  });

  return (
    <div className="p-4 sm:p-6 bg-slate-50 w-full animate-fade-in flex-1 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ShieldAlert className="w-7 h-7 mr-3 text-teal-600" />
            System Session Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track user login, logout, and session duration across the system.</p>
        </div>
        
              </div>

      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg mb-4 shrink-0 w-full justify-between">
       <div className="flex space-x-1"> <button
          onClick={() => setActiveTab('detailed')}
          className={`flex cursor-pointer items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'detailed' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <LayoutList className="w-4 h-4 mr-2" />
          Detailed Logs
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex cursor-pointer items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'summary' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          User Summary
        </button>
        </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white w-full sm:w-64"
            />
          </div>
          
          <button
            onClick={activeTab === 'detailed' ? handleExportDetailed : handleExportSummary}
            disabled={(activeTab === 'detailed' && filteredLogs.length === 0) || (activeTab === 'summary' && filteredSummary.length === 0)}
            className="flex items-center cursor-pointer justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="w-full relative sleek-scrollbar overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-semibold shadow-sm">
              {activeTab === 'detailed' ? (
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">User Details</th>
                  <th className="px-6 py-4 whitespace-nowrap">Role</th>
                  <th className="px-6 py-4 whitespace-nowrap">Login Time</th>
                  <th className="px-6 py-4 whitespace-nowrap">Logout Time</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">Duration</th>
                  <th className="px-6 py-4 whitespace-nowrap">System IP</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">User Details</th>
                  <th className="px-6 py-4 whitespace-nowrap">Role</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">Total Logins</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">Total Active Time</th>
                  <th className="px-6 py-4 whitespace-nowrap">Last Login</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'detailed' ? 6 : 5} className="px-6 py-8 text-center text-slate-500">Loading logs...</td>
                </tr>
              ) : activeTab === 'detailed' ? (
                filteredLogs.length > 0 ? (
                  filteredLogs.map(log => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{log.userId?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{log.userId?.regdNo || log.userId?.email}</div>
                        {log.userId?.role === 'PRINCIPAL' && log.userId?.collegeId && (
                          <div className="text-[10px] text-teal-600 mt-0.5 truncate max-w-[200px]" title={log.userId.collegeId.collegeName}>
                            {log.userId.collegeId.collegeCode} - {log.userId.collegeId.collegeName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {log.userId?.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-700">
                        {new Date(log.loginTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-700">
                        {log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : <span className="text-emerald-600 font-medium">Active</span>}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center font-medium text-slate-800">
                        {formatDuration(log.durationSeconds)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-600 font-mono text-xs">
                        {log.ipAddress || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No detailed logs found.</td>
                  </tr>
                )
              ) : (
                filteredSummary.length > 0 ? (
                  filteredSummary.map(s => (
                    <tr key={s._id?._id || Math.random()} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{s._id?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{s._id?.regdNo || s._id?.email}</div>
                        {s._id?.role === 'PRINCIPAL' && s._id?.collegeId && (
                          <div className="text-[10px] text-teal-600 mt-0.5 truncate max-w-[200px]" title={s._id.collegeId.collegeName}>
                            {s._id.collegeId.collegeCode} - {s._id.collegeId.collegeName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {s._id?.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center font-medium text-slate-800">
                        {s.totalLogins}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center font-medium text-slate-800">
                        {formatDuration(s.totalDurationSeconds)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-700">
                        {s.lastLoginTime ? new Date(s.lastLoginTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No user summary data found.</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SessionLogs;
