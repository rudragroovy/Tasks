import api from './api';

export const fetchLogs = async () => {
  const response = await api.get('/audit');
  return response.data.data;
};
