"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PrismaLogo() {
  return (
    <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-16 w-auto">
      <path d="M30 8L50 48H10L30 8Z" stroke="#818CF8" strokeWidth="2.5" />
      <path d="M30 18L40 40H20L30 18Z" stroke="#A78BFA" strokeWidth="1.5" opacity="0.6" />
      <line x1="30" y1="8" x2="30" y2="48" stroke="url(#loginLogoGrad)" strokeWidth="1" opacity="0.3" />
      <text x="62" y="36" fontFamily="'Space Grotesk', sans-serif" fontWeight="800" fontSize="22" fill="#E8E8ED" letterSpacing="-0.5">Prisma</text>
      <text x="144" y="36" fontFamily="'Space Grotesk', sans-serif" fontWeight="400" fontSize="22" fill="#8888A0" letterSpacing="-0.5">Project</text>
      <defs>
        <linearGradient id="loginLogoGrad" x1="30" y1="8" x2="30" y2="48">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("superwave_token", data.token);
      localStorage.setItem("superwave_user", JSON.stringify(data.user));

      const nextPath = searchParams.get("next") || "/chat";
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#08080A] px-4">
      <div
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(129,140,248,0.06), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <PrismaLogo />
        <p className="mb-6 text-sm text-[#8888A0]">Powered by PrismaProject</p>

        <div className="glass-card w-full rounded-2xl p-8">
          <div className="mb-6 text-center">
            <h2 className="font-display text-lg font-semibold text-[#E8E8ED]">
              Legal Agent Control Center
            </h2>
            <p className="mt-2 text-sm text-[#8888A0]">
              Sign in to access your chat, pipeline, and inbox.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-[#F87171]/20 bg-[#F87171]/10 p-3 text-sm text-[#F87171]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#E8E8ED]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-[#333340] bg-[#08080A] px-4 py-3 text-[#E8E8ED] transition placeholder:text-[#55556A] focus:border-[#818CF8] focus:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]"
                placeholder="admin@yourfirm.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#E8E8ED]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-[#333340] bg-[#08080A] px-4 py-3 text-[#E8E8ED] transition placeholder:text-[#55556A] focus:border-[#818CF8] focus:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#818CF8] py-3 font-medium text-[#08080A] transition hover:-translate-y-px hover:bg-[#6366F1] hover:shadow-[0_4px_12px_rgba(129,140,248,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
