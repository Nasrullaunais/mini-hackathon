import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Action bodies are capped at 1MB by default and a phone photo is
    // 2-5MB, so a photo upload would fail before our action ever runs. The
    // limit applies to the raw multipart body, so leave headroom above the
    // 5MB cap that z.file() enforces in validations/reports.ts.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // Photos live in the "denguewatch-photos" Blob store (access: public).
    // Without this, next/image refuses to render a Blob URL at all.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
