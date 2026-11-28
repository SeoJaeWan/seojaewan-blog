import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import type { CDPSession, Page } from 'playwright';
import { defineProject } from 'vitest/config';
import type { BrowserCommandContext } from 'vitest/node';

/** 페이지마다 하나의 CDP 연결. 강제로 켠 상태는 연결이 살아 있는 동안만 남는다 */
const cdpSessions = new WeakMap<Page, CDPSession>();

/**
 * 선택자에 맞는 요소에 의사 클래스(hover, active, focus-visible 등)를 강제로 켠다(CDP `CSS.forcePseudoState`).
 * 시험은 iframe 안에서 돌므로 iframe 문서까지 찾는다. 빈 목록을 넘기면 끈다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param context 브라우저 명령 문맥
 * @param context.page 시험이 도는 Playwright 페이지
 * @param selector 요소 선택자
 * @param pseudoClasses 켤 의사 클래스
 * @returns 상태를 켠 요소 수
 */
async function forcePseudoState(
  { page }: BrowserCommandContext,
  selector: string,
  pseudoClasses: readonly string[],
): Promise<number> {
  let session = cdpSessions.get(page);
  if (session === undefined) {
    session = await page.context().newCDPSession(page);
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    cdpSessions.set(page, session);
  }
  const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
  const documents: number[] = [];
  const pending = [root];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.nodeName === '#document') {
      documents.push(node.nodeId);
    }
    pending.push(...(node.children ?? []));
    if (node.contentDocument !== undefined) {
      pending.push(node.contentDocument);
    }
  }
  let count = 0;
  for (const nodeId of documents) {
    const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId, selector });
    for (const id of nodeIds) {
      await session.send('CSS.forcePseudoState', {
        nodeId: id,
        forcedPseudoClasses: [...pseudoClasses],
      });
      count += 1;
    }
  }
  return count;
}

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 스토리를 실제 Chromium에서 그려 play와 axe 검사를 돌린다. jsdom 단위 테스트(vitest.config.ts)와 나눈다.
export default defineProject({
  // 첫 스토리가 무거운 모듈을 받느라 15초 제한을 넘기지 않게 미리 묶어 둔다.
  optimizeDeps: { include: ['react-dom/client', '@storybook/addon-a11y > axe-core'] },
  plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
  test: {
    name: 'storybook-design-system',
    // @codocs [[디자인 시스템:생성 결과 검증]]
    // 생성한 스토리(`*.gen.stories.tsx`)마다 레이어별 피그마 값과 브라우저 값을 견준다.
    setupFiles: ['./src/figma-parity/parity-setup.ts'],
    browser: {
      // 스토리 기본 화면(`pc`, `BREAKPOINTS`의 노트북 경계값)과 같게 두어 파일마다 화면 크기를 두 번 바꾸지 않게 한다.
      // 확장자 없는 import를 Vite 설정 로더가 경고하므로 값을 직접 적는다.
      viewport: { width: 1600, height: 900 },
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      commands: { forcePseudoState },
    },
  },
});
