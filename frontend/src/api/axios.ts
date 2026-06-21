import axios from "axios";

// Use environment variable for API URL, fallback to /api for dev proxy
const baseURL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api";

export const api = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

// Attach access token from localStorage on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// On 401, clear tokens and redirect to login —
// but skip auth endpoints so Login/Signup pages can handle errors themselves.
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const isAuthEndpoint = error.config?.url?.startsWith("/v1/auth/");
        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("authUser");
            window.location.href = "/";
        }
        return Promise.reject(error);
    },
);
