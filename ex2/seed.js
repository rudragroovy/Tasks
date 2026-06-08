const API_URL = 'http://localhost:5000/api';

const categories = [
  '6a267def0b1df728726aba98', // Development
  '6a2682163778aa9c4c7c5ff1'  // Games
];

const sampleTasks = [
  {
    title: 'Complete frontend responsive layout',
    description: 'Ensure the layout works perfectly on mobile devices and all the Tailwind utilities are responsive.',
    priority: 'High',
    status: 'Pending',
    category: categories[0],
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  },
  {
    title: 'Level up character to level 50',
    description: 'Grind in the dark forest area to reach the level cap before the new expansion releases.',
    priority: 'Low',
    status: 'Pending',
    category: categories[1],
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
  },
  {
    title: 'Write API documentation',
    description: 'Document all REST endpoints using Swagger or Postman collections.',
    priority: 'Medium',
    status: 'Completed',
    category: categories[0],
    dueDate: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    title: 'Review pull requests',
    description: 'Review pending PRs from the backend team regarding the new authentication flow.',
    priority: 'High',
    status: 'Pending',
    category: categories[0],
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
  },
  {
    title: 'Buy new gaming mouse',
    description: 'The current mouse is double-clicking. Look into the Logitech Superlight.',
    priority: 'Medium',
    status: 'Pending',
    category: categories[1],
  },
  {
    title: 'Fix state management bugs',
    description: 'The global state is not syncing properly between tabs in the dashboard.',
    priority: 'High',
    status: 'Pending',
    category: categories[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
  },
  {
    title: 'Watch the E3 game reveals',
    description: 'Catch up on the latest announcements for upcoming RPGs.',
    priority: 'Low',
    status: 'Completed',
    category: categories[1],
  },
  {
    title: 'Optimize MongoDB queries',
    description: 'Add indexes to the Task collection to speed up the dashboard loading time.',
    priority: 'Medium',
    status: 'Pending',
    category: categories[0],
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  }
];

async function seed() {
  try {
    for (const task of sampleTasks) {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error(await res.text());
      console.log(`Added: ${task.title}`);
    }
    console.log('Seed complete!');
  } catch (error) {
    console.error('Seed error:', error.message);
  }
}

seed();
