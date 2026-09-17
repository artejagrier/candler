import { VaultUnlockProvider } from "@/components/vault/VaultUnlockContext";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <VaultUnlockProvider>{children}</VaultUnlockProvider>;
}
