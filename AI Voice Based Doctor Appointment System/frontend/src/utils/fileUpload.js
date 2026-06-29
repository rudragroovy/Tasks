import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function isImageFile(file) {
  return String(file?.type || '').toLowerCase().startsWith('image/');
}

export async function uploadFileToS3(file, context = 'general') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('context', context);

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const { data } = await axios.post(`${API_URL}/api/uploads/single`, formData, { headers });
  return data;
}
