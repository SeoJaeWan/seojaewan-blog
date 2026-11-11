import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { imageConfigDefault } from 'next/dist/shared/lib/image-config.js';
import { mergeConfig } from 'vite';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 앱의 조립 컴포넌트 스토리를 보여 준다.
// 조립은 디자인 시스템 컴포넌트를 조합한 React 컴포넌트라 디자인 시스템과 같은 react-vite 프레임워크로 그린다.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  core: {
    disableTelemetry: true,
  },
  viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(import.meta.dirname, '../src'),
          // 피그마 플러그인이 내보낸 조립 자료(export.json). 스토리의 FigmaFrame이 크기를 읽는다.
          '@figma': path.resolve(import.meta.dirname, '../figma'),
          'server-only': path.resolve(import.meta.dirname, 'server-only.ts'),
          'next/image': path.resolve(import.meta.dirname, 'next-image.ts'),
        },
      },
      // `next/image`는 Next.js 빌드가 채우는 `process.env.__NEXT_IMAGE_OPTS`를 읽는다. Vite에는 `process`가 없으므로 직접 채운다.
      // Storybook에는 Next.js의 이미지 최적화 서버가 없으므로 최적화를 끄고 원본 주소를 그대로 쓴다.
      define: {
        'process.env.__NEXT_IMAGE_OPTS': JSON.stringify({
          ...imageConfigDefault,
          unoptimized: true,
        }),
      },
    });
  },
};

export default config;
