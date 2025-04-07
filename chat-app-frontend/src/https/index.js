import axios from 'axios';

// Ako se aplikacija pokreće na localhost-u, koristi localhost, inače koristi window.location.origin
const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api'
  : `${window.location.origin}/api`;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
