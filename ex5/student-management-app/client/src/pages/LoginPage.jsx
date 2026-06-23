import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-base p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-2xl p-8 shadow-neu-out border border-white/10 text-text-primary">
        <h2 className="text-3xl font-bold mb-6 text-center text-primary-light">Login</h2>
        {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Username</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/20 focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-all shadow-neu-in"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/20 focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-all shadow-neu-in"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full mt-4 p-3 bg-gradient-to-r from-primary to-primary-light hover:brightness-110 text-white font-semibold rounded-xl shadow-neu-out transition-all"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
