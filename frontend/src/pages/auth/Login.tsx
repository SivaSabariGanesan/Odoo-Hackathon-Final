import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Coffee } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";
import { loginRequest } from "../../api/auth";
import { customerLogin } from "../../api/customer-auth";
import { roleHome } from "../../routes/ProtectedRoute";
import { ROUTES } from "../../routes/paths";
import { resolveTable, setSoSession } from "../../api/self-order";

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  // tableToken stored by Splash page in sessionStorage after QR scan
  const tableToken = sessionStorage.getItem("pendingTableToken");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    // 1. Try staff login first
    try {
      const { user, accessToken, refreshToken } = await loginRequest(values);
      setAuth(user, accessToken, refreshToken);
      navigate(roleHome(user.role), { replace: true });
      return;
    } catch (staffErr: any) {
      // If it's not a 401/403, it's a real error — show it
      const status = staffErr?.response?.status;
      if (status !== 401 && status !== 403) {
        setError("root", { message: staffErr?.response?.data?.error?.message ?? "Something went wrong" });
        return;
      }
    }

    // 2. Staff login failed with 401 — try customer login
    try {
      console.log("[Login] Trying customer login...");
      const result = await customerLogin({ email: values.email, password: values.password });
      console.log("[Login] Customer login success:", result.customer.email);
      // Store customer token for self-order pages
      localStorage.setItem("customerToken", result.accessToken);
      localStorage.setItem("customerUser", JSON.stringify(result.customer));
      // Resolve the table session — use the QR token from the URL if present
      const tokenToUse = tableToken ?? null;
      console.log("[Login] tableToken from URL:", tokenToUse);
      if (tokenToUse) {
        try {
          console.log("[Login] Resolving table session...");
          const tableSession = await resolveTable(tokenToUse);
          console.log("[Login] Table session resolved:", tableSession);
          setSoSession({
            tableToken: tokenToUse,
            sessionToken: tableSession.sessionToken,
            tableId: tableSession.tableId,
            tableNumber: tableSession.tableNumber,
          });
        } catch (e) {
          console.warn("[Login] Could not resolve table session:", e);
        }
        // Clear the token so it doesn't persist for future visits
        sessionStorage.removeItem("pendingTableToken");
      }
      console.log("[Login] Navigating to:", ROUTES.PRODUCT_BROWSE);
      navigate(ROUTES.PRODUCT_BROWSE, { replace: true });
    } catch (custErr: any) {
      console.error("[Login] Customer login error:", custErr);
      setError("root", { message: "Invalid email or password" });
    }

  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl p-8 sm:p-10">

        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-[#714B67] p-4 rounded-full">
              <Coffee className="text-white w-7 h-7" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "#121B35" }}>
            Odoo Cafe POS
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Sign in with your staff credentials to continue.
          </p>
        </div>

        {/* Root error */}
        {errors.root && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {errors.root.message}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#121B35] mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              {...register("email")}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#714B67]"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#121B35] mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register("password")}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 outline-none focus:border-[#714B67]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#714B67] text-white py-3 rounded-lg font-semibold hover:bg-[#5d3d55] transition cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>

        </form>

        <p className="text-center mt-6 text-gray-600 text-sm">
          New customer?{" "}
          <Link to="/signup" className="text-[#714B67] font-semibold hover:underline">
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
}
