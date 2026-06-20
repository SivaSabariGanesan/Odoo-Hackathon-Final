import { api } from "./axios";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "KITCHEN";
}

export interface AuthResponse {
  success: true;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthResponse["data"]> {
  const { data } = await api.post<AuthResponse>("/v1/auth/login", payload);
  return data.data;
}

export async function signupRequest(payload: SignupPayload): Promise<AuthResponse["data"]> {
  const { data } = await api.post<AuthResponse>("/v1/auth/signup", payload, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await api.post("/v1/auth/logout", { refreshToken });
}
