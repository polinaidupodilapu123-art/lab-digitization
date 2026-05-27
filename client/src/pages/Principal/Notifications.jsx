import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, FileText, Download, Calendar, Search } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`);
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = notifications.filter(notif => 
    notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notif.notes && notif.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="px-4 py-6 w-full space-y-6">
      
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-teal-600 animate-pulse" />
          University Circulars & Announcements
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Stay updated with administrative guidelines, practical scheduling, and digitized evaluation circulars.
        </p>
      </div>

      {/* Announcements Panel */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 w-full border border-slate-200 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white text-slate-800 transition-all font-medium text-sm"
            />
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-auto sm:ml-auto">
            Total Published: {filteredNotifications.length}
          </div>
        </div>

        {/* Circulars Table */}
        <div className="overflow-x-auto sleek-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 text-base">No Notifications Published</p>
              <p className="text-slate-400 text-sm mt-1">No administrative updates or circulars are active at this time.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-700 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-[25%]">Notification Title</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap w-[15%]">Announced Date</th>
                  <th className="px-4 py-3 text-left w-[45%]">Notes</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif, idx) => (
                  <tr key={notif._id} className={`border-b border-slate-100 transition-colors hover:bg-teal-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-4 py-2.5 align-top">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">
                        {notif.title}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                      <span className="p-1.5 px-2.5 bg-teal-50 text-teal-800 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border border-teal-100">
                        <Calendar className="h-3 w-3 text-teal-500" />
                        {new Date(notif.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      {notif.notes ? (
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">
                          {notif.notes}
                        </p>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-middle text-center whitespace-nowrap">
                      {notif.pdfPath ? (
                        <a
                          href={`${API_BASE_URL}${notif.pdfPath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No PDF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};

export default Notifications;
