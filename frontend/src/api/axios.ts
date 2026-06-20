import axios from "axios";

export const api = axios.create({
    baseURL: "/api",
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

// On 401, clear tokens and redirect to login
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/";
        }
        return Promise.reject(error);
    },
);
