import React, { useState } from 'react';
import axios from 'axios';
import { cn } from '../utils';
import { CheckCircle, Clock, AlertCircle, ChevronDown, Edit2, Trash2, SlidersHorizontal, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const API_URL = 'http://localhost:5000/api';

export default function TaskTable({ tasks, stats, categories = [], fetchTasks, searchQuery = '', hideTabs = false, defaultTab = 'All', onTabChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', priority: '', dueDate: '', category: '' });
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Filters & Pagination State
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const currentTab = onTabChange ? defaultTab : activeTab;
  const setTab = (tab) => {
    if (onTabChange) onTabChange(tab);
    else setActiveTab(tab);
    setCurrentPage(1); // Reset page on tab change
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await axios.put(`${API_URL}/tasks/${task._id}`, { status: newStatus });
      if (fetchTasks) fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const toggleTaskExpand = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleSubtaskStatus = async (taskId, subtaskId, currentStatus) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;
    const updatedSubtasks = task.subtasks.map(st => 
      st._id === subtaskId ? { ...st, completed: !currentStatus } : st
    );
    try {
      await axios.put(`${API_URL}/tasks/${taskId}`, { subtasks: updatedSubtasks });
      if (fetchTasks) fetchTasks();
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const startEdit = (task) => {
    setEditingTaskId(task._id);
    setEditFormData({
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      category: task.category ? task.category._id : ''
    });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
  };

  const saveEdit = async (e, taskId) => {
    e.preventDefault();
    try {
      const dataToSubmit = { ...editFormData };
      if (!dataToSubmit.category) dataToSubmit.category = null;
      if (!dataToSubmit.dueDate) dataToSubmit.dueDate = null;
      if (!dataToSubmit.priority) dataToSubmit.priority = 'Medium';
      
      await axios.put(`${API_URL}/tasks/${taskId}`, dataToSubmit);
      if (fetchTasks) fetchTasks();
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const confirmDeleteTask = (taskId) => {
    setTaskToDelete(taskId);
  };

  const executeDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await axios.delete(`${API_URL}/tasks/${taskToDelete}`);
      if (fetchTasks) fetchTasks();
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      setTaskToDelete(null);
    }
  };

  let processedTasks = tasks.filter(task => {
    if (currentTab === 'Pending' && task.status === 'Completed') return false;
    if (currentTab === 'Completed' && task.status !== 'Completed') return false;
    
    if (filterCategory !== 'All') {
      const taskCatId = task.category ? (task.category._id || task.category) : null;
      if (taskCatId !== filterCategory) return false;
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const titleMatch = task.title && task.title.toLowerCase().includes(query);
      const descMatch = task.description && task.description.toLowerCase().includes(query);
      const catMatch = task.category && task.category.name && task.category.name.toLowerCase().includes(query);
      if (!titleMatch && !descMatch && !catMatch) return false;
    }
    
    return true;
  });

  processedTasks.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt || b.dueDate || 0) - new Date(a.createdAt || a.dueDate || 0);
    if (sortBy === 'oldest') return new Date(a.createdAt || a.dueDate || 0) - new Date(b.createdAt || b.dueDate || 0);
    if (sortBy === 'priority-high') {
      const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return (p[b.priority] || 0) - (p[a.priority] || 0);
    }
    if (sortBy === 'priority-low') {
      const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return (p[a.priority] || 0) - (p[b.priority] || 0);
    }
    if (sortBy === 'due-date') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedTasks.length / pageSize));
  // Ensure current page is valid after filtering
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const paginatedTasks = processedTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
      {/* Tabs */}
      {!hideTabs && (
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-2">
            <button onClick={() => setTab('All')} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2", currentTab === 'All' ? "bg-indigo-50 dark:bg-indigo-900/30 text-[#5B4EFF]" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700")}>
              All {stats && <span className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-xs">{stats.total}</span>}
            </button>
            <button onClick={() => setTab('Pending')} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2", currentTab === 'Pending' ? "bg-indigo-50 dark:bg-indigo-900/30 text-[#5B4EFF]" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700")}>
              Pending {stats && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{stats.pending}</span>}
            </button>
            <button onClick={() => setTab('Completed')} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2", currentTab === 'Completed' ? "bg-indigo-50 dark:bg-indigo-900/30 text-[#5B4EFF]" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700")}>
              Completed {stats && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{stats.completed}</span>}
            </button>
          </div>
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <SlidersHorizontal size={14} /> Filters <ChevronDown size={14} />
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xl p-4 z-20">
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
                  <select 
                    value={filterCategory} 
                    onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Sort By</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority-high">Priority (High to Low)</option>
                    <option value="priority-low">Priority (Low to Low)</option>
                    <option value="due-date">Due Date</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table Header */}
      <div className="grid grid-cols-[auto_1fr_120px_150px_100px] gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400">
        <div className="w-5 flex justify-center"><input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 w-4 h-4 bg-transparent" /></div>
        <div>Task</div>
        <div>Priority</div>
        <div>Due Date</div>
        <div className="text-right">Actions</div>
      </div>

      {/* Task Rows */}
      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {paginatedTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No tasks found</div>
        ) : paginatedTasks.map(task => {
          const isExpanded = expandedTasks.has(task._id);
          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
          
          return (
            <div key={task._id} className="flex flex-col">
              {editingTaskId === task._id ? (
                <form onSubmit={(e) => saveEdit(e, task._id)} className="grid grid-cols-[auto_1fr_120px_150px_100px] gap-4 px-6 py-4 items-center bg-indigo-50/50 dark:bg-indigo-900/10">
                  <div className="w-5 flex justify-center">
                  </div>
                  <div>
                    <input 
                      type="text" 
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 text-sm mb-2"
                      required
                      placeholder="Task title"
                    />
                    <select 
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <option value="">No Category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select 
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 text-sm"
                    >
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <input 
                      type="date" 
                      value={editFormData.dueDate}
                      onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 text-sm text-gray-700 dark:text-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button type="submit" className="text-green-600 hover:text-green-700 dark:text-green-500"><CheckCircle size={16} /></button>
                    <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-500"><Trash2 size={16} className="rotate-45" /></button>
                  </div>
                </form>
              ) : (
              <div className="grid grid-cols-[auto_1fr_120px_150px_100px] gap-4 px-6 py-4 items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                <div className="w-5 flex justify-center">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className={cn("w-4.5 h-4.5 rounded-[4px] border flex items-center justify-center transition-colors", task.status === 'Completed' ? 'bg-[#5B4EFF] border-[#5B4EFF] text-white' : 'border-gray-300 dark:border-gray-600')}
                  >
                    {task.status === 'Completed' && <CheckCircle size={12} strokeWidth={3} />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {hasSubtasks && (
                    <button onClick={() => toggleTaskExpand(task._id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronDown size={16} className="-rotate-90" />}
                    </button>
                  )}
                  {!hasSubtasks && <div className="w-4"></div>}
                  <div>
                    <p className={cn("text-sm font-medium", task.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100')}>{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.description || (task.category ? task.category.name : "No description")}</p>
                  </div>
                </div>
                <div>
                  {task.priority === 'High' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">High <ArrowUp size={12} /></span>}
                  {task.priority === 'Medium' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">Medium <Minus size={12} /></span>}
                  {task.priority === 'Low' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">Low <ArrowDown size={12} /></span>}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                </div>
                <div className="flex items-center justify-end gap-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(task)} className="hover:text-[#5B4EFF] dark:hover:text-[#6e63ff]"><Edit2 size={16} /></button>
                  <button onClick={() => confirmDeleteTask(task._id)} className="hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
              )}
              
              {/* Subtasks */}
              {isExpanded && hasSubtasks && (
                <div className="bg-gray-50/50 dark:bg-gray-800/30 pl-14 pr-6 py-2 border-t border-gray-50 dark:border-gray-700/50">
                  <div className="space-y-1">
                    {task.subtasks.map(subtask => (
                      <div key={subtask._id} className="flex items-center justify-between py-2 group/sub">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleSubtaskStatus(task._id, subtask._id, subtask.completed)}
                            className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", subtask.completed ? 'bg-[#5B4EFF] border-[#5B4EFF] text-white' : 'border-gray-300 dark:border-gray-600')}
                          >
                            {subtask.completed && <CheckCircle size={10} strokeWidth={3} />}
                          </button>
                          <span className={cn("text-sm", subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>{subtask.title}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                          <button className="hover:text-[#5B4EFF] dark:hover:text-[#6e63ff]"><Edit2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <p>Showing {processedTasks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedTasks.length)} of {processedTasks.length} tasks</p>
        <div className="flex gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &lt;
          </button>
          
          {Array.from({length: totalPages}, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="w-8 h-8 flex items-center justify-center">...</span>}
                <button 
                  onClick={() => setCurrentPage(p)}
                  className={cn("w-8 h-8 flex items-center justify-center rounded transition-colors", currentPage === p ? "bg-[#5B4EFF] text-white font-medium" : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700")}
                >
                  {p}
                </button>
              </React.Fragment>
          ))}

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={executeDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete Task"
        isDestructive={true}
      />
    </div>
  );
}
