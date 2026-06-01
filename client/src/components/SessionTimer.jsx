import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SessionTimer = () => {
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes in seconds
  const navigate = useNavigate();

  useEffect(() => {
    const loginTimeStr = localStorage.getItem('loginTime');
    if (!loginTimeStr) {
      localStorage.setItem('loginTime', new Date().toISOString());
    } else {
      const loginTime = new Date(loginTimeStr);
      const now = new Date();
      const diffSeconds = Math.floor((now - loginTime) / 1000);
      const remaining = (120 * 60) - diffSeconds;
      if (remaining <= 0) {
        handleLogout();
      } else {
        setTimeLeft(remaining);
      }
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    navigate('/login');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) return null;

  const isLowTime = timeLeft < 300; // Less than 5 minutes

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm text-sm font-semibold transition-colors ${
      isLowTime ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'
    }`}>
      <Clock className="w-4 h-4" />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default SessionTimer;
