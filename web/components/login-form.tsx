"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ALA_LEGAL_ASCII = [
  "     _    _        _        _                          _ ",
  "    / \\  | |      / \\      | |    ___  __ _  __ _  __| |",
  "   / _ \\ | |     / _ \\     | |   / _ \\/ _` |/ _` |/ _` |",
  "  / ___ \\| |___ / ___ \\    | |__|  __/ (_| | (_| | (_| |",
  " /_/   \\_\\_____/_/   \\_\\   |_____\\___|\\__, |\\__,_|\\__,_|",
  "                                       |___/            ",
];

const WAVE_ASCII = [
  "                                                                                          ░░░░",
  "                                                                                        ░░░░░░",
  "                                         ░░░░                                          ░░░░░░░",
  "                                       ░░░░░░                            ░░░░         ░░░▓▓░░░",
  "                          ░░░░        ░░░░░░░                          ░░░░░░        ░░▓▓▓▓░░░",
  "                        ░░░░░░       ░░░▓▓░░░              ░░░░       ░░░░░░░       ░░▓▓▓▓▓░░ ",
  "                       ░░░░░░░      ░░▓▓▓▓░░░            ░░░░░░      ░░░▓▓░░░     ░░▓▓▓▓▓░░  ",
  "                      ░░░▓▓░░░     ░░▓▓▓▓▓░░            ░░░░░░░     ░░▓▓▓▓░░░    ░▓▓▓▓▓▓░░   ",
  "                     ░░▓▓▓▓░░░    ░░▓▓▓▓▓░░            ░░░▓▓░░░    ░░▓▓▓▓▓░░    ░▓▓▓▓▓▓░░    ",
  "                    ░░▓▓▓▓▓░░    ░▓▓▓▓▓▓░░            ░░▓▓▓▓░░░   ░░▓▓▓▓▓░░    ▓▓▓▓▓▓░░     ",
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatLoginError = (incoming: string | undefined) => {
    if (!incoming) return "No se pudo iniciar sesión";
    if (incoming === "Invalid credentials" || incoming === "Credenciales inválidas") return "Credenciales inválidas";
    return incoming;
  };

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
        setError(formatLoginError(data.error));
        setIsLoading(false);
        return;
      }

      localStorage.setItem("superwave_token", data.token);
      localStorage.setItem("superwave_user", JSON.stringify(data.user));

      const nextPath = searchParams.get("next") || "/chat";
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-stone-50 px-4">
      <div
        className="pointer-events-none absolute inset-0 hidden select-none items-center justify-center text-blue-200/20 md:flex"
        style={{
          fontFamily: "monospace",
          whiteSpace: "pre",
          lineHeight: 1,
          fontSize: "clamp(0.6rem, 1.2vw, 1rem)",
        }}
      >
        {WAVE_ASCII.join("\n")}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="ascii-banner mb-4 hidden select-none sm:block" aria-label="ALA LEGAL">
          {ALA_LEGAL_ASCII.join("\n")}
        </div>
        <h1 className="mb-2 text-2xl font-bold text-blue-600 sm:hidden" style={{ fontFamily: "monospace" }}>
          ALA LEGAL
        </h1>
        <p className="mb-6 text-sm text-stone-500">Impulsado por OpenClaw</p>

        <div className="glass-card w-full rounded-2xl p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-stone-800" style={{ fontFamily: "monospace" }}>
              Centro de Control del Agente
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Inicia sesión para acceder al chat, pipeline y bandeja.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-blue-200/70 bg-white/95 px-4 py-3 text-stone-800 transition focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                placeholder="admin@alalegal.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-blue-200/70 bg-white/95 px-4 py-3 text-stone-800 transition focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_100%)] py-3 font-medium text-white transition hover:-translate-y-px hover:bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
