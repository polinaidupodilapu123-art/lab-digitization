import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Download, Search } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import * as XLSX from 'xlsx';

const SessionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/session-logs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setLogs(res.data);
      } catch (err) {
        console.error('Failed to load session logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleExport = () => {
    const exportData = filteredLogs.map(log => ({
      'Username / ID': log.userId?.regdNo || log.userId?.email || 'N/A',
      'Name': log.userId?.fullName || 'N/A',
      'Role': log.userId?.role || 'N/A',
      'Login Date/Time': new Date(log.loginTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      'Logout Date/Time': log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active',
      'Session Duration (Mins)': log.durationMinutes || '-',
      'System IP': log.ipAddress || 'Unknown',
      'Location / User Agent': log.userAgent || 'Unknown'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Session Logs");
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    XLSX.writeFile(workbook, `Session_Logs_${formattedDate}.xlsx`);
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const name = (log.userId?.fullName || '').toLowerCase();
    const regdNo = (log.userId?.regdNo || '').toLowerCase();
    const role = (log.userId?.role || '').toLowerCase();
    return name.includes(term) || regdNo.includes(term) || role.includes(term);
  });

  return (
    <div className="p-4 sm:p-6 bg-slate-50 w-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ShieldAlert className="w-7 h-7 mr-3 text-teal-600" />
            System Session Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track user login, logout, and session duration across the system.</p>
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
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="w-full relative sleek-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-semibold shadow-sm">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">User Details</th>
                <th className="px-6 py-4 whitespace-nowrap">Role</th>
                <th className="px-6 py-4 whitespace-nowrap">Login Time</th>
                <th className="px-6 py-4 whitespace-nowrap">Logout Time</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Duration (Mins)</th>
                <th className="px-6 py-4 whitespace-nowrap">System IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading logs...</td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{log.userId?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{log.userId?.regdNo || log.userId?.email}</div>
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
                      {log.durationMinutes !== null ? log.durationMinutes : '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600 font-mono text-xs">
                      {log.ipAddress || 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No session logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SessionLogs;
