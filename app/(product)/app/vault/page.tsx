import { PageHeader } from "@/components/product/PageHeader";
import { VaultClient } from "@/components/vault/VaultClient";
import { getWorkspaceData } from "@/lib/data/queries";import { isSupabaseConfigured } from "@/lib/env";
export default async function VaultPage() { const data=isSupabaseConfigured?await getWorkspaceData():null;return <><PageHeader eyebrow="Candler Vault" title="Secrets, understood." description="Credentials organized by project, environment, and service—encrypted before persistence."/><VaultClient secrets={(data?.secrets??[]) as never[]} projects={(data?.projects??[]) as never[]}/></>; }
