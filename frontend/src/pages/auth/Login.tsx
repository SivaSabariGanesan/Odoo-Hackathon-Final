import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Coffee } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";
import { loginRequest } from "../../api/auth";
import { ROUTES } from "../../routes/paths";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      const { user, accessToken, refreshToken } = await loginRequest(values);
      setAuth(user, accessToken, refreshToken);

      // Route by role
      if (user.role === "ADMIN") navigate(ROUTES.ADMIN_DASHBOARD);
      else if (user.role === "KITCHEN") navigate(ROUTES.KDS);
      else navigate(ROUTES.POS_SESSION);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ?? "Invalid email or password";
      setError("root", { message });
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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#121B35]">Odoo Cafe POS</h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Welcome back! Please login to continue.
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
                {...register("password")}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 outline-none focus:border-[#714B67]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="flex justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="text-[#714B67] hover:underline">
              Forgot Password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#714B67] text-white py-3 rounded-lg font-semibold hover:bg-[#5d3d55] transition cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?
          <Link to="/signup" className="text-[#714B67] font-semibold ml-1 hover:underline">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  );
}
