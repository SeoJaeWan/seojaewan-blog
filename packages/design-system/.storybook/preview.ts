import './preview.css';

import type { Preview } from '@storybook/react-vite';
import { configure } from 'storybook/test';

import { BREAKPOINTS } from '../src/token-names';

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// axe 위반을 스토리 테스트 실패로 본다.
// CI 부하에서 닫힘 애니메이션과 lazy 조각이 기본 한도(1초)를 넘길 수 있다. 조건을 기다리는 시간의 상한만 늘린다.
configure({ asyncUtilTimeout: 5000 });

const preview: Preview = {
  parameters: {
    layout: 'centered',
    a11y: { test: 'error' },
    // addon-vitest의 기본 화면(1200×900)은 노트북 구간이라 PC 구간의 가장 작은 크기를 기본으로 둔다.
    viewport: {
      options: {
        pc: {
          name: 'PC',
          styles: {
            width: `${String(BREAKPOINTS.laptopWidth)}px`,
            height: `${String(BREAKPOINTS.laptopHeight)}px`,
          },
          type: 'desktop',
        },
      },
    },
  },
  initialGlobals: { viewport: { value: 'pc', isRotated: false } },
};

export default preview;
