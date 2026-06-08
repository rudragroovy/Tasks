import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import MyTasks from './pages/MyTasks';
import Completed from './pages/Completed';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
      calculateStats(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);



  const calculateStats = (tasksData) => {
    const total = tasksData.length;
    const completed = tasksData.filter(t => t.status === 'Completed').length;
    const pending = tasksData.filter(t => t.status === 'Pending' || t.status === 'Not Started').length;
    const overdue = tasksData.filter(t => t.status === 'Overdue').length;
    setStats({ total, completed, pending, overdue });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout 
          tasks={tasks} 
          categories={categories} 
          stats={stats}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          fetchTasks={fetchTasks}
          fetchCategories={fetchCategories}
        />}>
          <Route index element={<Dashboard />} />
          <Route path="categories" element={<Categories />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="completed" element={<Completed />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
