import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @codocs [[코드 작성 규칙:React와 Next.js]]
  reactCompiler: true,
  // @codocs [[배포 환경:배포(CD)]]
  // Docker 이미지에 서버와 필요한 의존성만 담는다(`apps/web/Dockerfile`).
  output: 'standalone',
  transpilePackages: ['@seojaewan/design-system'],
};

export default nextConfig;
