import React from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskTable from '../components/TaskTable';
import { CheckCircle } from 'lucide-react';

export default function Completed() {
  const { tasks, stats, fetchTasks, categories, searchQuery } = useOutletContext();
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircle className="text-green-500" /> Completed Tasks
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Review everything you've accomplished.</p>
      </div>

      <TaskTable 
        tasks={tasks} 
        stats={stats} 
        categories={categories}
        fetchTasks={fetchTasks} 
        searchQuery={searchQuery}
        hideTabs={true} 
        defaultTab="Completed" 
      />
    </div>
  );
}
