import React from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskTable from '../components/TaskTable';
import { ListTodo } from 'lucide-react';

export default function MyTasks() {
  const { tasks, stats, fetchTasks, categories, searchQuery } = useOutletContext();
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ListTodo className="text-[#5B4EFF]" /> My Tasks
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage all your pending tasks here.</p>
      </div>

      <TaskTable 
        tasks={tasks} 
        stats={stats} 
        categories={categories}
        fetchTasks={fetchTasks} 
        searchQuery={searchQuery}
        hideTabs={true} 
        defaultTab="Pending" 
      />
    </div>
  );
}
