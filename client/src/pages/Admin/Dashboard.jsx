import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, BookOpen, School, Database, LogOut, CheckSquare, ClipboardList, Bell, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import MasterData from './MasterData';
import Assignments from './Assignments';
import Evaluators from './Evaluators';
import EvaluatedRecords from './EvaluatedRecords';
import Notifications from './Notifications';
import SessionLogs from './SessionLogs';
import SessionTimer from '../../components/SessionTimer';
import { ShieldAlert } from 'lucide-react';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    { name: 'Master Data', path: '/admin', icon: Database },
    { name: 'Assignments', path: '/admin/assignments', icon: CheckSquare },
    { name: 'Evaluators', path: '/admin/evaluators', icon: ClipboardList },
    { name: 'Evaluated Records', path: '/admin/evaluated-records', icon: BookOpen },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
  ];

  if (user.role === 'SYSTEM_ADMIN') {
    navItems.push({ name: 'Session Logs', path: '/admin/session-logs', icon: ShieldAlert });
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 p-4 shrink-0 z-50">
        <div>
          <h2 className="text-xl font-bold text-teal-600 truncate">Admin Panel</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Lab Digitization System</p>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 transition-colors focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className={`${
          isMobileMenuOpen ? 'flex absolute left-0 right-0 top-[73px] z-50 overflow-y-auto shadow-lg max-h-[calc(100vh-73px)] border-b pb-2 h-auto' : 'hidden md:flex'
        } ${
          isSidebarExpanded ? 'md:w-64' : 'md:w-20'
        } bg-white md:border-b-0 md:border-r border-slate-200 flex-col flex-shrink-0 transition-all duration-300 ease-in-out md:h-full md:relative md:pb-0 md:shadow-none`}
      >
        <div className={`hidden md:flex p-4 items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} border-b border-slate-100`}>
          <div className={`${!isSidebarExpanded ? 'hidden' : 'block'}`}>
            <h2 className="text-xl font-bold text-teal-600 truncate">Admin Panel</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Lab Digitization System</p>
          </div>
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="hidden md:block p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none"
            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto elegant-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-3 py-3 rounded-md transition-all group relative ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isSidebarExpanded || isMobileMenuOpen ? 'space-x-3' : 'justify-center'}`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500 transition-colors'}`} />
                <span className={`${!isSidebarExpanded ? 'inline md:hidden' : 'inline'} truncate ml-3 md:ml-0 ${isSidebarExpanded ? 'md:ml-3' : ''}`}>{item.name}</span>
                
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
            className={`flex items-center text-slate-600 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-md hover:bg-red-50 group relative ${isSidebarExpanded ? 'space-x-3' : 'justify-center md:justify-center'} ${!isSidebarExpanded ? 'md:justify-center justify-start' : ''}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className={`${!isSidebarExpanded ? 'inline md:hidden' : 'inline'} ml-3 md:ml-0 ${isSidebarExpanded ? 'md:ml-3' : ''}`}>Logout</span>
            
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
      <div className="flex-1 min-w-0 relative overflow-y-auto md:overflow-y-auto flex flex-col w-full">
        <div className="absolute top-2 right-4 md:top-8 md:right-6 z-40 hidden md:block">
          <SessionTimer />
        </div>
        <Routes>
          <Route path="/" element={<MasterData />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/evaluators" element={<Evaluators />} />
          <Route path="/evaluated-records" element={<EvaluatedRecords />} />
          <Route path="/notifications" element={<Notifications />} />
          {user.role === 'SYSTEM_ADMIN' && (
            <Route path="/session-logs" element={<SessionLogs />} />
          )}
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
