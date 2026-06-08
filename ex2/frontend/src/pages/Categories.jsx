import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Plus, Folder, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = 'http://localhost:5000/api';

export default function Categories() {
  const { categories, fetchCategories, tasks, fetchTasks } = useOutletContext();
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const addCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCategory = {
      name: formData.get('name'),
      color: formData.get('color') || '#6B7280'
    };
    try {
      await axios.post(`${API_URL}/categories`, newCategory);
      fetchCategories();
      e.target.reset();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const confirmDeleteCategory = (id) => {
    setCategoryToDelete(id);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await axios.delete(`${API_URL}/categories/${categoryToDelete}`);
      fetchCategories();
      // Since tasks' categories were modified in the backend, we need to fetch them too
      if (typeof fetchTasks === 'function') {
        fetchTasks();
      }
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      setCategoryToDelete(null);
    }
  };

  // Calculate task counts per category
  const categoriesWithCounts = categories.map(cat => ({
    ...cat,
    count: tasks.filter(t => t.category === cat._id || (t.category && t.category._id === cat._id)).length
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Folder className="text-[#5B4EFF]" /> Categories
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your task categories here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Add New Category Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 h-fit transition-colors">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Add Category</h2>
          <form onSubmit={addCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category Name</label>
              <input name="name" required type="text" placeholder="e.g., Development" className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 focus:border-[#5B4EFF] text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Color (Hex)</label>
              <div className="flex gap-2">
                <input name="color" type="color" defaultValue="#5B4EFF" className="h-9 w-12 rounded cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5 bg-transparent" />
                <input type="text" placeholder="#5B4EFF" className="flex-1 px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4EFF]/20 focus:border-[#5B4EFF] text-sm text-gray-900 dark:text-white" />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#5B4EFF] hover:bg-[#4a3fe0] text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
              <Plus size={16} /> Add Category
            </button>
          </form>
        </div>

        {/* Categories Grid */}
        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoriesWithCounts.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              No categories found. Create one to get started.
            </div>
          ) : (
            categoriesWithCounts.map(cat => (
              <div key={cat._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-start justify-between transition-colors hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color || '#6B7280'}20`, color: cat.color || '#6B7280' }}>
                    <Folder size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{cat.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.count} tasks</p>
                  </div>
                </div>
                <button onClick={() => confirmDeleteCategory(cat._id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={executeDeleteCategory}
        title="Delete Category"
        message="Are you sure you want to delete this category? Tasks with this category will not be deleted, but they will become uncategorized."
        confirmText="Delete Category"
        isDestructive={true}
      />
    </div>
  );
}
