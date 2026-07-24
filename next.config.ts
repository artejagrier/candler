import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray parent lockfile (~/package-lock.json) makes Turbopack misinfer the
  // workspace root. Pin it to this project directory to silence the warning and
  // keep builds deterministic. (Next.js 16: `turbopack` is a top-level option.)
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
