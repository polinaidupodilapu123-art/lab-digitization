import { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, BookOpen, School, Database, LogOut, CheckSquare, ClipboardList } from 'lucide-react';
import MasterData from './MasterData';
import Assignments from './Assignments';
import Evaluators from './Evaluators';
import EvaluatedRecords from './EvaluatedRecords';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-teal-600">Admin Panel</h2>
          <p className="text-xs text-slate-500 mt-1">Lab Digitization System</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-slate-600 hover:text-red-600 transition-colors w-full px-4 py-2"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
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
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
