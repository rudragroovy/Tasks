// studentService.js — All API calls using Axios
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/students';

export const fetchStudents       = async () => (await axios.get(API_URL)).data.data;
export const fetchStudentById    = async (id) => (await axios.get(`${API_URL}/${id}`)).data.data;
export const fetchStats          = async () => (await axios.get(`${API_URL}/stats`)).data.data;
export const createStudent       = async (data) => (await axios.post(API_URL, data)).data.data;
export const bulkImportStudents  = async (students) => (await axios.post(`${API_URL}/bulk`, { students })).data.data;
export const updateStudent       = async (id, data) => (await axios.put(`${API_URL}/${id}`, data)).data.data;
export const deleteStudent       = async (id) => (await axios.delete(`${API_URL}/${id}`)).data;
