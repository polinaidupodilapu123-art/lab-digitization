import axios from 'axios';

/**
 * Secure Axios instance with httpOnly cookie support
 * 
 * Features:
 * - Automatically includes httpOnly cookies with all requests
 * - Handles 401 responses by redirecting to login
 * - Centralized API configuration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include httpOnly cookies with requests
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for handling authentication errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized, redirect to login
    if (error.response && error.response.status === 401) {
      // Clear any remaining session data from localStorage
      localStorage.removeItem('user');
      
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
