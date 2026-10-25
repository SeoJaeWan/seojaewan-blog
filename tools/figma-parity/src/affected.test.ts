import { describe, expect, it } from 'vitest';

import {
  type AffectedInputs,
  changedAssetDataEntries,
  type FileChange,
  type PatternCode,
  selectAffected,
} from './affected.ts';

const BUTTON = `import { Asset } from '../asset/asset';
export function Button() {
  return <button className="rounded-control bg-accent-fill-default hover:bg-accent-fill-secondary p-12"><Asset name="icons/ic_fluent_add_20_regular.svg" /></button>;
}`;
const MENU_ITEM = `import { Asset } from '../asset/asset';
export function MenuItem() {
  return <span className="text-text-fill-primary type-body"><Asset name="icons/ic_fluent_open_20_regular.svg" /></span>;
}`;
const FLYOUT = `export function Flyout() { return <div className="material-acrylic-default rounded-overlay" />; }`;
const ASSET = `export function Asset() { return <svg />; }`;
const FOLDER_STORY = `import { ContextMenu } from './context-menu';
export default { title: 'Patterns/Menu/Folder' };
const items = [{ label: '삭제', icon: 'icons/ic_fluent_delete_20_regular.svg' }];`;

const TOKENS_BEFORE = `@theme static {
  --accent-fill-default: var(--color-blue-600);
  --accent-fill-secondary: var(--color-blue-500);
  --text-fill-primary: var(--color-gray-1000);
  --radius-control: 4px;
  --spacing-12: 12px;
}
:root {
  --color-blue-600: #005fb8;
  --color-blue-500: #1a6fbf;
  --color-gray-1000: #1b1b1b;
}
@utility bg-accent-fill-* {
  background-color: --value(--accent-fill-*);
}
@utility text-text-fill-* {
  color: --value(--text-fill-*);
}
@utility type-body {
  font-size: var(--font-size-body);
}`;

const folderPattern: PatternCode = {
  files: new Set([
    'apps/web/src/features/desktop/menu-folder.stories.tsx',
    'apps/web/src/features/desktop/context-menu.tsx',
  ]),
  sources: [FOLDER_STORY],
  components: new Set(['menu-item', 'flyout']),
};

/**
 * 테스트용 입력을 만든다.
 * @param changedFiles 바뀐 파일
 * @param changes 파일 → 기준 커밋과 지금 내용
 * @returns 범위 계산 입력
 */
function inputs(changedFiles: string[], changes: Record<string, FileChange> = {}): AffectedInputs {
  return {
    changedFiles,
    componentSources: new Map([
      ['button', [BUTTON]],
      ['menu-item', [MENU_ITEM]],
      ['flyout', [FLYOUT]],
      ['asset', [ASSET]],
    ]),
    patterns: new Map([['Menu/Folder', folderPattern]]),
    patternAreas: new Map([['Menu/Folder', 'menu']]),
    readChange: (file) => changes[file] ?? { before: undefined, after: undefined },
  };
}

/**
 * 범위를 정렬한 목록으로 바꾼다.
 * @param changedFiles 바뀐 파일
 * @param changes 파일 → 기준 커밋과 지금 내용
 * @returns 컴포넌트와 조립, 또는 전체 이유
 */
function scope(
  changedFiles: string[],
  changes: Record<string, FileChange> = {},
): { components: string[]; patterns: string[] } | string {
  const selection = selectAffected(inputs(changedFiles, changes));
  return selection.all
    ? selection.reason
    : { components: [...selection.components].sort(), patterns: [...selection.patterns].sort() };
}

// @codocs [[피그마 연동:캡처 범위]]
describe('캡처 범위', () => {
  it('문서와 테스트만 바뀌면 범위가 없다', () => {
    expect(
      scope([
        '.codocs/development/figma-sync.yaml',
        'packages/design-system/src/components/button/button.test.tsx',
      ]),
    ).toEqual({ components: [], patterns: [] });
  });

  it('공개 진입점(src/index.ts)만 바뀌면 범위가 없다', () => {
    expect(scope(['packages/design-system/src/index.ts'])).toEqual({
      components: [],
      patterns: [],
    });
  });

  it('컴포넌트 코드가 바뀌면 그 컴포넌트, 그것을 담는 컴포넌트, 그것을 쓰는 조립이다', () => {
    expect(scope(['packages/design-system/src/components/asset/asset.tsx'])).toEqual({
      components: ['asset', 'button', 'menu-item'],
      patterns: ['Menu/Folder'],
    });
  });

  it('피그마 컴포넌트 그림이 바뀌면 그 컴포넌트와 그것을 담는 컴포넌트다', () => {
    expect(scope(['packages/design-system/figma/components/flyout/material=solid.png'])).toEqual({
      components: ['flyout'],
      patterns: [],
    });
  });

  it('조립 그림이 바뀌면 그 영역의 조립이다', () => {
    expect(scope(['apps/web/figma/patterns/menu/folder/default.png'])).toEqual({
      components: [],
      patterns: ['Menu/Folder'],
    });
  });

  it('조립 스토리와 그 스토리가 import하는 앱 파일이 바뀌면 그 조립이다', () => {
    expect(scope(['apps/web/src/features/desktop/context-menu.tsx'])).toEqual({
      components: [],
      patterns: ['Menu/Folder'],
    });
    expect(scope(['apps/web/src/app/page.tsx'])).toEqual({ components: [], patterns: [] });
  });

  it('자산이 바뀌면 코드에서 자산 이름으로 찾은 컴포넌트와 조립이다', () => {
    expect(
      scope(['packages/design-system/figma/assets/icons/ic_fluent_delete_20_regular.svg']),
    ).toEqual({
      components: [],
      patterns: ['Menu/Folder'],
    });
    expect(
      scope(['packages/design-system/src/assets/asset-data.ts'], {
        'packages/design-system/src/assets/asset-data.ts': {
          before:
            "export const svgAssets = {\n  'icons/ic_fluent_open_20_regular.svg': {\n    a: 1,\n  },\n};",
          after:
            "export const svgAssets = {\n  'icons/ic_fluent_open_20_regular.svg': {\n    a: 2,\n  },\n};",
        },
      }),
    ).toEqual({ components: ['menu-item'], patterns: ['Menu/Folder'] });
  });

  it('토큰이 바뀌면 별칭을 따라가 바뀐 토큰의 클래스를 쓰는 컴포넌트와 조립이다', () => {
    const tokensCss = 'packages/design-system/src/tokens.css';
    expect(
      scope(['packages/design-system/figma/tokens.json', tokensCss], {
        [tokensCss]: {
          before: TOKENS_BEFORE,
          after: TOKENS_BEFORE.replace('--color-gray-1000: #1b1b1b', '--color-gray-1000: #000000'),
        },
      }),
    ).toEqual({ components: ['menu-item'], patterns: ['Menu/Folder'] });
    expect(
      scope([tokensCss], {
        [tokensCss]: {
          before: TOKENS_BEFORE,
          after: TOKENS_BEFORE.replace('--radius-control: 4px', '--radius-control: 5px'),
        },
      }),
    ).toEqual({ components: ['button'], patterns: [] });
  });

  it('바뀐 토큰을 정하지 못하면 전체다', () => {
    const tokensCss = 'packages/design-system/src/tokens.css';
    expect(
      scope([tokensCss], {
        [tokensCss]: { before: TOKENS_BEFORE, after: `@import 'x';\n${TOKENS_BEFORE}` },
      }),
    ).toBe(`${tokensCss}(바뀐 토큰을 정하지 못함)`);
  });

  it('모션 CSS, 모션 스토리, 피그마 모션 자료만 바뀌면 범위가 없다', () => {
    const motionStory = "export default { title: 'Motion/ProgressRing' };";
    const empty = { components: [], patterns: [] };
    expect(scope(['packages/design-system/src/motion.css'])).toEqual(empty);
    expect(scope(['packages/design-system/figma/motions/motion-progress-ring.json'])).toEqual(
      empty,
    );
    // 컴포넌트 폴더 안이든 밖이든 제목이 Motion/이면 범위가 없다
    for (const file of [
      'packages/design-system/src/motion/progress-ring.stories.tsx',
      'packages/design-system/src/components/progress-ring/progress-ring-motion.stories.tsx',
    ]) {
      expect(scope([file], { [file]: { before: undefined, after: motionStory } }), file).toEqual(
        empty,
      );
    }
    // 지운 모션 스토리는 기준 커밋 내용으로 알아본다
    const removed = 'packages/design-system/src/motion/removed.stories.tsx';
    expect(scope([removed], { [removed]: { before: motionStory, after: undefined } })).toEqual(
      empty,
    );
  });

  it('모션 스토리가 아닌 스토리는 원래 규칙을 따른다', () => {
    const story = 'packages/design-system/src/components/button/button.stories.tsx';
    const other = "export default { title: 'Button' };";
    expect(scope([story], { [story]: { before: undefined, after: other } })).toEqual({
      components: ['button'],
      patterns: [],
    });
    const outside = 'packages/design-system/src/misc/misc.stories.tsx';
    const misc = "export default { title: 'Misc' };";
    expect(typeof scope([outside], { [outside]: { before: undefined, after: misc } })).toBe(
      'string',
    );
  });

  it('전역 스타일·설정, 컴포넌트 폴더 밖의 디자인 시스템 소스, 캡처 도구가 바뀌면 전체다', () => {
    for (const file of [
      'packages/design-system/figma/figma.json',
      'packages/design-system/src/theme.css',
      'packages/design-system/src/cn.ts',
      'packages/design-system/.storybook/preview.ts',
      'apps/web/.storybook/preview.css',
      'pnpm-lock.yaml',
      'tools/figma-parity/src/capture.ts',
      '.github/workflows/figma-parity.yml',
    ]) {
      expect(typeof scope([file]), file).toBe('string');
    }
  });
});

// @codocs [[피그마 연동:캡처 범위]]
describe('자산 데이터 변경', () => {
  it('항목 밖이 바뀌면 정하지 못한다', () => {
    expect(changedAssetDataEntries('type A = 1;\n', 'type A = 2;\n')).toBeUndefined();
  });
});
