import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    name: 'unit-web',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // @codocs [[콘텐츠 원천:읽는 곳]]
    // 단위 테스트는 Notion을 부르지 않고 저장한 fixture를 읽는다.
    env: { CONTENT_SOURCE: 'fixture' },
  },
});
