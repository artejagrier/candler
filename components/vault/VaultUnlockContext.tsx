"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  remainingUnlockMsFromStatus,
  type VaultUnlockStatusPayload,
} from "@/lib/vault/unlock-timer";

type VaultUnlockContextValue = {
  unlocked: boolean;
  remainingMs: number;
  expiresAt: number | null;
  ready: boolean;
  refresh: () => Promise<void>;
  applyGrant: (expiresAt: number, serverNow?: number) => void;
  lockNow: () => Promise<void>;
};

const VaultUnlockContext = createContext<VaultUnlockContextValue | null>(null);

const lockedStatus = (serverNow = Date.now()): VaultUnlockStatusPayload => ({
  unlocked: false,
  expiresAt: null,
  remainingSeconds: 0,
  serverNow,
  ttlSeconds: 300,
});

export function VaultUnlockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultUnlockStatusPayload | null>(null);
  const [capturedClientNow, setCapturedClientNow] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const requestId = useRef(0);

  const applyStatus = useCallback((next: VaultUnlockStatusPayload) => {
    setCapturedClientNow(Date.now());
    setNow(Date.now());
    setStatus(next);
  }, []);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const response = await fetch("/api/vault/unlock", { cache: "no-store" });
      if (id !== requestId.current) return;
      if (!response.ok) {
        applyStatus(lockedStatus());
        return;
      }
      const body = await response.json() as VaultUnlockStatusPayload;
      applyStatus({
        unlocked: Boolean(body.unlocked && body.expiresAt),
        expiresAt: typeof body.expiresAt === "number" ? body.expiresAt : null,
        remainingSeconds: Math.max(0, Number(body.remainingSeconds) || 0),
        serverNow: typeof body.serverNow === "number" ? body.serverNow : Date.now(),
        ttlSeconds: typeof body.ttlSeconds === "number" ? body.ttlSeconds : 300,
      });
    } catch {
      if (id !== requestId.current) return;
      applyStatus(lockedStatus());
    } finally {
      if (id === requestId.current) setReady(true);
    }
  }, [applyStatus]);

  const applyGrant = useCallback((expiresAt: number, serverNow = Date.now()) => {
    requestId.current += 1;
    applyStatus({
      unlocked: expiresAt * 1000 > Date.now(),
      expiresAt,
      remainingSeconds: Math.max(0, expiresAt - Math.floor(serverNow / 1000)),
      serverNow,
      ttlSeconds: 300,
    });
    setReady(true);
  }, [applyStatus]);

  const lockNow = useCallback(async () => {
    requestId.current += 1;
    applyStatus(lockedStatus());
    setReady(true);
    try {
      await fetch("/api/vault/unlock", { method: "DELETE", cache: "no-store" });
    } catch {
      /* cookie clear is best-effort; UI is already locked */
    }
    await refresh();
  }, [applyStatus, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const sync = window.setInterval(() => { void refresh(); }, 20_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(sync);
    };
  }, [refresh]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, []);

  const remainingMs = status
    ? remainingUnlockMsFromStatus(status, capturedClientNow, now)
    : 0;
  const unlocked = Boolean(status?.unlocked && remainingMs > 0);

  useEffect(() => {
    if (status?.unlocked && remainingMs <= 0) {
      setStatus((current) => current ? { ...current, unlocked: false, expiresAt: null, remainingSeconds: 0 } : current);
    }
  }, [remainingMs, status?.unlocked]);

  const value = useMemo<VaultUnlockContextValue>(() => ({
    unlocked,
    remainingMs: unlocked ? remainingMs : 0,
    expiresAt: unlocked ? status?.expiresAt ?? null : null,
    ready,
    refresh,
    applyGrant,
    lockNow,
  }), [unlocked, remainingMs, status?.expiresAt, ready, refresh, applyGrant, lockNow]);

  return <VaultUnlockContext.Provider value={value}>{children}</VaultUnlockContext.Provider>;
}

export function useVaultUnlock() {
  const value = useContext(VaultUnlockContext);
  if (!value) {
    return {
      unlocked: false,
      remainingMs: 0,
      expiresAt: null,
      ready: true,
      refresh: async () => undefined,
      applyGrant: () => undefined,
      lockNow: async () => undefined,
    } satisfies VaultUnlockContextValue;
  }
  return value;
}

export function useHideSecretsOnVaultLock<T>(clear: () => void, revealed: T) {
  const { unlocked, ready } = useVaultUnlock();
  const hadSecrets = useRef(false);
  useEffect(() => {
    const present = Array.isArray(revealed)
      ? revealed.length > 0
      : Boolean(revealed) && (typeof revealed !== "object" || Object.keys(revealed as object).length > 0);
    if (present) hadSecrets.current = true;
    if (ready && hadSecrets.current && !unlocked) {
      hadSecrets.current = false;
      clear();
    }
  }, [clear, ready, revealed, unlocked]);
}
