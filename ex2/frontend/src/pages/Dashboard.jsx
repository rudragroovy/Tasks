import React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import TaskTable from '../components/TaskTable';
import { 
  CheckCircle, Clock, AlertCircle, Plus, ChevronDown, ChevronUp, ListTodo
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Dashboard() {
  const { tasks, categories, stats, fetchTasks, searchQuery } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'All';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const addTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newTask = {
      title: formData.get('title'),
      priority: formData.get('priority'),
      dueDate: formData.get('dueDate') || new Date(),
      category: formData.get('category') || undefined
    };
    try {
      await axios.post(`${API_URL}/tasks`, newTask);
      fetchTasks();
      e.target.reset();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Tasks</p>
            <p className="text-[28px] font-bold text-gray-900 dark:text-white leading-tight">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1">All time tasks</p>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-[#5B4EFF] rounded-lg"><ListTodo size={24} strokeWidth={2} /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Completed</p>
            <p className="text-[28px] font-bold text-gray-900 dark:text-white leading-tight">{stats.completed}</p>
            <p className="text-xs text-green-500 font-medium mt-1">{stats.total > 0 ? ((stats.completed/stats.total)*100).toFixed(1) : 0}% of total</p>
          </div>
          <div className="p-2.5 bg-green-50 dark:bg-green-900/30 text-green-500 rounded-lg"><CheckCircle size={24} strokeWidth={2} /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Pending</p>
            <p className="text-[28px] font-bold text-gray-900 dark:text-white leading-tight">{stats.pending}</p>
            <p className="text-xs text-orange-500 font-medium mt-1">{stats.total > 0 ? ((stats.pending/stats.total)*100).toFixed(1) : 0}% of total</p>
          </div>
          <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-400 rounded-lg"><Clock size={24} strokeWidth={2} /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start justify-between transition-colors">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Overdue</p>
            <p className="text-[28px] font-bold text-gray-900 dark:text-white leading-tight">{stats.overdue}</p>
            <p className="text-xs text-red-500 font-medium mt-1">{stats.total > 0 ? ((stats.overdue/stats.total)*100).toFixed(1) : 0}% of total</p>
          </div>
          <div className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-lg"><AlertCircle size={24} strokeWidth={2} /></div>
        </div>
      </div>

      {/* Add Task Form Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-8 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">Add New Task</h2>
          <button className="text-gray-400"><ChevronUp size={20} /></button>
        </div>
        <form onSubmit={addTask} className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Task Title</label>
            <input name="title" required type="text" placeholder="e.g., Finish project proposal" className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 focus:border-[#5B4EFF] text-sm text-gray-900 dark:text-white" />
          </div>
          <div className="w-full lg:w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Priority</label>
            <div className="relative">
              <select name="priority" className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 focus:border-[#5B4EFF] text-sm pl-8 text-gray-900 dark:text-white">
                <option value="Medium" className="dark:bg-gray-800">Medium</option>
                <option value="High" className="dark:bg-gray-800">High</option>
                <option value="Low" className="dark:bg-gray-800">Low</option>
              </select>
              <span className="absolute left-3 top-3 w-2 h-2 rounded-full bg-orange-400"></span>
              <ChevronDown className="absolute right-3 top-2.5 text-gray-400" size={16} />
            </div>
          </div>
          <div className="w-full lg:w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Due Date</label>
            <div className="relative">
              <input name="dueDate" type="date" className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 focus:border-[#5B4EFF] text-sm" />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
            <div className="relative">
              <select name="category" className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 focus:border-[#5B4EFF] text-sm text-gray-700 dark:text-gray-300">
                <option value="" className="dark:bg-gray-800">Select category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id} className="dark:bg-gray-800">{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-gray-400" size={16} />
            </div>
          </div>
          <button type="submit" className="w-full lg:w-auto bg-[#5B4EFF] hover:bg-[#4a3fe0] text-white font-medium px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm whitespace-nowrap">
            Add Task <Plus size={16} />
          </button>
        </form>
      </div>

      <TaskTable 
        tasks={tasks} 
        stats={stats} 
        categories={categories}
        fetchTasks={fetchTasks}
        searchQuery={searchQuery}
        defaultTab={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
