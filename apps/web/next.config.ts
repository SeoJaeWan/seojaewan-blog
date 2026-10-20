import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @codocs [[코드 작성 규칙:React와 Next.js]]
  reactCompiler: true,
  transpilePackages: ['@seojaewan/design-system'],
};

export default nextConfig;
