import './preview.css';

import type { Preview } from '@storybook/react-vite';

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// axe 위반을 스토리 테스트 실패로 본다.
const preview: Preview = {
  parameters: {
    layout: 'centered',
    a11y: { test: 'error' },
  },
};

export default preview;
