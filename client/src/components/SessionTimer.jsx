import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

const SessionTimer = () => {
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes in seconds
  const navigate = useNavigate();

  useEffect(() => {
    // Validate session with server (checks httpOnly cookie)
    const validateSession = async () => {
      try {
        const response = await axiosInstance.get('/api/auth/me');
        if (response.data && response.data._id) {
          // Session is valid; start timer from now
          setTimeLeft(120 * 60); // Reset to full 120 minutes
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // If session is invalid, auth interceptor will handle redirect
      }
    };

    validateSession();

    // Timer interval: decrement every second
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
      // httpOnly cookie will be automatically sent with this request
      await axiosInstance.post('/api/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    }
    
    // Clear any remaining session data from localStorage (for backwards compatibility)
    // Note: httpOnly cookie is cleared by server automatically
    localStorage.removeItem('user');
    
    navigate('/login');
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
