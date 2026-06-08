import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '../utils';
import {
  CheckCircle, ListTodo, Folder, BarChart2, Settings, HelpCircle,
  Sun, Moon, Bell, ChevronDown, Search, Calendar, MoreVertical, Clock, ArrowDown, LayoutDashboard, ListChecks
} from 'lucide-react';

export default function Layout({
  tasks, categories, stats, isDarkMode, setIsDarkMode,
  fetchTasks, fetchCategories
}) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  const chartData = [
    { name: 'Completed', value: stats.completed, color: '#10B981' },
    { name: 'Pending', value: stats.pending, color: '#F59E0B' },
    { name: 'Overdue', value: stats.overdue, color: '#EF4444' }
  ];

  const upcomingTasks = tasks
    .filter(t => t.status !== 'Completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  // Group categories by count based on actual tasks
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: tasks.filter(t => t.category === cat._id || (t.category && t.category._id === cat._id)).length
  }));

  return (
    <div className={cn("min-h-screen flex text-gray-900 font-sans antialiased", isDarkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-50")}>
      {/* Sidebar */}
      <aside className="w-[240px] bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col hidden md:flex shrink-0 h-screen sticky top-0 transition-colors">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B4EFF] to-[#8b5cf6] shadow-md flex items-center justify-center text-white">
            <ListChecks size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">DailyTasks</span>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          <Link to="/" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors", location.pathname === '/' && (!location.search || location.search === '?tab=All') ? "text-[#5B4EFF] bg-indigo-50/80 dark:bg-indigo-900/30" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/my-tasks" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors", location.pathname === '/my-tasks' ? "text-[#5B4EFF] bg-indigo-50/80 dark:bg-indigo-900/30" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")}>
            <ListTodo size={18} /> My Tasks
          </Link>
          <Link to="/completed" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors", location.pathname === '/completed' ? "text-[#5B4EFF] bg-indigo-50/80 dark:bg-indigo-900/30" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")}>
            <CheckCircle size={18} /> Completed
          </Link>
          <Link to="/categories" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors", location.pathname === '/categories' ? "text-[#5B4EFF] bg-indigo-50/80 dark:bg-indigo-900/30" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")}>
            <Folder size={18} /> Categories
          </Link>

        </nav>

        <div className="p-4 mt-auto relative">
          {showHelpMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl p-2 z-20">
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Documentation
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors justify-between">
                <span>Keyboard Shortcuts</span>
                <kbd className="px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded text-[10px] text-gray-400 font-sans">⌘/</kbd>
              </a>
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Contact Support
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Submit Feedback
              </a>
            </div>
          )}
          <button 
            onClick={() => setShowHelpMenu(!showHelpMenu)} 
            className="flex items-center gap-3 px-3 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors w-full justify-between"
          >
            <div className="flex items-center gap-3"><HelpCircle size={18} /> Help & Support</div>
            <ChevronDown size={16} className={cn("transition-transform", showHelpMenu ? "rotate-180" : "")} />
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="h-20 shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-8 z-10 transition-colors">
          <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 w-[480px] max-w-full relative">
            <Search className="text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tasks, categories, or tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none ml-2 w-full text-sm text-gray-700 dark:text-gray-200" 
            />
            <div className="absolute right-2 px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-400 font-medium bg-white dark:bg-gray-800 shadow-sm">⌘K</div>
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-6xl mx-auto w-full">
            <Outlet context={{
              tasks, categories, stats,
              fetchTasks, fetchCategories,
              searchQuery
            }} />
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-[300px] bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 hidden lg:block shrink-0 h-screen overflow-y-auto pt-20 transition-colors">
        <div className="p-6 space-y-8">

          {/* Task Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Task Progress</h3>
            </div>

            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
              </div>
            </div>

            <div className="space-y-2 mt-4 text-xs font-medium text-gray-600 dark:text-gray-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Completed</div>
                <div className="text-gray-400">{stats.completed} ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Pending</div>
                <div className="text-gray-400">{stats.pending} ({stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%)</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Overdue</div>
                <div className="text-gray-400">{stats.overdue} ({stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0}%)</div>
              </div>
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Upcoming Tasks</h3>
            </div>
            <div className="space-y-4">
              {upcomingTasks.length > 0 ? upcomingTasks.map(t => (
                <div key={t._id} className="flex gap-3">
                  <div className="mt-0.5 text-indigo-400"><Clock size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                    <p className="text-xs text-orange-500 mt-0.5">
                      {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No upcoming tasks.</p>
              )}
            </div>
            <Link to="/my-tasks" className="inline-flex items-center gap-1 text-[#5B4EFF] text-xs font-medium mt-4">
              View all upcoming <ArrowDown className="-rotate-90" size={12} />
            </Link>
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Categories</h3>
            </div>
            <div className="space-y-3">
              {categoryCounts.map(cat => (
                <div key={cat._id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-lg" style={{ color: cat.color || '#6B7280' }}>📁</span>
                    {cat.name}
                  </div>
                  <span className="text-xs font-medium text-gray-400">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </aside>

    </div>
  );
}
