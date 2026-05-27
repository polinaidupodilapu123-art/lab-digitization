import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, BookOpen, School, Database, LogOut, CheckSquare, ClipboardList, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import MasterData from './MasterData';
import Assignments from './Assignments';
import Evaluators from './Evaluators';
import EvaluatedRecords from './EvaluatedRecords';
import Notifications from './Notifications';

const Dashboard = () => {
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
    { name: 'Master Data', path: '/admin', icon: Database },
    { name: 'Assignments', path: '/admin/assignments', icon: CheckSquare },
    { name: 'Evaluators', path: '/admin/evaluators', icon: ClipboardList },
    { name: 'Evaluated Records', path: '/admin/evaluated-records', icon: BookOpen },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
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
              <h2 className="text-xl font-bold text-teal-600 truncate">Admin Panel</h2>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Lab Digitization System</p>
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                title={!isSidebarExpanded ? item.name : ""}
                className={`flex items-center px-3 py-3 rounded-md transition-all group relative ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
          <Route path="/" element={<MasterData />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/evaluators" element={<Evaluators />} />
          <Route path="/evaluated-records" element={<EvaluatedRecords />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
