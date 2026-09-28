import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

export const authApi = axios.create({
  baseURL: `${BACKEND_URL}/auth`,
  withCredentials: true,
});

export function loginUrl() {
  return `${BACKEND_URL}/auth/login`;
}

export async function getAuthStatus() {
  const { data } = await authApi.get('/status');
  return data.isAuthenticated;
}

export async function logout() {
  await authApi.post('/logout');
}

export async function getObjects() {
  const { data } = await api.get('/objects');
  return data;
}

export async function getFields(object) {
  const { data } = await api.get(`/objects/${object}/fields`);
  return data;
}

export async function getRecords(object, offset, limit = 20) {
  const { data } = await api.get(`/objects/${object}/records`, {
    params: { offset, limit },
  });
  return data;
}

export async function createRecord(object, payload) {
  const { data } = await api.post(`/objects/${object}/records`, payload);
  return data;
}

export async function updateRecord(object, id, payload) {
  await api.patch(`/objects/${object}/records/${id}`, payload);
}

export async function deleteRecord(object, id) {
  await api.delete(`/objects/${object}/records/${id}`);
}
