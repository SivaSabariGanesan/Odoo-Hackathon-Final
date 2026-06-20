import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Coffee } from "lucide-react";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-[#714B67] p-4 rounded-full">
              <Coffee className="text-white w-7 h-7" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-950">
            Create your account
          </h1>

          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Sign up to start using Odoo Cafe POS.
          </p>
        </div>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#121B35] mb-2">
              Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#714B67]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#121B35] mb-2">
              Email / Username
            </label>
            <input
              type="text"
              placeholder="Enter your email or username"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#714B67]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#121B35] mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
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
          </div>

          <button
            type="submit"
            className="w-full bg-[#714B67] text-white py-3 rounded-lg font-semibold hover:bg-[#5d3d55] transition shadow-sm"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?
          <Link
            to="/"
            className="text-[#714B67] font-semibold ml-1 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
