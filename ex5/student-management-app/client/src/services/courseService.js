const API_URL = 'http://localhost:5000/api/courses';

export const fetchCourses = async () => {
  const response = await fetch(API_URL);
  const json = await response.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
};

export const createCourse = async (name) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
};

export const updateCourse = async (id, oldName, newName) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName })
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
};

export const deleteCourse = async (id, name) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
};
