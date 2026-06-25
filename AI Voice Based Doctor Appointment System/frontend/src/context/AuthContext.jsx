/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [authModal, setAuthModal] = useState({
    open: false,
    mode: 'login',
    redirectTo: null,
  });

  const fetchMe = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/auth/me');
      setUser(data);
    } catch (error) {
      console.error(error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const timer = setTimeout(() => { fetchMe(); }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [token]);

  const login = async (email, password) => {
    const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const { data } = await axios.post('http://localhost:5000/api/auth/register', userData);
    localStorage.setItem('token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const openAuthModal = useCallback(({ mode = 'login', redirectTo = null } = {}) => {
    const fallbackRedirect =
      redirectTo ||
      `${window.location.pathname || '/'}${window.location.search || ''}`;

    setAuthModal({
      open: true,
      mode: mode === 'register' ? 'register' : 'login',
      redirectTo: fallbackRedirect,
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, open: false }));
  }, []);

  const requireAuth = useCallback(
    (action, options = {}) => {
      if (user) {
        if (typeof action === 'function') action();
        return true;
      }

      openAuthModal({
        mode: options.mode || 'login',
        redirectTo: options.redirectTo,
      });
      return false;
    },
    [openAuthModal, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        authModal,
        setAuthModal,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
