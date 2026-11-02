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
    // 판정은 위반만 보므로 passes·incomplete·inapplicable은 받지 않는다. 스토리마다 수백 KB 보고가 브라우저와 Node 통신을 막는 것을 줄인다.
    a11y: { test: 'error', options: { resultTypes: ['violations'] } },
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
  beforeEach: () => {
    // axe 같은 afterEach가 실패하면 Storybook이 `pauseAnimations`의 정리를 건너뛰어 멈춤 스타일이 남고 뒤 스토리가 연쇄로 실패한다.
    // 그 스타일은 `animation-play-state: paused !important`를 가진 <head>의 <style>뿐이라 그것만 지운다.
    for (const style of document.head.querySelectorAll('style')) {
      if (style.textContent.includes('animation-play-state: paused !important')) {
        style.remove();
      }
    }
  },
  initialGlobals: { viewport: { value: 'pc', isRotated: false } },
};

export default preview;
