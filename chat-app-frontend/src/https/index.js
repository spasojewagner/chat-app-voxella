
import axios from "axios";

// const token = localStorage.getItem("token");

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:8000",
  withCredentials: true,
  // headers: {
  //   "Content-Type": "application/json",
  //   ...(token && { "Authorization": `Bearer ${token}` }),
  // },
});

