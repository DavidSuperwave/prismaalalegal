"use client";

import { useEffect, useState, useCallback } from "react";

type WhatsAppStatus =
  | "loading"
  | "not_installed"
  | "qr_ready"
  | "linked"
  | "error"
  | "openclaw_down";

interface StatusResponse {
  status: WhatsAppStatus;
  installed?: boolean;
  linked?: boolean;
  phone?: string;
  qr?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 5000;

export default function WhatsAppLinkPage() {
  const [status, setStatus] = useState<WhatsAppStatus>("loading");
  const [qrData, setQrData] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/status");
      if (!res.ok) {
        setStatus("error");
        setError(`API returned ${res.status}`);
        return;
      }
      const data: StatusResponse = await res.json();
      setStatus(data.status);
      setQrData(data.qr || null);
      setPhone(data.phone || null);
      setError(data.error || null);
      setLastChecked(new Date());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error de conexión");
    }
  }, []);

  const triggerLogin = async () => {
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp/login", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Login trigger failed: ${res.status}`);
      } else {
        // Immediately poll for QR
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Stop polling once linked
  useEffect(() => {
    if (status === "linked") {
      // No need to keep polling
    }
  }, [status]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">
        WhatsApp
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Vincular número de WhatsApp al agente OpenClaw
      </p>

      <div className="mt-8 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface)] p-6">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Consultando estado de WhatsApp...
            </p>
          </div>
        )}

        {status === "openclaw_down" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-2xl">⚠</span>
            </div>
            <p className="text-center text-sm font-medium text-[var(--color-text)]">
              OpenClaw no está disponible
            </p>
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              El servicio OpenClaw no responde. Verifica que el contenedor esté
              corriendo.
            </p>
            <code className="mt-2 rounded bg-[var(--color-surface-offset)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
              docker compose logs -f openclaw
            </code>
          </div>
        )}

        {status === "not_installed" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <span className="text-2xl">📱</span>
            </div>
            <p className="text-center text-sm font-medium text-[var(--color-text)]">
              Canal WhatsApp no instalado
            </p>
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              El plugin de WhatsApp no está configurado en OpenClaw. Instálalo
              desde el panel de OpenClaw o ejecuta:
            </p>
            <code className="mt-2 rounded bg-[var(--color-surface-offset)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
              openclaw channel add whatsapp
            </code>
            <button
              onClick={triggerLogin}
              disabled={loginLoading}
              className="mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loginLoading ? "Iniciando..." : "Intentar conectar"}
            </button>
          </div>
        )}

        {status === "qr_ready" && qrData && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-sm font-medium text-[var(--color-text)]">
              Escanea el código QR con WhatsApp
            </p>
            <div className="rounded-lg border border-[var(--color-divider)] bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrData.startsWith("data:") ? qrData : `data:image/png;base64,${qrData}`}
                alt="WhatsApp QR Code"
                className="h-64 w-64"
              />
            </div>
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Abre WhatsApp en tu teléfono → Menú → Dispositivos vinculados →
              Vincular dispositivo
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Actualizando cada 5 segundos...
            </div>
          </div>
        )}

        {status === "qr_ready" && !qrData && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-sm font-medium text-[var(--color-text)]">
              Generando código QR...
            </p>
            <button
              onClick={triggerLogin}
              disabled={loginLoading}
              className="mt-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loginLoading ? "Solicitando..." : "Solicitar código QR"}
            </button>
          </div>
        )}

        {status === "linked" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-center text-sm font-medium text-[var(--color-text)]">
              WhatsApp vinculado
            </p>
            {phone && (
              <p className="text-center text-lg font-mono text-[var(--color-primary)]">
                {phone}
              </p>
            )}
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              El agente puede enviar y recibir mensajes de WhatsApp.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-2xl">✕</span>
            </div>
            <p className="text-center text-sm font-medium text-[var(--color-text)]">
              Error al consultar estado
            </p>
            {error && (
              <p className="text-center text-xs text-red-400">{error}</p>
            )}
            <button
              onClick={fetchStatus}
              className="mt-2 rounded-lg border border-[var(--color-divider)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-offset)]"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {lastChecked && status !== "loading" && (
        <p className="mt-3 text-center text-xs text-[var(--color-text-faint)]">
          Última consulta: {lastChecked.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
