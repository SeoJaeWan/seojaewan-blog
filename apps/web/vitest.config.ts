import { readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineProject } from 'vitest/config';

// PNG 머리(IHDR)에서 폭과 높이가 놓인 자리(바이트)
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

export default defineProject({
  plugins: [react(), staticPngImport()],
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

/**
 * PNG import를 Next.js처럼 주소와 원본 크기(`{ src, width, height }`)로 준다. Vite는 주소 글자만 주기 때문이다.
 * fixture 모드의 시험 이미지(`content/notion-fixture`)를 읽는 서버 코드가 단위 테스트에서도 Next.js와 같은 값을 받게 한다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @returns Vite 플러그인
 */
function staticPngImport(): Plugin {
  return {
    name: 'static-png-import',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.png')) {
        return null;
      }
      const bytes = readFileSync(id);
      const image = {
        src: `/${path.relative(import.meta.dirname, id)}`,
        width: bytes.readUInt32BE(PNG_WIDTH_OFFSET),
        height: bytes.readUInt32BE(PNG_HEIGHT_OFFSET),
      };
      return `export default ${JSON.stringify(image)};`;
    },
  };
}
