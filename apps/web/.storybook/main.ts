import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { mergeConfig } from 'vite';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 앱의 조립 컴포넌트 스토리를 보여 주고, 피그마 캡처 도구가 조립 스토리를 찍는다.
// 조립은 디자인 시스템 컴포넌트를 조합한 React 컴포넌트라 디자인 시스템과 같은 react-vite 프레임워크로 그린다.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
  },
  viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      resolve: { alias: { '@': path.resolve(import.meta.dirname, '../src') } },
    });
  },
};

export default config;
