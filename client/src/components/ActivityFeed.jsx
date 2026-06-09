import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Clock, User, X } from 'lucide-react';
import { API_BASE_URL } from '../utils/config';

const ActivityFeed = ({ actionTypes, entityType, onClose, title = "Activity History", refreshTrigger = 0 }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        let url = `${API_BASE_URL}/api/activities?`;
        if (actionTypes) url += `actionType=${actionTypes.join(',')}&`;
        if (entityType) url += `entityType=${entityType}&`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setLogs(res.data.logs || []);
      } catch (err) {
        setError('Failed to load activity logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [actionTypes, entityType, refreshTrigger]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const renderLogMessage = (log) => {
    const { actionType, details, userId } = log;
    const userName = userId?.fullName || 'System';

    if (details?.description) {
      return <span className="text-slate-700 font-medium">{userName}: {details.description}</span>;
    }

    switch (actionType) {
      case 'CREATE_MASTER_DATA':
        return <span className="text-slate-700 font-medium">{userName} created master data for {details?.type}.</span>;
      case 'ALLOCATE_EVALUATOR':
        return <span className="text-slate-700 font-medium">{userName} allocated subjects. ({details?.countAllocated} assignments)</span>;
      case 'REALLOCATE_EVALUATOR':
        return <span className="text-slate-700 font-medium">{userName} reallocated an evaluator.</span>;
      case 'EXTEND_DEADLINE':
        return <span className="text-slate-700 font-medium">{userName} extended a deadline to {details?.valuationDeadline}.</span>;
      case 'EVALUATE_MARKS':
        return <span className="text-slate-700 font-medium">{userName} submitted marks: {details?.score}.</span>;
      case 'SUGGEST_MARKS':
        return <span className="text-slate-700 font-medium">{userName} suggested marks: {details?.suggestedMarks}.</span>;
      case 'UPLOAD_RECORD':
        return <span className="text-slate-700 font-medium">{userName} uploaded a record {details?.subjectName ? `(${details.subjectName})` : ''}.</span>;
      case 'DOWNLOAD_RECORD':
        return <span className="text-slate-700 font-medium">{userName} downloaded a record.</span>;
      case 'EXPORT_EXCEL':
        return <span className="text-slate-700 font-medium">{userName} exported {details?.pageName} to Excel.</span>;
      default:
        return <span className="text-slate-700 font-medium">{userName} performed {actionType}.</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl flex flex-col z-[100] transform transition-transform duration-300 border-l border-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Activity className="h-5 w-5 text-teal-600" />
          <h2>{title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 font-medium">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log._id} className="relative pl-6 border-l-2 border-teal-100 last:border-transparent">
                <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-teal-500 ring-4 ring-white"></div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm shadow-slate-200/50">
                  <div className="mb-1 text-sm">{renderLogMessage(log)}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(log.createdAt)}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {log.userRole}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
