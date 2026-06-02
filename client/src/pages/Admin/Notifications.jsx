import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, FileText, Trash2, Plus, X, Download, Calendar, Search, Edit2 } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

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

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setDate('');
    setNotes('');
    setFile(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleEditClick = (notif) => {
    setEditingId(notif._id);
    setTitle(notif.title);
    setDate(notif.date ? new Date(notif.date).toISOString().split('T')[0] : '');
    setNotes(notif.notes || '');
    setFile(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleAddNotification = async (e) => {
    e.preventDefault();
    if (!title) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (date) formData.append('date', date);
      formData.append('notes', notes);
      if (file) formData.append('file', file);

      const token = localStorage.getItem('token');
      
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/notifications/${editingId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/notifications`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setIsModalOpen(false);
      setTitle('');
      setDate('');
      setNotes('');
      setFile(null);
      setEditingId(null);
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || (editingId ? 'Failed to update circular' : 'Failed to create circular notification'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification circular?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      alert(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const filteredNotifications = notifications.filter(notif => 
    notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notif.notes && notif.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-4 bg-slate-50 w-full animate-fade-in space-y-6">
      
      {/* Header Panel */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-teal-600 animate-pulse" />
            University Notifications & Circulars
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Publish official announcements and upload downloadable B.Ed college circulars.
          </p>
        </div>
      </div>

      {/* Filter and Content Panel */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search announcements by title or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
            />
          </div>
          <div className="text-xs text-slate-500 flex w-full sm:w-auto justify-between sm:justify-end gap-3 items-center font-semibold uppercase tracking-wider ml-auto">
            <span className="truncate">Total: {filteredNotifications.length}</span>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-2 rounded-sm transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer text-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Notification</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Circulars Table */}
        <div className="overflow-x-auto sleek-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 text-base">No Notifications Found</p>
              <p className="text-slate-400 text-sm mt-1">Try refining your search or publish a new circular above.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-700 text-white text-sm font-semibold">
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
                    <td className="px-4 py-2.5 align-middle text-center">
                      <div className="inline-flex items-center gap-2 justify-center">
                        {notif.pdfPath ? (
                          <a
                            href={`${API_BASE_URL}${notif.pdfPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-teal-700   text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No PDF</span>
                        )}
                        <button
                          onClick={() => handleEditClick(notif)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all border border-transparent hover:border-blue-100 cursor-pointer"
                          title="Edit Circular"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(notif._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all border border-transparent hover:border-red-100 cursor-pointer"
                          title="Delete Circular"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-md shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden animate-scaleIn">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-600" />
                {editingId ? 'Edit Official Announcement' : 'Publish Official Announcement'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNotification} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm font-semibold text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Circular Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Ed Second Semester Practical Exams Extended Deadlines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Announcement Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Attach PDF Circular (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="w-full border border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/10 text-slate-600 hover:text-teal-700 rounded-md p-3 flex items-center justify-center gap-2 cursor-pointer transition-all text-sm font-semibold border-2"
                    >
                      <FileText className="h-4.5 w-4.5" />
                      {file ? file.name : 'Choose PDF File'}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail any background notes, exact timelines, guidelines, or summary of updates..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-all cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition-all shadow-md active:scale-95 cursor-pointer text-sm flex items-center gap-2"
                >
                  {loading ? (editingId ? 'Updating...' : 'Publishing...') : (editingId ? 'Save Changes' : 'Publish Announcement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
