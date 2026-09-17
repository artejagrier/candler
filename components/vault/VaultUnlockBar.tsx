"use client";

import { Lock, Unlock } from "lucide-react";
import { useVaultUnlock } from "@/components/vault/VaultUnlockContext";
import {
  formatUnlockCountdown,
  isUnlockEndingSoon,
  unlockProgressPercent,
} from "@/lib/vault/unlock-timer";

export function VaultUnlockBar() {
  const { unlocked, remainingMs, ready, lockNow } = useVaultUnlock();
  const ending = isUnlockEndingSoon(remainingMs);
  const countdown = formatUnlockCountdown(remainingMs);
  const progress = unlockProgressPercent(remainingMs);
  const label = !ready
    ? "Checking Vault lock"
    : unlocked
      ? `Vault unlocked. ${countdown} remaining`
      : "Vault locked";

  return (
    <div
      className="vault-unlock-bar"
      data-state={unlocked ? "unlocked" : "locked"}
      data-ending={ending ? "true" : undefined}
      aria-label={label}
    >
      <div className="vault-unlock-row">
        {unlocked ? <Unlock aria-hidden="true" /> : <Lock aria-hidden="true" />}
        <p className="vault-unlock-status" aria-live="polite">
          {unlocked ? <>Vault unlocked · <span className="vault-unlock-time">{countdown}</span></> : "Vault locked"}
        </p>
        {unlocked ? (
          <button type="button" className="vault-unlock-lock" onClick={() => void lockNow()} aria-label="Lock Vault now">
            Lock Now
          </button>
        ) : null}
      </div>
      {unlocked ? (
        <div className="vault-unlock-rail candler-system-rail" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      ) : (
        <div className="vault-unlock-rail vault-unlock-rail--locked" aria-hidden="true" />
      )}
    </div>
  );
}
