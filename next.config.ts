import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/app", permanent: true },
      { source: "/vault", destination: "/app/vault", permanent: true },
      { source: "/projects", destination: "/app/projects", permanent: true },
      { source: "/projects/:id", destination: "/app/projects/:id", permanent: true },
      { source: "/activity", destination: "/app/activity", permanent: true },
      { source: "/settings", destination: "/app/settings", permanent: true },
      { source: "/team", destination: "/app/settings", permanent: true },
      { source: "/integrations", destination: "/app/settings", permanent: true },
    ];
  },
  // A stray parent lockfile (~/package-lock.json) makes Turbopack misinfer the
  // workspace root. Pin it to this project directory to silence the warning and
  // keep builds deterministic. (Next.js 16: `turbopack` is a top-level option.)
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
