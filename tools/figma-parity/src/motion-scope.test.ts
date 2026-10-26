import { describe, expect, it } from 'vitest';

import {
  changedClasses,
  changedMotionVariables,
  type FileChange,
  MOTION_CSS_FILE,
  MOTION_STORY_DIR,
  motionStoryHelpers,
  selectMotions,
  TOKENS_CSS_FILE,
} from './motion-scope.ts';

const RING_CSS = `
@utility motion-control-state {
  transition-duration: var(--motion-duration-faster);
}

@keyframes progress-ring-spin {
  from { rotate: 0deg; }
  to { rotate: 720deg; }
}

@utility motion-progress-ring {
  animation: progress-ring-spin var(--motion-duration-progress-ring) var(--motion-easing-point-to-point) infinite;
}

@utility motion-window-open {
  animation-duration: var(--motion-duration-normal);
}
`;

const TOKENS_CSS = `
:root {
  --motion-duration-faster: 83ms;
  --motion-duration-normal: 250ms;
  --motion-duration-progress-ring: 2000ms;
  --motion-easing-point-to-point: cubic-bezier(0.55, 0.55, 0, 1);
  --motion-easing-ring: var(--motion-easing-point-to-point);
}
`;

const knownMotions = new Set(['motion-progress-ring', 'motion-window-open']);

/**
 * 바뀐 파일과 내용으로 범위를 정한다.
 * @param changedFiles 바뀐 파일
 * @param changes 파일 → 기준·지금 내용(없으면 둘 다 RING_CSS·TOKENS_CSS 그대로)
 * @returns 고른 견본 이름
 */
function scope(changedFiles: string[], changes: Record<string, FileChange> = {}): string[] {
  return selectMotions({
    changedFiles,
    motionNames: knownMotions,
    readChange: (file) =>
      changes[file] ??
      (file === MOTION_CSS_FILE
        ? { before: RING_CSS, after: RING_CSS }
        : { before: TOKENS_CSS, after: TOKENS_CSS }),
  }).motions;
}

// @codocs [[피그마 연동:CI]]
describe('CI', () => {
  it('바뀐 figma/motions/<이름>.json의 견본을 검사한다', () => {
    expect(scope(['packages/design-system/figma/motions/motion-window-open.json'])).toEqual([
      'motion-window-open',
    ]);
  });

  it('motion.css를 바뀌기 전·후로 읽어 내용이 달라진 클래스만 검사한다(쓰는 @keyframes 포함)', () => {
    const keyframeChanged = RING_CSS.replace('720deg', '360deg');
    expect(changedClasses(RING_CSS, keyframeChanged)).toEqual(['motion-progress-ring']);
    expect(
      scope([MOTION_CSS_FILE], { [MOTION_CSS_FILE]: { before: RING_CSS, after: keyframeChanged } }),
    ).toEqual(['motion-progress-ring']);
  });

  it('주석이나 공백만 바뀐 클래스는 검사하지 않는다', () => {
    const commented = RING_CSS.replace(
      '@utility motion-window-open {',
      '/* 창 */\n@utility motion-window-open {\n',
    );
    expect(changedClasses(RING_CSS, commented)).toEqual([]);
  });

  it('json이 없는 클래스(상태 전환 등)는 내용이 바뀌어도 검사 대상이 아니다', () => {
    const stateChanged = RING_CSS.replace('--motion-duration-faster', '--motion-duration-fast');
    expect(
      scope([MOTION_CSS_FILE], { [MOTION_CSS_FILE]: { before: RING_CSS, after: stateChanged } }),
    ).toEqual([]);
  });

  it('값이 바뀐 --motion-* 토큰(그 토큰을 가리키는 별칭 포함)을 쓰는 클래스를 검사한다', () => {
    const slower = TOKENS_CSS.replace('cubic-bezier(0.55, 0.55, 0, 1)', 'cubic-bezier(0, 0, 0, 1)');
    expect([...changedMotionVariables(TOKENS_CSS, slower)].sort()).toEqual([
      '--motion-easing-point-to-point',
      '--motion-easing-ring',
    ]);
    expect(
      scope([TOKENS_CSS_FILE], { [TOKENS_CSS_FILE]: { before: TOKENS_CSS, after: slower } }),
    ).toEqual(['motion-progress-ring']);
  });

  it('바뀐 모션 스토리(제목 Motion/<이름>)의 견본을 검사하고, 다른 스토리는 보지 않는다', () => {
    const story = 'packages/design-system/src/motion-story/motion-progress-ring.stories.tsx';
    const other = 'packages/design-system/src/components/button/button.stories.tsx';
    expect(
      scope([story, other], {
        [story]: {
          before: undefined,
          after: "const meta = { title: 'Motion/motion-progress-ring' };",
        },
        [other]: { before: undefined, after: "const meta = { title: 'Components/Button' };" },
      }),
    ).toEqual(['motion-progress-ring']);
  });

  it('모션 검사 도구·워크플로·모션 스토리 도우미가 바뀌면 json이 있는 모든 견본을 검사한다', () => {
    expect(scope(['.github/workflows/motion-check.yml'])).toEqual([...knownMotions].sort());
    expect(scope(['tools/figma-parity/src/motion-compare.ts'])).toEqual([...knownMotions].sort());
    expect(scope(['packages/design-system/src/motion-story/motion-preview.tsx'])).toEqual(
      [...knownMotions].sort(),
    );
  });

  it('바뀐 모션 스토리 도우미는 import를 따라가 그 도우미를 쓰는 모션 스토리의 견본만 검사한다', () => {
    const files = new Map([
      [
        `${MOTION_STORY_DIR}motion-window-open.stories.tsx`,
        "import { SampleWindow } from './sample-window';\nexport default { title: 'Motion/motion-window-open' };",
      ],
      [
        `${MOTION_STORY_DIR}motion-progress-ring.stories.tsx`,
        "import { ProgressRing } from '../components/progress-ring/progress-ring';\nexport default { title: 'Motion/motion-progress-ring' };",
      ],
      [`${MOTION_STORY_DIR}sample-window.tsx`, "import { frame } from './sample-frame';"],
      [`${MOTION_STORY_DIR}sample-frame.tsx`, 'export const frame = 1;'],
      [`${MOTION_STORY_DIR}sample-unused.tsx`, 'export const unused = 1;'],
    ]);
    expect(motionStoryHelpers(files).get('motion-window-open')).toEqual(
      new Set([
        `${MOTION_STORY_DIR}motion-window-open.stories.tsx`,
        `${MOTION_STORY_DIR}sample-window.tsx`,
        `${MOTION_STORY_DIR}sample-frame.tsx`,
      ]),
    );
    /**
     * 도우미 파일이 바뀌었을 때 범위를 정한다.
     * @param file 바뀐 파일
     * @returns 고른 견본 이름
     */
    function helperScope(file: string): string[] {
      return selectMotions({
        changedFiles: [file],
        motionNames: knownMotions,
        motionStoryFiles: files,
        readChange: () => ({ before: '', after: '' }),
      }).motions;
    }
    // 도우미가 import하는 도우미가 바뀌어도 따라간다
    expect(helperScope(`${MOTION_STORY_DIR}sample-frame.tsx`)).toEqual(['motion-window-open']);
    // 쓰는 모션 스토리를 정하지 못하면(지운 파일, 쓰지 않는 파일) 전체다
    expect(helperScope(`${MOTION_STORY_DIR}sample-unused.tsx`)).toEqual([...knownMotions].sort());
    expect(helperScope(`${MOTION_STORY_DIR}sample-removed.tsx`)).toEqual([...knownMotions].sort());
  });

  it('모션과 관계없는 파일과 테스트 파일만 바뀌면 범위가 없다', () => {
    expect(
      scope([
        '.codocs/development/figma-sync.yaml',
        'packages/design-system/src/components/button/button.tsx',
        'tools/figma-parity/src/motion-compare.test.ts',
      ]),
    ).toEqual([]);
  });
});
