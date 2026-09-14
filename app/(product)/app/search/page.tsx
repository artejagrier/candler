import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { SearchClient } from "@/components/search/SearchClient";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Search" description="Find metadata across Candler. Sensitive values are never indexed." />
      <SearchClient />
    </>
  );
}
