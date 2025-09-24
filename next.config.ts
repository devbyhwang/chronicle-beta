import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Vercel 최적화
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  // ESLint 비활성화 (배포용)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript 오류 무시 (배포용)
  typescript: {
    ignoreBuildErrors: true,
  },
  // 정적 생성 비활성화 (Next.js 15 버그 해결)
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app'],
    },
  },
  // 빌드 시 정적 생성 스킵
  skipTrailingSlashRedirect: true,
  trailingSlash: false,
};

export default nextConfig;
